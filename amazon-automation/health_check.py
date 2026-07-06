"""
SP-API + Supabase health check.

Run from the amazon-automation directory:
    python health_check.py

Checks:
  1. LWA token refresh
  2. Orders API  — last 7 days count + most recent order
  3. Finances API — settlement groups
  4. Reports API  — inventory report status
  5. Supabase     — row counts + last sync timestamps
  6. Incremental sync window — what the next order sync would use as start time
"""

import sys
import time
from datetime import datetime, timedelta, timezone

PASS = "  ✔"
FAIL = "  ✘"
WARN = "  ⚠"
INFO = "  ·"


def section(title: str):
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")


# ── 1. LWA token refresh ───────────────────────────────────────────────────────

def check_lwa():
    section("1. LWA token refresh")
    try:
        from auth.sp_api_client import refresh_access_token
        t0   = time.time()
        data = refresh_access_token()
        ms   = int((time.time() - t0) * 1000)
        token = data.get("access_token", "")
        print(f"{PASS} Token refreshed in {ms}ms — expires in {data.get('expires_in', '?')}s")
        print(f"{INFO} Token prefix: {token[:30]}...")
        return True
    except Exception as e:
        print(f"{FAIL} Token refresh failed: {e}")
        return False


# ── 2. Orders API ──────────────────────────────────────────────────────────────

def check_orders():
    section("2. Orders API")
    try:
        from auth.sp_api_client import get_client
        from config import amazon

        client = get_client("Orders")

        # Last 7 days
        since_7d = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
        t0   = time.time()
        resp = client.get_orders(
            MarketplaceIds=[amazon.marketplace_id],
            LastUpdatedAfter=since_7d,
            OrderStatuses=["Pending", "Unshipped", "PartiallyShipped", "Shipped", "Canceled"],
        )
        ms = int((time.time() - t0) * 1000)
        orders = resp.payload.get("Orders", []) if resp.payload else []
        next_token = resp.payload.get("NextToken") if resp.payload else None

        print(f"{PASS} Orders API responding ({ms}ms)")
        print(f"{INFO} Orders in last 7 days (first page): {len(orders)}{' + more pages' if next_token else ''}")

        if orders:
            latest = orders[0]
            print(f"{INFO} Most recent order:")
            print(f"       ID       : {latest.get('AmazonOrderId')}")
            print(f"       Status   : {latest.get('OrderStatus')}")
            print(f"       Purchased: {latest.get('PurchaseDate', '')[:19]}")
            print(f"       Updated  : {latest.get('LastUpdateDate', '')[:19]}")

        # Also check last 24 hours specifically
        since_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
        resp24 = client.get_orders(
            MarketplaceIds=[amazon.marketplace_id],
            LastUpdatedAfter=since_24h,
            OrderStatuses=["Pending", "Unshipped", "PartiallyShipped", "Shipped", "Canceled"],
        )
        orders24 = resp24.payload.get("Orders", []) if resp24.payload else []
        if orders24:
            print(f"{INFO} Orders updated in last 24h: {len(orders24)}")
            for o in orders24[:3]:
                print(f"       · {o.get('AmazonOrderId')} | {o.get('OrderStatus')} | updated {o.get('LastUpdateDate', '')[:19]}")
        else:
            print(f"{WARN} No orders updated in the last 24 hours")

        return True
    except Exception as e:
        print(f"{FAIL} Orders API failed: {e}")
        return False


# ── 3. Finances API ────────────────────────────────────────────────────────────

def check_finances():
    section("3. Finances API (Settlements)")
    try:
        from auth.sp_api_client import get_client

        client = get_client("Finances")
        since  = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%SZ")

        t0   = time.time()
        resp = client.list_financial_event_groups(
            FinancialEventGroupStartedAfter=since,
            MaxResultsPerPage=10,
        )
        ms = int((time.time() - t0) * 1000)

        groups = (resp.payload or {}).get("FinancialEventGroupList") or []
        print(f"{PASS} Finances API responding ({ms}ms)")
        print(f"{INFO} Settlement groups in last 90 days: {len(groups)}")

        if groups:
            g = groups[0]
            total = (g.get("OriginalTotal") or {})
            print(f"{INFO} Latest settlement:")
            print(f"       Group ID : {g.get('FinancialEventGroupId', '')[:20]}...")
            print(f"       Status   : {g.get('ProcessingStatus')}")
            print(f"       Period   : {str(g.get('FinancialEventGroupStart', ''))[:10]} → {str(g.get('FinancialEventGroupEnd', ''))[:10]}")
            print(f"       Amount   : {total.get('CurrencyCode', 'INR')} {total.get('CurrencyAmount', '?')}")

        return True
    except Exception as e:
        print(f"{FAIL} Finances API failed: {e}")
        return False


# ── 4. Reports API (inventory) ─────────────────────────────────────────────────

def check_reports():
    section("4. Reports API (inventory listing)")
    try:
        from auth.sp_api_client import get_client

        client = get_client("Reports")
        t0   = time.time()
        resp = client.get_reports(
            reportTypes=["GET_MERCHANT_LISTINGS_ALL_DATA"],
            pageSize=5,
        )
        ms = int((time.time() - t0) * 1000)

        reports = (resp.payload or {}).get("reports", [])
        print(f"{PASS} Reports API responding ({ms}ms)")
        if reports:
            r = reports[0]
            print(f"{INFO} Latest inventory report:")
            print(f"       Status   : {r.get('processingStatus')}")
            print(f"       Created  : {str(r.get('createdTime', ''))[:19]}")
        else:
            print(f"{WARN} No inventory reports found")
        return True
    except Exception as e:
        print(f"{FAIL} Reports API failed: {e}")
        return False


# ── 5. Supabase row counts + last sync ────────────────────────────────────────

def check_supabase():
    section("5. Supabase DB")
    try:
        from db.database import get_supabase
        sb = get_supabase()

        tables = [
            ("amazon_orders",           "last_update_date"),
            ("amazon_order_items",      None),
            ("amazon_inventory",        "synced_at"),
            ("amazon_settlements",      "synced_at"),
            ("amazon_financial_events", "synced_at"),
            ("amazon_product_costs",    "updated_at"),
        ]

        for table, ts_col in tables:
            try:
                count_res = sb.from_(table).select("*", count="exact", head=True).execute()
                count = count_res.count or 0

                last = "—"
                if ts_col:
                    ts_res = sb.from_(table).select(ts_col).order(ts_col, desc=True).limit(1).execute()
                    if ts_res.data:
                        raw = ts_res.data[0].get(ts_col, "")
                        last = str(raw)[:19] if raw else "—"

                status = PASS if count > 0 else WARN
                print(f"{status} {table:<35} {count:>6} rows   last: {last}")
            except Exception as e:
                msg = str(e)
                if "42P01" in msg:
                    print(f"{FAIL} {table:<35} TABLE NOT FOUND — run the SQL setup")
                else:
                    print(f"{FAIL} {table:<35} error: {msg[:60]}")

        return True
    except Exception as e:
        print(f"{FAIL} Supabase connection failed: {e}")
        return False


# ── 6. Incremental sync window ────────────────────────────────────────────────

def check_sync_window():
    section("6. Order sync incremental window")
    try:
        from db.database import get_supabase
        from datetime import timedelta

        sb = get_supabase()

        # What _last_sync_time() would return
        res = sb.from_("amazon_orders").select("last_update_date").order("last_update_date", desc=True).limit(1).execute()
        if res.data and res.data[0]["last_update_date"]:
            raw = res.data[0]["last_update_date"]
            try:
                from dateutil.parser import parse as dtparse
                ts = dtparse(raw).astimezone(timezone.utc)
            except Exception:
                ts = datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)

            buffered = ts - timedelta(hours=2)
            now = datetime.now(timezone.utc)
            age_h = (now - ts).total_seconds() / 3600

            print(f"{INFO} Most recent order in DB : {ts.strftime('%Y-%m-%d %H:%M')} UTC  ({age_h:.1f}h ago)")
            print(f"{INFO} Next sync will fetch from: {buffered.strftime('%Y-%m-%d %H:%M')} UTC  (with -2h buffer)")

            if age_h > 6:
                print(f"{WARN} Latest DB order is {age_h:.0f}h old — scheduler may not be running")
                print(f"      Run manually: python -m orders.sync_orders")
            else:
                print(f"{PASS} Sync window looks healthy")
        else:
            print(f"{WARN} No orders in DB — run a full sync:")
            print(f"      python -m orders.sync_orders --full")

        return True
    except Exception as e:
        print(f"{FAIL} Could not determine sync window: {e}")
        return False


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "═" * 50)
    print("  Amazon SP-API + Supabase Health Check")
    print("═" * 50)

    results = {
        "LWA token":    check_lwa(),
        "Orders API":   check_orders(),
        "Finances API": check_finances(),
        "Reports API":  check_reports(),
        "Supabase":     check_supabase(),
        "Sync window":  check_sync_window(),
    }

    section("Summary")
    all_ok = True
    for name, ok in results.items():
        icon = PASS if ok else FAIL
        print(f"{icon} {name}")
        if not ok:
            all_ok = False

    print()
    if all_ok:
        print("  All checks passed.")
    else:
        print("  Some checks failed — review output above.")
    print()

    sys.exit(0 if all_ok else 1)
