"""
Review request automation — sends Amazon's native review solicitation for
eligible shipped/delivered FBM orders.

Rules:
  - Order status must be Shipped or Delivered
  - Purchase date 5–30 days ago (Amazon's allowed window)
  - Never requested before (tracked in amazon_alert_log)

Run manually:
    python -m orders.request_review
"""

import logging
import time
from datetime import datetime, timedelta, timezone

from sp_api.base import SellingApiException

from auth.sp_api_client import get_client
from config import amazon
from db.database import get_supabase

logger = logging.getLogger(__name__)

ALERT_TYPE       = "review_request"
MIN_DAYS_OLD     = 5
MAX_DAYS_OLD     = 30
DELAY_BETWEEN    = 1.0  # seconds between API calls to avoid rate limiting


def _get_eligible_orders() -> list[dict]:
    """Orders that are shipped/delivered and in the 5-30 day window."""
    now  = datetime.now(timezone.utc)
    low  = (now - timedelta(days=MAX_DAYS_OLD)).isoformat()
    high = (now - timedelta(days=MIN_DAYS_OLD)).isoformat()

    sb   = get_supabase()
    resp = (
        sb.from_("amazon_orders")
        .select("amazon_order_id, status, purchase_date")
        .in_("status", ["Shipped", "Delivered"])
        .gte("purchase_date", low)
        .lte("purchase_date", high)
        .execute()
    )
    return resp.data or []


def _already_requested(order_ids: list[str]) -> set[str]:
    """Return the set of order IDs that already have a review request logged."""
    if not order_ids:
        return set()

    sb   = get_supabase()
    resp = (
        sb.from_("amazon_alert_log")
        .select("reference")
        .eq("alert_type", ALERT_TYPE)
        .in_("reference", order_ids)
        .execute()
    )
    return {r["reference"] for r in (resp.data or [])}


def _log_request(order_id: str) -> None:
    get_supabase().from_("amazon_alert_log").insert({
        "alert_type": ALERT_TYPE,
        "reference":  order_id,
    }).execute()


def run_review_requests() -> dict:
    logger.info("Starting review request automation...")

    orders  = _get_eligible_orders()
    if not orders:
        logger.info("No eligible orders in the 5-30 day window.")
        return {"sent": 0, "skipped": 0, "failed": 0}

    order_ids = [o["amazon_order_id"] for o in orders]
    already   = _already_requested(order_ids)

    pending = [o for o in orders if o["amazon_order_id"] not in already]
    logger.info(
        "%d eligible orders, %d already requested, %d to process",
        len(orders), len(already), len(pending),
    )

    client = get_client("Solicitations")
    sent = failed = 0

    for order in pending:
        order_id = order["amazon_order_id"]
        for attempt in range(3):
            try:
                client.create_product_review_and_seller_feedback_solicitation(
                    amazonOrderId=order_id,
                    marketplaceIds=[amazon.marketplace_id],
                )
                _log_request(order_id)
                sent += 1
                logger.info("Review request sent for %s", order_id)
                break
            except SellingApiException as e:
                if e.code == 429 and attempt < 2:
                    logger.warning("Rate limited on %s, waiting 30s...", order_id)
                    time.sleep(30)
                elif "has already been requested" in str(e).lower():
                    # Amazon already got one, log it so we don't retry
                    _log_request(order_id)
                    logger.info("Already requested (per Amazon) for %s", order_id)
                    break
                else:
                    logger.error("Failed review request for %s: %s", order_id, e)
                    failed += 1
                    break
        else:
            failed += 1

        time.sleep(DELAY_BETWEEN)

    logger.info("Review requests done — sent: %d, skipped: %d, failed: %d", sent, len(already), failed)
    return {"sent": sent, "skipped": len(already), "failed": failed}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    print(run_review_requests())
