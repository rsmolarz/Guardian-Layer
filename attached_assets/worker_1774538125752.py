#!/usr/bin/env python3
"""
GuardianLayer RQ Worker
-----------------------
Run this in a separate Replit tab/process to process background jobs:

    python worker.py

Or in a Replit background process via .replit:
    [processes.worker]
    command = "python worker.py"
"""
import logging
import sys
from rq import Worker
from queue_manager import redis_conn, deploy_queue, backup_queue, agent_queue, default_queue

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("rq-worker")

if __name__ == "__main__":
    if redis_conn is None:
        logger.error("Redis is not available. Worker cannot start.")
        sys.exit(1)

    queues = [deploy_queue, backup_queue, agent_queue, default_queue]
    queue_names = [q.name for q in queues]
    logger.info("Starting RQ worker for queues: %s", queue_names)

    worker = Worker(queues, connection=redis_conn)
    worker.work(with_scheduler=True, burst=False)
