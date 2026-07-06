"""
Fee estimate sync — fetches Amazon's actual fee breakdown per SKU.

Uses ProductFees.getMyFeesEstimateForSKU at each SKU's current listing price.
Returns:
  - Exact referral fee amount and effective % for the SKU's category
  - Variable closing fee (confirms our slab calculation)
  - Any per-item fee if applicable

Table populated:
  amazon_fee_estimates — one row per SKU, refreshed on each run

Run:
    python -m fees.sync_fees
"""

import logging
import time
from datetime import datetime, timezone

from auth.sp_api_client import get_client
from config import amazon
from db.database import get_supabase

logger = logging.getLogger(__name__)

BATCH_DELAY = 0.5   # seconds between API calls to stay within rate limits
MAX_RETRIES = 3


def _fetch_estimate(client, sku: str, price: float) -> dict | None:
    """
    Call getMyFeesEstimateForSKU for one SKU at its listing price.
    Returns parsed fee dict or None on failure.
    """
    body = {
        "FeesEstimateRequest": {
            "MarketplaceId":       amazon.marketplace_id,
            "IsAmazonFulfilled":   False,   # FBM / MFN
            "PriceToEstimateFees": {
                "ListingPrice": {
                    "CurrencyCode": "INR",
                    "Amount":       price,
                },
            },
            "Identifier": sku,
        }
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp    = client.get_my_fees_estimate_for_sku(SellerSKU=sku, body=body)
            payload = resp.payload or {}
            result  = payload.get("FeesEstimateResult", {})
            status  = result.get("Status", "")

            if status != "Success":
                msg = result.get("Error", {}).get("Message", "unknown")
                logger.warning("Fee estimate for %s: %s — %s", sku, status, msg)
                return None

            estimate   = result.get("FeesEstimate", {})
            fee_details = estimate.get("FeeDetailList") or []

            referral_fee     = 0.0
            variable_closing = 0.0
            per_item_fee     = 0.0

            for fee in fee_details:
                fee_type = fee.get("FeeType", "")
                amount   = float((fee.get("FeeAmount") or {}).get("Amount") or 0)
                if fee_type == "ReferralFee":
                    referral_fee = amount
                elif fee_type in ("VariableClosingFee", "ClosingFee"):
                    variable_closing = amount
                elif fee_type == "PerItemFee":
                    per_item_fee = amount

            referral_pct = round((referral_fee / price) * 100, 2) if price > 0 else 0.0

            return {
                "seller_sku":         sku,
                "listing_price":      price,
                "referral_fee":       round(referral_fee,     2),
                "referral_pct":       referral_pct,
                "variable_closing":   round(variable_closing, 2),
                "per_item_fee":       round(per_item_fee,     2),
                "fetched_at":         datetime.now(timezone.utc).isoformat(),
            }

        except Exception as e:
            err = str(e)
            if "429" in err and attempt < MAX_RETRIES - 1:
                logger.warning("Rate limited on %s, retrying in 30s...", sku)
                time.sleep(30)
            else:
                logger.error("Fee estimate failed for %s: %s", sku, e)
                return None

    return None


def run_sync() -> str:
    sb     = get_supabase()
    client = get_client("ProductFees")

    # Fetch all active SKUs that have a listing price
    inv_res = sb.from_("amazon_inventory") \
                .select("seller_sku, listing_price") \
                .not_.is_("listing_price", "null") \
                .gt("listing_price", 0) \
                .execute()

    skus = [
        (r["seller_sku"], float(r["listing_price"]))
        for r in (inv_res.data or [])
        if r.get("listing_price")
    ]

    if not skus:
        logger.info("No SKUs with listing price found in inventory")
        return "0 SKUs"

    logger.info("Fetching fee estimates for %d SKUs...", len(skus))
    rows: list[dict] = []

    for i, (sku, price) in enumerate(skus, 1):
        logger.info("  [%d/%d] %s @ ₹%.0f", i, len(skus), sku, price)
        est = _fetch_estimate(client, sku, price)
        if est:
            rows.append(est)
            logger.info(
                "    referral=%.1f%% (₹%.2f)  closing=₹%.2f",
                est["referral_pct"], est["referral_fee"], est["variable_closing"],
            )
        time.sleep(BATCH_DELAY)

    if rows:
        sb.from_("amazon_fee_estimates").upsert(rows, on_conflict="seller_sku").execute()
        logger.info("Upserted %d fee estimates", len(rows))

    return f"{len(rows)}/{len(skus)} SKUs estimated"


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    print(run_sync())
