"""
FBM Inventory sync — pulls merchant listings (SKUs + quantities) into Supabase.

Uses the Reports API to request GET_MERCHANT_LISTINGS_ALL_DATA, waits for
completion, downloads, parses, and upserts to amazon_inventory.

Run manually:
    python -m inventory.sync_inventory
"""

import csv
import gzip
import io
import logging
import time
from datetime import datetime, timezone

import requests
from sp_api.base import SellingApiException

from auth.sp_api_client import get_client, refresh_access_token
from config import amazon
from db.database import get_supabase

logger = logging.getLogger(__name__)

REPORT_TYPE = "GET_MERCHANT_LISTINGS_ALL_DATA"
POLL_INTERVAL = 10   # seconds between status checks
POLL_TIMEOUT  = 300  # seconds max wait


def _request_report() -> str:
    """Submit a report request; returns reportId."""
    client = get_client("Reports")
    resp = client.create_report(
        reportType=REPORT_TYPE,
        marketplaceIds=[amazon.marketplace_id],
    )
    report_id = resp.payload.get("reportId") or resp.payload.get("ReportId")
    logger.info("Requested report %s → reportId=%s", REPORT_TYPE, report_id)
    return report_id


def _wait_for_report(report_id: str) -> str:
    """Poll until report DONE; returns documentId."""
    client = get_client("Reports")
    deadline = time.time() + POLL_TIMEOUT

    while time.time() < deadline:
        resp = client.get_report(reportId=report_id)
        payload = resp.payload or {}
        status = payload.get("processingStatus", "")
        logger.info("Report %s status: %s", report_id, status)

        if status == "DONE":
            doc_id = payload.get("reportDocumentId")
            if not doc_id:
                raise RuntimeError("Report DONE but no reportDocumentId returned")
            return doc_id

        if status in ("CANCELLED", "FATAL"):
            raise RuntimeError(f"Report ended with status: {status}")

        time.sleep(POLL_INTERVAL)

    raise TimeoutError(f"Report {report_id} did not complete within {POLL_TIMEOUT}s")


def _download_report(document_id: str) -> list[dict]:
    """Download and parse the flat-file listings report."""
    client = get_client("Reports")
    resp = client.get_report_document(reportDocumentId=document_id)
    doc = resp.payload or {}

    url         = doc.get("url")
    compression = doc.get("compressionAlgorithm", "")

    if not url:
        raise RuntimeError("No download URL in report document response")

    logger.info("Downloading report document (compression=%s)...", compression or "none")
    dl = requests.get(url, timeout=60)
    dl.raise_for_status()

    raw_bytes = dl.content
    if compression == "GZIP":
        raw_bytes = gzip.decompress(raw_bytes)

    text = raw_bytes.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text), delimiter="\t")
    rows = list(reader)
    logger.info("Parsed %d listing rows", len(rows))
    return rows


def _parse_listing(row: dict) -> dict | None:
    """Convert a flat-file row to the amazon_inventory schema."""
    sku = (row.get("seller-sku") or "").strip()
    if not sku:
        return None

    try:
        qty = int(row.get("quantity") or 0)
    except (ValueError, TypeError):
        qty = 0

    try:
        price = float(row.get("price") or 0)
    except (ValueError, TypeError):
        price = 0.0

    status = (row.get("status") or "").strip().lower()

    return {
        "seller_sku":        sku,
        "asin":              (row.get("asin1") or row.get("asin") or "").strip() or None,
        "fnsku":             None,
        "product_name":      (row.get("item-name") or "").strip() or None,
        "condition":         (row.get("item-condition") or "").strip() or None,
        "fulfillable_qty":   qty,
        "listing_price":     price,
        "listing_status":    status,
        "inbound_working":   0,
        "inbound_shipped":   0,
        "inbound_receiving": 0,
        "reserved_qty":      0,
        "researching_qty":   0,
        "unfulfillable_qty": 0,
        "synced_at":         datetime.now(timezone.utc).isoformat(),
    }


def run_sync() -> dict:
    logger.info("Starting FBM inventory sync (merchant listings report)...")
    start = time.time()

    try:
        report_id   = _request_report()
        document_id = _wait_for_report(report_id)
        raw_rows    = _download_report(document_id)
    except (RuntimeError, TimeoutError, SellingApiException) as e:
        logger.error("Inventory sync failed: %s", e)
        return {"skus": 0, "duration_s": 0, "error": str(e)}

    rows = [r for r in (_parse_listing(row) for row in raw_rows) if r]

    if not rows:
        logger.info("No listings found in report.")
        return {"skus": 0, "duration_s": round(time.time() - start, 1)}

    get_supabase() \
        .from_("amazon_inventory") \
        .upsert(rows, on_conflict="seller_sku") \
        .execute()

    duration = round(time.time() - start, 1)
    logger.info("Inventory sync done: %d SKUs in %ss", len(rows), duration)
    return {"skus": len(rows), "duration_s": duration}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = run_sync()
    if "error" in result:
        print(f"\nFailed: {result['error']}")
    else:
        print(f"\nDone: {result['skus']} SKUs synced in {result['duration_s']}s")
