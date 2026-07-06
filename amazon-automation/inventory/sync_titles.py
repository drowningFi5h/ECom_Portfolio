"""
Product title sync — fills amazon_inventory.product_name via the Listings Items API.

The GET_MERCHANT_LISTINGS_ALL_DATA report returns item-name as blank for some
sellers. This script fetches titles directly per SKU using the Listings Items API
(GET /listings/2021-08-01/items/{merchantId}/{sku}).

Run manually:
    python -m inventory.sync_titles

Pass --all to overwrite existing titles (default: only fills NULLs).
"""

import logging
import sys
import time
from urllib.parse import quote

import requests
from sp_api.base import SellingApiException

from auth.sp_api_client import refresh_access_token
from config import amazon
from db.database import get_supabase

logger = logging.getLogger(__name__)

BASE_URL   = "https://sellingpartnerapi-eu.amazon.com"
RATE_DELAY = 0.3  # seconds between SKU calls to stay within throttle limits


def _get_token() -> str:
    return refresh_access_token()["access_token"]


def _fetch_title(token: str, sku: str) -> str | None:
    """Fetch itemName for a single SKU via the Listings Items API."""
    sku_enc = quote(sku, safe="")
    url = (
        f"{BASE_URL}/listings/2021-08-01/items/"
        f"{amazon.merchant_id}/{sku_enc}"
        f"?marketplaceIds={amazon.marketplace_id}&includedData=summaries"
    )
    resp = requests.get(
        url,
        headers={"x-amz-access-token": token, "Accept": "application/json"},
        timeout=15,
    )
    if resp.status_code == 404:
        return None
    if not resp.ok:
        logger.warning("  %s → HTTP %d: %s", sku, resp.status_code, resp.text[:120])
        return None

    data      = resp.json()
    summaries = data.get("summaries", [])
    for s in summaries:
        name = (s.get("itemName") or "").strip()
        if name:
            return name
    return None


def run_sync(overwrite: bool = False) -> dict:
    sb = get_supabase()

    query = sb.from_("amazon_inventory").select("seller_sku")
    if not overwrite:
        query = query.is_("product_name", "null")
    rows = query.execute().data or []

    if not rows:
        logger.info("No SKUs need title sync.")
        return {"updated": 0, "skipped": 0}

    logger.info("Fetching titles for %d SKUs...", len(rows))

    token   = _get_token()
    updated = 0
    skipped = 0

    for i, row in enumerate(rows):
        sku = row["seller_sku"]

        # Refresh token every 50 SKUs (tokens expire in ~1 hour; 50 × 0.3s is fine)
        if i > 0 and i % 200 == 0:
            token = _get_token()

        title = _fetch_title(token, sku)
        if title:
            sb.from_("amazon_inventory") \
              .update({"product_name": title}) \
              .eq("seller_sku", sku) \
              .execute()
            logger.info("  %-45s → %s", sku, title[:70])
            updated += 1
        else:
            logger.debug("  %s → no title", sku)
            skipped += 1

        time.sleep(RATE_DELAY)

    logger.info("Title sync done: %d updated, %d skipped", updated, skipped)
    return {"updated": updated, "skipped": skipped}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    overwrite = "--all" in sys.argv
    result    = run_sync(overwrite=overwrite)
    print(f"\nDone: {result['updated']} titles updated, {result['skipped']} skipped")
