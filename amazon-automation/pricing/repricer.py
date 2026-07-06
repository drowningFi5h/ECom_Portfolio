"""
Dynamic repricer — compares your listing prices against the competitive
price returned by the SP-API Products/Pricing endpoint, then calculates a
suggested price for each SKU based on your pricing rules.

Suggested prices are written to `amazon_price_suggestions` in Supabase.
They are NOT auto-applied — review and approve them in the dashboard.

Supabase tables needed (add to db/database.py schema and run in SQL editor):

    CREATE TABLE IF NOT EXISTS amazon_pricing_rules (
        seller_sku   TEXT PRIMARY KEY,
        min_price    NUMERIC NOT NULL,
        max_price    NUMERIC NOT NULL,
        strategy     TEXT    NOT NULL DEFAULT 'match_competitive',
        -- strategies: match_competitive | undercut_by | fixed_margin
        undercut_by  NUMERIC DEFAULT 2,   -- amount to undercut by (INR)
        margin_pct   NUMERIC DEFAULT 20,  -- target gross margin %
        cost_price   NUMERIC,             -- your cost (for margin strategy)
        enabled      BOOL    DEFAULT true,
        updated_at   TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amazon_price_suggestions (
        seller_sku        TEXT PRIMARY KEY,
        current_price     NUMERIC,
        competitive_price NUMERIC,
        suggested_price   NUMERIC,
        strategy          TEXT,
        reason            TEXT,
        generated_at      TIMESTAMPTZ DEFAULT now(),
        applied           BOOL DEFAULT false
    );

Run manually:
    python -m pricing.repricer
"""

import logging
import time
from datetime import datetime, timezone

from sp_api.base import SellingApiException

from auth.sp_api_client import get_client
from config import amazon
from db.database import get_supabase

logger = logging.getLogger(__name__)

BATCH_SIZE   = 20   # SKUs per API call (SP-API limit)
DELAY_BATCH  = 1.0  # seconds between batches


def _get_rules() -> dict[str, dict]:
    """Load all enabled pricing rules keyed by seller_sku."""
    sb   = get_supabase()
    resp = (
        sb.from_("amazon_pricing_rules")
        .select("*")
        .eq("enabled", True)
        .execute()
    )
    return {r["seller_sku"]: r for r in (resp.data or [])}


def _get_current_prices(skus: list[str]) -> dict[str, float]:
    """Get current listing prices from amazon_inventory."""
    if not skus:
        return {}
    sb   = get_supabase()
    resp = (
        sb.from_("amazon_inventory")
        .select("seller_sku, listing_price")
        .in_("seller_sku", skus)
        .execute()
    )
    return {
        r["seller_sku"]: float(r["listing_price"] or 0)
        for r in (resp.data or [])
        if r.get("listing_price") is not None
    }


def _get_competitive_prices(skus: list[str]) -> dict[str, float | None]:
    """
    Fetch competitive prices from SP-API Products (Pricing) API.
    Returns dict of SKU → competitive price (or None if unavailable).
    """
    client = get_client("Products")
    results: dict[str, float | None] = {}

    for i in range(0, len(skus), BATCH_SIZE):
        batch = skus[i : i + BATCH_SIZE]
        for attempt in range(3):
            try:
                resp = client.get_competitive_pricing_for_skus(
                    SellerSKUList=batch,
                    MarketplaceId=amazon.marketplace_id,
                )
                for item in (resp.payload or []):
                    sku   = item.get("SellerSKU") or item.get("ASIN")
                    price = None
                    try:
                        listing = item.get("Product", {}).get("CompetitivePricing", {})
                        prices  = listing.get("CompetitivePrices", [])
                        if prices:
                            price = float(prices[0]["Price"]["ListingPrice"]["Amount"])
                    except (KeyError, TypeError, ValueError):
                        pass
                    if sku:
                        results[sku] = price
                break
            except SellingApiException as e:
                if e.code == 429 and attempt < 2:
                    logger.warning("Rate limited on pricing batch, waiting 10s...")
                    time.sleep(10)
                else:
                    logger.error("Pricing API error for batch %d: %s", i // BATCH_SIZE + 1, e)
                    for sku in batch:
                        results.setdefault(sku, None)
                    break

        time.sleep(DELAY_BATCH)

    return results


def _calculate_suggestion(
    rule: dict,
    current_price: float,
    competitive_price: float | None,
) -> tuple[float, str]:
    """
    Returns (suggested_price, reason) based on the rule strategy.
    Clamps result to [min_price, max_price].
    """
    min_p = float(rule["min_price"])
    max_p = float(rule["max_price"])
    strategy = rule.get("strategy", "match_competitive")

    def clamp(p: float) -> float:
        return max(min_p, min(max_p, round(p, 2)))

    if strategy == "match_competitive":
        if competitive_price is None:
            return current_price, "No competitive price — keeping current"
        suggested = clamp(competitive_price)
        return suggested, f"Matching competitive price ₹{competitive_price:.0f}"

    if strategy == "undercut_by":
        if competitive_price is None:
            return current_price, "No competitive price — keeping current"
        undercut = float(rule.get("undercut_by") or 2)
        suggested = clamp(competitive_price - undercut)
        return suggested, f"Undercutting by ₹{undercut:.0f} (comp=₹{competitive_price:.0f})"

    if strategy == "fixed_margin":
        cost = float(rule.get("cost_price") or 0)
        margin = float(rule.get("margin_pct") or 20)
        if cost <= 0:
            return current_price, "No cost price set — keeping current"
        target = cost * (1 + margin / 100)
        suggested = clamp(target)
        return suggested, f"Fixed {margin:.0f}% margin on cost ₹{cost:.0f}"

    return current_price, "Unknown strategy — keeping current"


def run_repricer() -> dict:
    logger.info("Starting repricer run...")
    start = time.time()

    rules = _get_rules()
    if not rules:
        logger.info("No pricing rules configured. Add rules to amazon_pricing_rules table.")
        return {"suggestions": 0, "duration_s": 0}

    skus           = list(rules.keys())
    current_prices = _get_current_prices(skus)
    comp_prices    = _get_competitive_prices(skus)

    now  = datetime.now(timezone.utc).isoformat()
    rows = []

    for sku, rule in rules.items():
        current_p = current_prices.get(sku, 0.0)
        comp_p    = comp_prices.get(sku)

        suggested, reason = _calculate_suggestion(rule, current_p, comp_p)

        rows.append({
            "seller_sku":        sku,
            "current_price":     current_p,
            "competitive_price": comp_p,
            "suggested_price":   suggested,
            "strategy":          rule.get("strategy"),
            "reason":            reason,
            "generated_at":      now,
            "applied":           False,
        })

    if rows:
        get_supabase() \
            .from_("amazon_price_suggestions") \
            .upsert(rows, on_conflict="seller_sku") \
            .execute()

    duration = round(time.time() - start, 1)
    logger.info("Repricer done: %d suggestions in %ss", len(rows), duration)
    return {"suggestions": len(rows), "duration_s": duration}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    print(run_repricer())
