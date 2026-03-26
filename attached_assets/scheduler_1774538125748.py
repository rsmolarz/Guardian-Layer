"""
Scheduler — uses APScheduler to register cron jobs for:
  • Backup policies (per-app schedules)
  • HealthCheck agent (every 5 min)
  • UpgradeAgent (weekly)
  • CodeGuardian (nightly)

Runs in the same process as the FastAPI app (background thread).
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="UTC")


def start_scheduler():
    """Start the background scheduler with default jobs."""
    if _scheduler.running:
        return

    # Health checks every 5 minutes
    _scheduler.add_job(
        _run_health_checks,
        trigger=CronTrigger(minute="*/5"),
        id="health_check_all",
        replace_existing=True,
        misfire_grace_time=60,
    )

    # Nightly CodeGuardian scan (2 AM UTC)
    _scheduler.add_job(
        _run_code_guardian_all,
        trigger=CronTrigger(hour=2, minute=0),
        id="code_guardian_nightly",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # Weekly Upgrade Agent (Sundays 3 AM UTC)
    _scheduler.add_job(
        _run_upgrade_agent_all,
        trigger=CronTrigger(day_of_week="sun", hour=3, minute=0),
        id="upgrade_agent_weekly",
        replace_existing=True,
        misfire_grace_time=600,
    )

    # Backup scheduler (dynamic — reloaded from DB every hour)
    _scheduler.add_job(
        _reload_backup_schedules,
        trigger=CronTrigger(minute=0),   # top of every hour
        id="reload_backup_schedules",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("APScheduler started with default jobs.")
    _reload_backup_schedules()


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")


# ─── Job Functions ────────────────────────────────────────────────────────────

def _run_health_checks():
    from queue_manager import enqueue_job, agent_queue
    from agents import health_check_all_apps
    enqueue_job(agent_queue, health_check_all_apps, job_timeout=120)


def _run_code_guardian_all():
    from sqlmodel import Session, select
    from database import engine
    from models import App
    from queue_manager import enqueue_job, agent_queue
    from agents import code_guardian_scan

    with Session(engine) as session:
        apps = session.exec(select(App)).all()
    for app in apps:
        enqueue_job(agent_queue, code_guardian_scan, app.id, job_timeout=120)


def _run_upgrade_agent_all():
    from sqlmodel import Session, select
    from database import engine
    from models import App
    from queue_manager import enqueue_job, agent_queue
    from agents import upgrade_agent_run

    with Session(engine) as session:
        apps = session.exec(select(App)).all()
    for app in apps:
        enqueue_job(agent_queue, upgrade_agent_run, app.id, job_timeout=180)


def _reload_backup_schedules():
    """
    Read BackupPolicy table and register/update individual backup jobs.
    Each policy gets its own APScheduler job keyed by policy ID.
    """
    from sqlmodel import Session, select
    from database import engine
    from models import BackupPolicy

    try:
        with Session(engine) as session:
            policies = session.exec(select(BackupPolicy).where(BackupPolicy.enabled == True)).all()

        for policy in policies:
            job_id = f"backup_policy_{policy.id}"
            try:
                trigger = CronTrigger.from_crontab(policy.schedule, timezone="UTC")
                _scheduler.add_job(
                    _run_backup_for_policy,
                    trigger=trigger,
                    args=[policy.id],
                    id=job_id,
                    replace_existing=True,
                    misfire_grace_time=600,
                )
                logger.debug("Registered backup job %s: %s", job_id, policy.schedule)
            except Exception as e:
                logger.error("Failed to schedule backup policy %d: %s", policy.id, e)
    except Exception as e:
        logger.error("Error reloading backup schedules: %s", e)


def _run_backup_for_policy(policy_id: int):
    from sqlmodel import Session
    from database import engine
    from models import BackupPolicy, BackupRecord, BackupStatus
    from queue_manager import enqueue_job, backup_queue
    from backup_engine import run_backup

    with Session(engine) as session:
        policy = session.get(BackupPolicy, policy_id)
        if not policy or not policy.enabled:
            return
        record = BackupRecord(
            app_id=policy.app_id,
            policy_id=policy.id,
            backup_type=policy.backup_type,
            status=BackupStatus.pending,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        record_id = record.id

    enqueue_job(backup_queue, run_backup, record_id, job_timeout=900)
