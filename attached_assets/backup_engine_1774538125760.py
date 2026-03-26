"""
Backup Engine — runs as an RQ background task.
Performs pg_dump (or file archive) via SSH and uploads to S3/R2.
"""
import logging
import hashlib
from datetime import datetime
from sqlmodel import Session
from database import engine
from models import App, BackupRecord, BackupPolicy, BackupStatus, BackupType, IncidentLog, IncidentLevel
from ssh_helper import ssh_run
from notifications import alert
from config import settings
import boto3
from botocore.config import Config

logger = logging.getLogger(__name__)


def _s3_client():
    kwargs = dict(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
        config=Config(signature_version="s3v4"),
    )
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
    return boto3.client("s3", **kwargs)


def run_backup(backup_record_id: int) -> dict:
    """
    Perform a database backup for the given BackupRecord ID.
    1. SSH to VPS, run pg_dump inside the app container
    2. SCP the dump file or stream it up
    3. Upload to S3/R2
    4. Update records
    """
    with Session(engine) as session:
        record = session.get(BackupRecord, backup_record_id)
        if not record:
            return {"success": False, "error": "BackupRecord not found"}

        app = session.get(App, record.app_id)
        if not app:
            return {"success": False, "error": "App not found"}

        record.status = BackupStatus.running
        session.add(record)
        session.commit()

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{app.name}_{timestamp}.sql.gz"
        remote_path = f"/tmp/{filename}"

        # SSH: dump the DB inside the running container, compress, save to /tmp
        dump_cmd = (
            f"docker exec {app.container_name} "
            f"sh -c 'pg_dump $DATABASE_URL | gzip' > {remote_path}"
        )

        success, output = ssh_run(
            host=app.vps_host,
            commands=[dump_cmd],
            port=app.vps_port,
        )

        if not success:
            _fail_backup(session, record, app, output)
            return {"success": False, "error": output}

        # Get file size from remote
        ok, size_out = ssh_run(app.vps_host, [f"stat -c%s {remote_path}"], port=app.vps_port)
        try:
            size_bytes = int(size_out.strip().split()[-1]) if ok else None
        except Exception:
            size_bytes = None

        # Upload to S3/R2 using streaming via SSH cat
        if not settings.BACKUP_BUCKET:
            logger.warning("BACKUP_BUCKET not set — skipping upload.")
            storage_key = None
        else:
            storage_key = _upload_via_ssh(app, filename, remote_path)

        # Cleanup remote temp file
        ssh_run(app.vps_host, [f"rm -f {remote_path}"], port=app.vps_port)

        # Update record
        record.status = BackupStatus.success
        record.completed_at = datetime.utcnow()
        record.storage_key = storage_key
        record.size_bytes = size_bytes
        record.log = output[:2000]
        session.add(record)

        # Update policy last_backup
        if record.policy_id:
            policy = session.get(BackupPolicy, record.policy_id)
            if policy:
                policy.last_backup_at = datetime.utcnow()
                policy.last_backup_status = BackupStatus.success
                session.add(policy)

        session.add(IncidentLog(
            app_id=app.id,
            level=IncidentLevel.info,
            category="backup",
            message=f"Backup succeeded for {app.name}: {filename} ({size_bytes} bytes)",
        ))
        session.commit()

        alert(
            f"💾 Backup <b>{app.name}</b> complete\nFile: <code>{filename}</code>\n"
            f"Size: {_fmt_size(size_bytes)}\nKey: <code>{storage_key}</code>",
            level="info",
        )
        return {"success": True, "storage_key": storage_key, "size_bytes": size_bytes}


def _upload_via_ssh(app: App, filename: str, remote_path: str) -> str | None:
    """
    Download backup from VPS and pipe to S3/R2.
    Uses a secondary SSH connection to stream the file.
    """
    import paramiko, io, base64
    from config import settings as cfg

    if not cfg.AWS_ACCESS_KEY_ID:
        logger.warning("S3 credentials not set — skipping upload.")
        return None

    bucket = cfg.BACKUP_BUCKET
    prefix = f"backups/{app.name}"
    key = f"{prefix}/{filename}"

    try:
        import paramiko
        from ssh_helper import _get_private_key

        if "@" in app.vps_host:
            user, hostname = app.vps_host.split("@", 1)
        else:
            user, hostname = "root", app.vps_host

        pkey = _get_private_key()
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=app.vps_port, username=user, pkey=pkey, timeout=60)

        sftp = client.open_sftp()
        with sftp.open(remote_path, "rb") as f:
            data = f.read()
        sftp.close()
        client.close()

        s3 = _s3_client()
        s3.put_object(Bucket=bucket, Key=key, Body=data)
        logger.info("Uploaded %s to s3://%s/%s", filename, bucket, key)
        return key
    except Exception as e:
        logger.error("S3 upload failed: %s", e)
        return None


def run_restore(app_id: int, backup_record_id: int) -> dict:
    """Restore a database from a stored backup."""
    with Session(engine) as session:
        backup = session.get(BackupRecord, backup_record_id)
        app = session.get(App, app_id)
        if not backup or not app:
            return {"success": False, "error": "Record not found"}

        if not backup.storage_key or not settings.BACKUP_BUCKET:
            return {"success": False, "error": "No storage key or bucket configured"}

        # Download from S3
        s3 = _s3_client()
        local_tmp = f"/tmp/restore_{backup.id}.sql.gz"
        try:
            s3.download_file(settings.BACKUP_BUCKET, backup.storage_key, local_tmp)
        except Exception as e:
            return {"success": False, "error": f"Download failed: {e}"}

        # SCP to VPS and restore
        # This is simplified — in production use sftp.put() then run restore cmd
        restore_cmds = [
            f"cat {local_tmp} | docker exec -i {app.container_name} sh -c 'gunzip | psql $DATABASE_URL'",
        ]
        success, output = ssh_run(app.vps_host, restore_cmds, port=app.vps_port)

        session.add(IncidentLog(
            app_id=app.id,
            level=IncidentLevel.info if success else IncidentLevel.error,
            category="backup",
            message=f"Restore {'succeeded' if success else 'FAILED'} for {app.name} from {backup.storage_key}",
        ))
        session.commit()

        alert(
            f"{'✅ Restore complete' if success else '❌ Restore FAILED'} for <b>{app.name}</b>\n"
            f"Source: <code>{backup.storage_key}</code>",
            level="info" if success else "error",
        )
        return {"success": success, "output": output}


def _fail_backup(session: Session, record: BackupRecord, app: App, output: str):
    record.status = BackupStatus.failed
    record.completed_at = datetime.utcnow()
    record.log = output[:2000]
    session.add(record)
    session.add(IncidentLog(
        app_id=app.id,
        level=IncidentLevel.error,
        category="backup",
        message=f"Backup FAILED for {app.name}: {output[:300]}",
    ))
    session.commit()
    alert(f"❌ Backup FAILED for <b>{app.name}</b>\n<pre>{output[:500]}</pre>", level="error")


def _fmt_size(b: int | None) -> str:
    if b is None:
        return "unknown"
    for unit in ["B", "KB", "MB", "GB"]:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} TB"
