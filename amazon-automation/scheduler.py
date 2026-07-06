"""
Automation scheduler — runs all sync and alert jobs on a fixed schedule.

Jobs:
  - Every hour        : order sync (incremental)
  - Daily at 06:00 IST: inventory sync + low stock alert
  - Daily at 08:00 IST: daily sales summary email
  - Daily at 10:00 IST: review request automation
  - Daily at 11:00 IST: dynamic repricer run

Run:
    python scheduler.py
    (keep this process alive — use nohup, pm2, or a Windows service)
"""

import logging
import sys
from datetime import datetime

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("scheduler")

scheduler = BlockingScheduler(timezone="Asia/Kolkata")


# ── Job wrappers ───────────────────────────────────────────────────────────────

def job_sync_orders():
    logger.info("▶ order sync start")
    try:
        from orders.sync_orders import run_sync
        result = run_sync(full=False)
        logger.info("✔ order sync done — %s", result)
    except Exception as e:
        logger.error("✘ order sync failed: %s", e, exc_info=True)


def job_sync_inventory():
    logger.info("▶ inventory sync start")
    try:
        from inventory.sync_inventory import run_sync
        result = run_sync()
        logger.info("✔ inventory sync done — %s", result)
    except Exception as e:
        logger.error("✘ inventory sync failed: %s", e, exc_info=True)


def job_sync_titles():
    logger.info("▶ product title sync start")
    try:
        from inventory.sync_titles import run_sync
        result = run_sync(overwrite=False)   # only fills NULLs — fast after first run
        logger.info("✔ title sync done — %s", result)
    except Exception as e:
        logger.error("✘ title sync failed: %s", e, exc_info=True)


def job_low_stock_alert():
    logger.info("▶ low stock alert start")
    try:
        from inventory.low_stock_alert import run_alert
        result = run_alert()
        logger.info("✔ low stock alert done — %s", result)
    except Exception as e:
        logger.error("✘ low stock alert failed: %s", e, exc_info=True)


def job_daily_summary():
    logger.info("▶ daily summary email start")
    try:
        from reports.daily_summary import run_summary
        run_summary()
        logger.info("✔ daily summary sent")
    except Exception as e:
        logger.error("✘ daily summary failed: %s", e, exc_info=True)


def job_request_reviews():
    logger.info("▶ review request automation start")
    try:
        from orders.request_review import run_review_requests
        result = run_review_requests()
        logger.info("✔ review requests done — %s", result)
    except Exception as e:
        logger.error("✘ review requests failed: %s", e, exc_info=True)


def job_repricer():
    logger.info("▶ repricer run start")
    try:
        from pricing.repricer import run_repricer
        result = run_repricer()
        logger.info("✔ repricer done — %s", result)
    except Exception as e:
        logger.error("✘ repricer failed: %s", e, exc_info=True)


def job_sync_fees():
    logger.info("▶ fee estimates sync start")
    try:
        from fees.sync_fees import run_sync
        result = run_sync()
        logger.info("✔ fee sync done — %s", result)
    except Exception as e:
        logger.error("✘ fee sync failed: %s", e, exc_info=True)


def job_sync_finance():
    logger.info("▶ finance sync start")
    try:
        from finance.sync_finance import run_sync
        result = run_sync()
        logger.info("✔ finance sync done — %s", result)
    except Exception as e:
        logger.error("✘ finance sync failed: %s", e, exc_info=True)


# ── Schedule ───────────────────────────────────────────────────────────────────

# Orders: every hour
scheduler.add_job(
    job_sync_orders,
    IntervalTrigger(hours=1),
    id="sync_orders",
    name="Hourly order sync",
    max_instances=1,
    misfire_grace_time=300,
)

# Inventory sync + title sync + low stock: 6:00 AM IST daily
scheduler.add_job(
    job_sync_inventory,
    CronTrigger(hour=6, minute=0, timezone="Asia/Kolkata"),
    id="sync_inventory",
    name="Daily inventory sync",
    max_instances=1,
    misfire_grace_time=600,
)
scheduler.add_job(
    job_sync_titles,
    CronTrigger(hour=6, minute=10, timezone="Asia/Kolkata"),
    id="sync_titles",
    name="Product title sync",
    max_instances=1,
    misfire_grace_time=600,
)
scheduler.add_job(
    job_low_stock_alert,
    CronTrigger(hour=6, minute=15, timezone="Asia/Kolkata"),
    id="low_stock_alert",
    name="Daily low stock alert",
    max_instances=1,
    misfire_grace_time=600,
)

# Daily summary: 8:00 AM IST
scheduler.add_job(
    job_daily_summary,
    CronTrigger(hour=8, minute=0, timezone="Asia/Kolkata"),
    id="daily_summary",
    name="Daily sales email",
    max_instances=1,
    misfire_grace_time=600,
)

# Review requests: 10:00 AM IST
scheduler.add_job(
    job_request_reviews,
    CronTrigger(hour=10, minute=0, timezone="Asia/Kolkata"),
    id="request_reviews",
    name="Review request automation",
    max_instances=1,
    misfire_grace_time=600,
)

# Repricer: 11:00 AM IST
scheduler.add_job(
    job_repricer,
    CronTrigger(hour=11, minute=0, timezone="Asia/Kolkata"),
    id="repricer",
    name="Dynamic repricer",
    max_instances=1,
    misfire_grace_time=600,
)

# Fee estimates: 6:30 AM IST (after inventory sync, before finance)
scheduler.add_job(
    job_sync_fees,
    CronTrigger(hour=6, minute=30, timezone="Asia/Kolkata"),
    id="sync_fees",
    name="Fee estimates sync",
    max_instances=1,
    misfire_grace_time=600,
)

# Finance sync: 7:00 AM IST (between inventory and daily summary)
scheduler.add_job(
    job_sync_finance,
    CronTrigger(hour=7, minute=0, timezone="Asia/Kolkata"),
    id="sync_finance",
    name="Finance & settlements sync",
    max_instances=1,
    misfire_grace_time=600,
)


if __name__ == "__main__":
    logger.info("Scheduler starting. Jobs:")
    for job in scheduler.get_jobs():
        logger.info("  %-25s  %s", job.name, job.trigger)

    logger.info("Running initial order sync on startup...")
    job_sync_orders()

    logger.info("Scheduler running — press Ctrl+C to stop.")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped.")
