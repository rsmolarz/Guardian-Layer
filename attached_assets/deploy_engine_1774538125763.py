"""
Deployment Engine — runs as an RQ background task.
Called by the /deploy API endpoint.
"""
import logging
from datetime import datetime
from sqlmodel import Session, select
from database import engine
from models import App, DeploymentRecord, DeployStatus, AppStatus, IncidentLog, IncidentLevel
from ssh_helper import ssh_run
from notifications import alert

logger = logging.getLogger(__name__)


def run_deployment(deployment_id: int) -> dict:
    """
    Execute a deployment for the given DeploymentRecord ID.
    Pulls the Docker image on the VPS and restarts the container.
    """
    with Session(engine) as session:
        record = session.get(DeploymentRecord, deployment_id)
        if not record:
            return {"success": False, "error": "DeploymentRecord not found"}

        app = session.get(App, record.app_id)
        if not app:
            return {"success": False, "error": "App not found"}

        # Mark as running
        record.status = DeployStatus.running
        app.status = AppStatus.deploying
        session.add(record)
        session.add(app)
        session.commit()

        image_tag = record.image_tag or f"{app.image_name}:latest"
        container = app.container_name
        port_mapping = f"{app.exposed_port}:{app.exposed_port}"

        # Build ordered Docker commands
        commands = [
            f"docker pull {image_tag}",
            f"docker stop {container} || true",
            f"docker rm {container} || true",
            (
                f"docker run -d --name {container} "
                f"--restart unless-stopped "
                f"-p {port_mapping} "
                f"{image_tag}"
            ),
            f"docker ps --filter name={container} --format '{{{{.Status}}}}'",
        ]

        success, output = ssh_run(
            host=app.vps_host,
            commands=commands,
            port=app.vps_port,
        )

        # Update records
        record.status = DeployStatus.success if success else DeployStatus.failed
        record.completed_at = datetime.utcnow()
        record.log = output
        app.status = AppStatus.running if success else AppStatus.failed
        if success:
            app.current_version = record.version
            app.updated_at = datetime.utcnow()

        session.add(record)
        session.add(app)

        # Log incident
        level = IncidentLevel.info if success else IncidentLevel.error
        incident = IncidentLog(
            app_id=app.id,
            level=level,
            category="deploy",
            message=(
                f"Deployment {'succeeded' if success else 'FAILED'} for {app.name} "
                f"version={record.version} image={image_tag}"
            ),
        )
        session.add(incident)
        session.commit()

        # Notify
        if success:
            alert(
                f"✅ Deploy <b>{app.name}</b> ({app.environment})\n"
                f"Version: <code>{record.version}</code>\nImage: <code>{image_tag}</code>",
                level="info",
            )
        else:
            alert(
                f"❌ Deploy FAILED: <b>{app.name}</b>\n"
                f"Version: <code>{record.version}</code>\n<pre>{output[:500]}</pre>",
                level="error",
            )
            # Auto-trigger rollback
            _attempt_rollback(app.id, record.id, session)

        return {"success": success, "deployment_id": deployment_id, "log": output}


def _attempt_rollback(app_id: int, failed_deployment_id: int, session: Session) -> None:
    """Find the last successful deployment and redeploy it."""
    stmt = (
        select(DeploymentRecord)
        .where(
            DeploymentRecord.app_id == app_id,
            DeploymentRecord.status == DeployStatus.success,
            DeploymentRecord.id != failed_deployment_id,
        )
        .order_by(DeploymentRecord.deployed_at.desc())
    )
    last_good = session.exec(stmt).first()
    if not last_good:
        logger.warning("No previous successful deployment found for app_id=%d — skipping rollback.", app_id)
        alert(f"⚠️ Auto-rollback skipped for app_id={app_id}: no prior successful deployment.", level="warning")
        return

    # Create new rollback deployment record
    rollback = DeploymentRecord(
        app_id=app_id,
        version=last_good.version,
        image_tag=last_good.image_tag,
        status=DeployStatus.pending,
        triggered_by="auto_rollback",
        rollback_of=failed_deployment_id,
    )
    session.add(rollback)
    session.commit()
    session.refresh(rollback)

    alert(
        f"🔄 Auto-rollback triggered for app_id={app_id} → rolling back to version {last_good.version}",
        level="warning",
    )

    # Enqueue the rollback (late import to avoid circular)
    from queue_manager import enqueue_job, deploy_queue
    enqueue_job(deploy_queue, run_deployment, rollback.id)
