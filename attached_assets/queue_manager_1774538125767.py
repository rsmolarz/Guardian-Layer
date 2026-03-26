import redis
from rq import Queue
from rq_scheduler import Scheduler
from config import settings
import logging

logger = logging.getLogger(__name__)

# Redis connection
try:
    redis_conn = redis.from_url(settings.REDIS_URL, decode_responses=False)
    redis_conn.ping()
    logger.info("Redis connected at %s", settings.REDIS_URL)
except Exception as e:
    logger.warning("Redis not available (%s). Background tasks will be disabled.", e)
    redis_conn = None

# RQ Queues
deploy_queue = Queue("deploy", connection=redis_conn) if redis_conn else None
backup_queue = Queue("backup", connection=redis_conn) if redis_conn else None
agent_queue = Queue("agents", connection=redis_conn) if redis_conn else None
default_queue = Queue("default", connection=redis_conn) if redis_conn else None

# RQ Scheduler (for cron-style jobs)
scheduler = Scheduler(connection=redis_conn) if redis_conn else None


def enqueue_job(queue: Queue, func, *args, job_timeout=600, **kwargs):
    """Enqueue a background job, with fallback logging if Redis is unavailable."""
    if queue is None:
        logger.error("Redis unavailable — cannot enqueue %s", func.__name__)
        return None
    job = queue.enqueue(func, *args, job_timeout=job_timeout, **kwargs)
    logger.info("Enqueued job %s → %s", func.__name__, job.id)
    return job
