"""
Order sync module — fetches Amazon orders and upserts them into Supabase.

Features:
  - Incremental: only fetches orders updated since the last sync
  - Paginated: handles any number of orders via NextToken
  - Resilient: retries on rate-limit, skips bad records without crashing
  - Full data: fetches line items for every order

Run manually:
    python -m orders.sync_orders

Or import and call from the scheduler:
    from orders.sync_orders import run_sync
    run_sync()
"""

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from sp_api.base import SellingApiException

from auth.sp_api_client import get_client
from config import amazon
from db.database import get_supabase

logger = logging.getLogger(__name__)

# SP-API rate limits: getOrders = 1 req/min burst 20, getOrderItems = 0.5 req/s burst 30
ORDERS_DELAY   = 1.0   # seconds between paginated order calls
ITEMS_DELAY    = 0.5   # seconds between order-item calls
MAX_RETRIES    = 3
LOOKBACK_DAYS  = 90    # first-run lookback window


# ── Helpers ────────────────────────────────────────────────────────────────────

def _last_sync_time() -> str:
    """
    Return the LastUpdatedAfter timestamp for the next incremental sync.

    Uses the most recent order's last_update_date minus a 2-hour buffer to
    guard against SP-API clock skew and orders whose timestamps land at the
    exact boundary. Falls back to LOOKBACK_DAYS on first run or DB errors.
    """
    BUFFER_HOURS = 2
    try:
        sb = get_supabase()
        result = (
            sb.from_("amazon_orders")
            .select("last_update_date")
            .order("last_update_date", desc=True)
            .limit(1)
            .execute()
        )
        if result.data and result.data[0]["last_update_date"]:
            raw = result.data[0]["last_update_date"]
            # Parse whatever timezone Supabase stored and convert to UTC
            try:
                from dateutil.parser import parse as dtparse
                ts = dtparse(raw).astimezone(timezone.utc)
            except Exception:
                ts = datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
            buffered = ts - timedelta(hours=BUFFER_HOURS)
            since = buffered.strftime("%Y-%m-%dT%H:%M:%SZ")
            logger.info("Incremental window: orders updated after %s (-%dh buffer)", since, BUFFER_HOURS)
            return since
    except Exception as e:
        logger.warning("Could not read last sync time from DB: %s", e)

    fallback = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
    return fallback.strftime("%Y-%m-%dT%H:%M:%SZ")


def _fetch_orders(last_updated_after: str) -> list[dict]:
    """Fetch all orders updated after the given timestamp, handling pagination."""
    client = get_client("Orders")
    all_orders: list[dict] = []
    next_token = None
    page = 1

    while True:
        for attempt in range(MAX_RETRIES):
            try:
                if next_token:
                    resp = client.get_orders(NextToken=next_token)
                else:
                    resp = client.get_orders(
                        MarketplaceIds=[amazon.marketplace_id],
                        LastUpdatedAfter=last_updated_after,
                        OrderStatuses=[
                            "Pending", "Unshipped", "PartiallyShipped",
                            "Shipped", "Canceled", "Unfulfillable",
                        ],
                    )
                break
            except SellingApiException as e:
                if e.code == 429 and attempt < MAX_RETRIES - 1:
                    logger.warning("Rate limited on orders page %d, retrying in 60s...", page)
                    time.sleep(60)
                else:
                    raise

        payload    = resp.payload or {}
        orders     = payload.get("Orders", [])
        next_token = payload.get("NextToken")

        all_orders.extend(orders)
        logger.info("Page %d: fetched %d orders (total so far: %d)", page, len(orders), len(all_orders))

        if not next_token:
            break

        page += 1
        time.sleep(ORDERS_DELAY)

    return all_orders


def _fetch_items(order_id: str) -> list[dict]:
    """Fetch line items for a single order."""
    client = get_client("Orders")

    for attempt in range(MAX_RETRIES):
        try:
            resp = client.get_order_items(order_id)
            return resp.payload.get("OrderItems", [])
        except SellingApiException as e:
            if e.code == 429 and attempt < MAX_RETRIES - 1:
                logger.warning("Rate limited fetching items for %s, retrying...", order_id)
                time.sleep(30)
            else:
                logger.error("Failed to fetch items for %s: %s", order_id, e)
                return []


def _parse_order(o: dict) -> dict:
    """Flatten a raw SP-API order dict into our DB schema."""
    total    = o.get("OrderTotal", {})
    address  = o.get("ShippingAddress", {})
    buyer    = o.get("BuyerInfo", {})

    return {
        "amazon_order_id":      o.get("AmazonOrderId"),
        "status":               o.get("OrderStatus"),
        "purchase_date":        o.get("PurchaseDate"),
        "last_update_date":     o.get("LastUpdateDate"),
        "order_total_amount":   float(total.get("Amount", 0)) if total.get("Amount") else None,
        "order_total_currency": total.get("CurrencyCode"),
        "num_items_shipped":    o.get("NumberOfItemsShipped", 0),
        "num_items_unshipped":  o.get("NumberOfItemsUnshipped", 0),
        "fulfillment_channel":  o.get("FulfillmentChannel"),
        "sales_channel":        o.get("SalesChannel"),
        "ship_service_level":   o.get("ShipServiceLevel"),
        "buyer_name":           buyer.get("BuyerName"),
        "ship_city":            address.get("City"),
        "ship_state":           address.get("StateOrRegion"),
        "ship_postal_code":     address.get("PostalCode"),
        "raw":                  o,
        "synced_at":            datetime.now(timezone.utc).isoformat(),
    }


def _parse_item(order_id: str, item: dict) -> dict:
    """Flatten a raw SP-API order item into our DB schema."""
    price = item.get("ItemPrice", {})
    return {
        "amazon_order_id":    order_id,
        "asin":               item.get("ASIN"),
        "seller_sku":         item.get("SellerSKU"),
        "title":              item.get("Title"),
        "quantity_ordered":   item.get("QuantityOrdered", 0),
        "quantity_shipped":   item.get("QuantityShipped", 0),
        "item_price_amount":  float(price.get("Amount", 0)) if price.get("Amount") else None,
        "item_price_currency": price.get("CurrencyCode"),
        "raw":                item,
    }


def _upsert_orders(orders: list[dict]) -> int:
    """Upsert parsed orders into Supabase. Returns count upserted."""
    if not orders:
        return 0
    sb = get_supabase()
    sb.from_("amazon_orders").upsert(orders, on_conflict="amazon_order_id").execute()
    return len(orders)


def _upsert_items(items: list[dict]) -> int:
    """Delete existing items for the orders then insert fresh ones."""
    if not items:
        return 0
    sb = get_supabase()
    order_ids = list({i["amazon_order_id"] for i in items})
    sb.from_("amazon_order_items").delete().in_("amazon_order_id", order_ids).execute()
    sb.from_("amazon_order_items").insert(items).execute()
    return len(items)


# ── Main entry point ───────────────────────────────────────────────────────────

def run_sync(full: bool = False) -> dict:
    """
    Sync Amazon orders to Supabase.

    Args:
        full: If True, sync from LOOKBACK_DAYS ago regardless of last sync.

    Returns:
        {"orders": int, "items": int, "duration_s": float}
    """
    start = time.time()

    if full:
        since = (datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
        logger.info("Full sync from %s", since)
    else:
        since = _last_sync_time()
        logger.info("Incremental sync from %s", since)

    # 1. Fetch orders
    raw_orders = _fetch_orders(since)
    if not raw_orders:
        logger.info("No new or updated orders.")
        return {"orders": 0, "items": 0, "duration_s": round(time.time() - start, 1)}

    # 2. Parse and upsert orders
    parsed_orders = [_parse_order(o) for o in raw_orders]
    orders_saved  = _upsert_orders(parsed_orders)
    logger.info("Upserted %d orders", orders_saved)

    # 3. Fetch and upsert line items
    all_items: list[dict] = []
    for i, order in enumerate(raw_orders, 1):
        oid   = order.get("AmazonOrderId", "")
        items = _fetch_items(oid)
        all_items.extend([_parse_item(oid, item) for item in items])
        logger.info("  [%d/%d] %s — %d items", i, len(raw_orders), oid, len(items))
        time.sleep(ITEMS_DELAY)

    items_saved = _upsert_items(all_items)
    duration    = round(time.time() - start, 1)

    logger.info("Sync complete: %d orders, %d items in %ss", orders_saved, items_saved, duration)
    return {"orders": orders_saved, "items": items_saved, "duration_s": duration}


if __name__ == "__main__":
    import sys
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    full = "--full" in sys.argv
    result = run_sync(full=full)
    print(f"\nDone: {result['orders']} orders, {result['items']} items in {result['duration_s']}s")
