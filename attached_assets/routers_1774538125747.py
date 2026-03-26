"""
API Routers for GuardianLayer — all routes in one file for Replit simplicity.
Split into sub-routers with APIRouter and mounted in main.py.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from database import get_session
from models import (
    App, AppCreate, AppRead, AppUpdate,
    AgentDefinition, AgentDefinitionCreate, AgentDefinitionRead,
    BackupPolicy, BackupPolicyCreate, BackupPolicyRead, BackupRecord, BackupStatus,
    DeploymentRecord, DeployStatus, DeploymentRead,
    IncidentLog, IncidentLogRead,
    APIToken,
)
from auth import get_current_token, require_operator, require_admin, create_api_token
from queue_manager import enqueue_job, deploy_queue, backup_queue, agent_queue


# ═══════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════

auth_router = APIRouter(prefix="/auth", tags=["Auth"])


@auth_router.post("/tokens", summary="Create API token (admin only)")
def create_token(name: str, role: str = "operator",
                 session: Session = Depends(get_session),
                 _: APIToken = Depends(require_admin)):
    raw = create_api_token(name, role, session)
    return {"token": raw, "note": "Store this token — it will not be shown again."}


@auth_router.get("/tokens", summary="List tokens (admin only)")
def list_tokens(session: Session = Depends(get_session),
                _: APIToken = Depends(require_admin)):
    tokens = session.exec(select(APIToken).where(APIToken.revoked == False)).all()
    return [{"id": t.id, "name": t.name, "role": t.role,
             "last_used_at": t.last_used_at, "created_at": t.created_at}
            for t in tokens]


@auth_router.delete("/tokens/{token_id}", summary="Revoke a token (admin)")
def revoke_token(token_id: int, session: Session = Depends(get_session),
                 _: APIToken = Depends(require_admin)):
    t = session.get(APIToken, token_id)
    if not t:
        raise HTTPException(404, "Token not found")
    t.revoked = True
    session.add(t)
    session.commit()
    return {"revoked": token_id}


# ═══════════════════════════════════════════════════════════════════
# Apps Router
# ═══════════════════════════════════════════════════════════════════

apps_router = APIRouter(prefix="/apps", tags=["Apps"])


@apps_router.get("", response_model=List[AppRead])
def list_apps(session: Session = Depends(get_session),
              _: APIToken = Depends(get_current_token)):
    return session.exec(select(App)).all()


@apps_router.post("", response_model=AppRead, status_code=201)
def create_app(app_in: AppCreate,
               session: Session = Depends(get_session),
               _: APIToken = Depends(require_operator)):
    db_app = App.model_validate(app_in)
    session.add(db_app)
    session.commit()
    session.refresh(db_app)
    return db_app


@apps_router.get("/{app_id}", response_model=AppRead)
def get_app(app_id: int, session: Session = Depends(get_session),
            _: APIToken = Depends(get_current_token)):
    app = session.get(App, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    return app


@apps_router.put("/{app_id}", response_model=AppRead)
def update_app(app_id: int, app_update: AppUpdate,
               session: Session = Depends(get_session),
               _: APIToken = Depends(require_operator)):
    app = session.get(App, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    for field, value in app_update.model_dump(exclude_unset=True).items():
        setattr(app, field, value)
    app.updated_at = datetime.utcnow()
    session.add(app)
    session.commit()
    session.refresh(app)
    return app


@apps_router.delete("/{app_id}", status_code=204)
def delete_app(app_id: int, session: Session = Depends(get_session),
               _: APIToken = Depends(require_admin)):
    app = session.get(App, app_id)
    if not app:
        raise HTTPException(404, "App not found")
    session.delete(app)
    session.commit()


# ═══════════════════════════════════════════════════════════════════
# Deployments Router
# ═══════════════════════════════════════════════════════════════════

deploy_router = APIRouter(prefix="/apps", tags=["Deployments"])


class DeployRequest:
    def __init__(self, version: str = "latest", image_tag: Optional[str] = None,
                 triggered_by: str = "api"):
        self.version = version
        self.image_tag = image_tag
        self.triggered_by = triggered_by


from pydantic import BaseModel

class DeployPayload(BaseModel):
    version: str = "latest"
    image_tag: Optional[str] = None
    triggered_by: str = "api"


@deploy_router.post("/{app_id}/deploy", summary="Trigger deployment")
def trigger_deploy(app_id: int, payload: DeployPayload,
                   session: Session = Depends(get_session),
                   _: APIToken = Depends(require_operator)):
    app = session.get(App, app_id)
    if not app:
        raise HTTPException(404, "App not found")

    from deploy_engine import run_deployment

    image_tag = payload.image_tag or f"{app.image_name}:{payload.version}"
    record = DeploymentRecord(
        app_id=app_id,
        version=payload.version,
        image_tag=image_tag,
        status=DeployStatus.pending,
        triggered_by=payload.triggered_by,
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    job = enqueue_job(deploy_queue, run_deployment, record.id, job_timeout=300)
    return {
        "deployment_id": record.id,
        "job_id": job.id if job else None,
        "message": "Deployment queued",
    }


@deploy_router.get("/{app_id}/deployments", response_model=List[DeploymentRead])
def list_deployments(app_id: int, limit: int = 20,
                     session: Session = Depends(get_session),
                     _: APIToken = Depends(get_current_token)):
    stmt = (select(DeploymentRecord)
            .where(DeploymentRecord.app_id == app_id)
            .order_by(DeploymentRecord.deployed_at.desc())
            .limit(limit))
    return session.exec(stmt).all()


@deploy_router.post("/{app_id}/rollback", summary="Manual rollback to last good deploy")
def rollback_app(app_id: int, session: Session = Depends(get_session),
                 _: APIToken = Depends(require_operator)):
    from deploy_engine import run_deployment

    stmt = (select(DeploymentRecord)
            .where(DeploymentRecord.app_id == app_id,
                   DeploymentRecord.status == DeployStatus.success)
            .order_by(DeploymentRecord.deployed_at.desc()))
    last_good = session.exec(stmt).first()
    if not last_good:
        raise HTTPException(404, "No successful deployment found to roll back to")

    record = DeploymentRecord(
        app_id=app_id,
        version=last_good.version,
        image_tag=last_good.image_tag,
        status=DeployStatus.pending,
        triggered_by="manual_rollback",
        rollback_of=None,
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    job = enqueue_job(deploy_queue, run_deployment, record.id, job_timeout=300)
    return {"rollback_deployment_id": record.id, "rolling_back_to": last_good.version}


# ═══════════════════════════════════════════════════════════════════
# Backups Router
# ═══════════════════════════════════════════════════════════════════

backup_router = APIRouter(prefix="/apps", tags=["Backups"])


@backup_router.post("/{app_id}/backup", summary="Trigger manual backup")
def trigger_backup(app_id: int, session: Session = Depends(get_session),
                   _: APIToken = Depends(require_operator)):
    app = session.get(App, app_id)
    if not app:
        raise HTTPException(404, "App not found")

    from backup_engine import run_backup
    from models import BackupType

    record = BackupRecord(
        app_id=app_id,
        backup_type=BackupType.full,
        status=BackupStatus.pending,
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    job = enqueue_job(backup_queue, run_backup, record.id, job_timeout=900)
    return {"backup_id": record.id, "job_id": job.id if job else None}


@backup_router.get("/{app_id}/backups", summary="List backup history")
def list_backups(app_id: int, limit: int = 20,
                 session: Session = Depends(get_session),
                 _: APIToken = Depends(get_current_token)):
    stmt = (select(BackupRecord)
            .where(BackupRecord.app_id == app_id)
            .order_by(BackupRecord.started_at.desc())
            .limit(limit))
    return session.exec(stmt).all()


@backup_router.post("/{app_id}/restore/{backup_id}", summary="Restore from backup")
def trigger_restore(app_id: int, backup_id: int,
                    session: Session = Depends(get_session),
                    _: APIToken = Depends(require_admin)):
    from backup_engine import run_restore
    job = enqueue_job(backup_queue, run_restore, app_id, backup_id, job_timeout=1200)
    return {"message": "Restore queued", "job_id": job.id if job else None}


@backup_router.post("/{app_id}/backup-policy", response_model=BackupPolicyRead, status_code=201)
def create_backup_policy(app_id: int, policy_in: BackupPolicyCreate,
                         session: Session = Depends(get_session),
                         _: APIToken = Depends(require_operator)):
    if policy_in.app_id != app_id:
        raise HTTPException(400, "app_id mismatch")
    policy = BackupPolicy.model_validate(policy_in)
    session.add(policy)
    session.commit()
    session.refresh(policy)
    # Reload scheduler
    from scheduler import _reload_backup_schedules
    _reload_backup_schedules()
    return policy


# ═══════════════════════════════════════════════════════════════════
# Agents Router
# ═══════════════════════════════════════════════════════════════════

agents_router = APIRouter(prefix="/agents", tags=["Agents"])


@agents_router.get("", response_model=List[AgentDefinitionRead])
def list_agents(session: Session = Depends(get_session),
                _: APIToken = Depends(get_current_token)):
    return session.exec(select(AgentDefinition)).all()


@agents_router.post("", response_model=AgentDefinitionRead, status_code=201)
def create_agent(agent_in: AgentDefinitionCreate,
                 session: Session = Depends(get_session),
                 _: APIToken = Depends(require_admin)):
    agent = AgentDefinition.model_validate(agent_in)
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


@agents_router.post("/{agent_name}/run/{app_id}", summary="Manually trigger an agent for an app")
def run_agent(agent_name: str, app_id: int,
              session: Session = Depends(get_session),
              _: APIToken = Depends(require_operator)):
    from agents import (health_check_all_apps, code_guardian_scan,
                        upgrade_agent_run, database_agent_check)

    dispatch = {
        "health_check": (health_check_all_apps, [], agent_queue, 120),
        "code_guardian": (code_guardian_scan, [app_id], agent_queue, 120),
        "upgrade": (upgrade_agent_run, [app_id], agent_queue, 180),
        "database": (database_agent_check, [app_id], agent_queue, 60),
    }
    if agent_name not in dispatch:
        raise HTTPException(400, f"Unknown agent '{agent_name}'. Options: {list(dispatch)}")

    func, args, queue, timeout = dispatch[agent_name]
    job = enqueue_job(queue, func, *args, job_timeout=timeout)
    return {"agent": agent_name, "app_id": app_id, "job_id": job.id if job else None}


# ═══════════════════════════════════════════════════════════════════
# Incidents / Alerts Router
# ═══════════════════════════════════════════════════════════════════

alerts_router = APIRouter(prefix="/incidents", tags=["Incidents"])


@alerts_router.get("", response_model=List[IncidentLogRead])
def list_incidents(app_id: Optional[int] = None, level: Optional[str] = None,
                   limit: int = 50, resolved: bool = False,
                   session: Session = Depends(get_session),
                   _: APIToken = Depends(get_current_token)):
    stmt = select(IncidentLog).where(IncidentLog.resolved == resolved)
    if app_id:
        stmt = stmt.where(IncidentLog.app_id == app_id)
    if level:
        stmt = stmt.where(IncidentLog.level == level)
    stmt = stmt.order_by(IncidentLog.timestamp.desc()).limit(limit)
    return session.exec(stmt).all()


@alerts_router.patch("/{incident_id}/resolve")
def resolve_incident(incident_id: int, session: Session = Depends(get_session),
                     _: APIToken = Depends(require_operator)):
    inc = session.get(IncidentLog, incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    inc.resolved = True
    inc.resolved_at = datetime.utcnow()
    session.add(inc)
    session.commit()
    return {"resolved": incident_id}


# ═══════════════════════════════════════════════════════════════════
# GitHub Webhook Router
# ═══════════════════════════════════════════════════════════════════

webhook_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@webhook_router.post("/github/{app_id}", summary="GitHub push webhook → auto-deploy")
async def github_webhook(app_id: int, request_body: dict,
                         session: Session = Depends(get_session)):
    """
    Receives GitHub push events and triggers a deployment.
    Set this URL as a GitHub webhook: POST /api/v1/webhooks/github/{app_id}
    Verify the signature with GITHUB_WEBHOOK_SECRET in production.
    """
    import hmac, hashlib
    from config import settings

    ref = request_body.get("ref", "")
    if "main" not in ref and "master" not in ref:
        return {"skipped": f"Push to {ref} — only main/master triggers deploy"}

    head_commit = request_body.get("head_commit", {})
    sha = head_commit.get("id", "unknown")[:8]

    app = session.get(App, app_id)
    if not app:
        raise HTTPException(404, "App not found")

    from deploy_engine import run_deployment
    record = DeploymentRecord(
        app_id=app_id,
        version=sha,
        image_tag=f"{app.image_name}:{sha}",
        status=DeployStatus.pending,
        triggered_by="github_webhook",
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    enqueue_job(deploy_queue, run_deployment, record.id, job_timeout=300)
    return {"queued": True, "deployment_id": record.id, "version": sha}
