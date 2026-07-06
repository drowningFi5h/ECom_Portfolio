"""
Daily sales summary email — sent every morning with yesterday's performance.

Run manually:
    python -m reports.daily_summary

Or call from scheduler:
    from reports.daily_summary import run_summary
    run_summary()
"""

import logging
from datetime import datetime, timedelta, timezone

from config import notifications as notif_cfg
from db.database import get_supabase
from notifications.email import send_email

logger = logging.getLogger(__name__)


def _get_summary(date: datetime) -> dict:
    sb = get_supabase()

    day_start = date.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    day_end   = date.replace(hour=23, minute=59, second=59).isoformat()

    # Orders for the day
    orders = (
        sb.from_("amazon_orders")
        .select("amazon_order_id, status, order_total_amount, order_total_currency, fulfillment_channel")
        .gte("purchase_date", day_start)
        .lte("purchase_date", day_end)
        .execute()
    )

    rows = orders.data or []
    placed    = [o for o in rows if o["status"] != "Canceled"]
    cancelled = [o for o in rows if o["status"] == "Canceled"]
    revenue   = sum(o["order_total_amount"] or 0 for o in placed)
    currency  = rows[0]["order_total_currency"] if rows else "INR"
    fba_count = sum(1 for o in placed if o.get("fulfillment_channel") == "AFN")
    fbm_count = sum(1 for o in placed if o.get("fulfillment_channel") == "MFN")

    # Top SKUs by units ordered
    order_ids = [o["amazon_order_id"] for o in placed]
    top_skus: list[dict] = []

    if order_ids:
        items = (
            sb.from_("amazon_order_items")
            .select("seller_sku, title, quantity_ordered")
            .in_("amazon_order_id", order_ids)
            .execute()
        )
        sku_totals: dict[str, dict] = {}
        for item in (items.data or []):
            sku = item["seller_sku"] or "Unknown"
            if sku not in sku_totals:
                sku_totals[sku] = {"sku": sku, "title": item.get("title", ""), "units": 0}
            sku_totals[sku]["units"] += item.get("quantity_ordered", 0)

        top_skus = sorted(sku_totals.values(), key=lambda x: x["units"], reverse=True)[:5]

    # Low stock count
    threshold = 10
    low_stock = (
        sb.from_("amazon_inventory")
        .select("seller_sku", count="exact")
        .lte("fulfillable_qty", threshold)
        .execute()
    )

    return {
        "date":         date,
        "total_orders": len(placed),
        "cancelled":    len(cancelled),
        "revenue":      revenue,
        "currency":     currency,
        "fba_count":    fba_count,
        "fbm_count":    fbm_count,
        "top_skus":     top_skus,
        "low_stock":    low_stock.count or 0,
    }


def _format_currency(amount: float, currency: str) -> str:
    try:
        from babel.numbers import format_currency as babel_fmt
        return babel_fmt(amount, currency, locale="en_IN")
    except Exception:
        symbol = "₹" if currency == "INR" else currency
        return f"{symbol}{amount:,.0f}"


def _build_email(s: dict) -> tuple[str, str, str]:
    date_str = s["date"].strftime("%A, %d %B %Y")
    revenue  = _format_currency(s["revenue"], s["currency"])

    # Top SKU rows
    sku_rows_html = ""
    sku_rows_text = ""
    for i, sku in enumerate(s["top_skus"], 1):
        sku_rows_html += f"""
        <tr style="{'background:#f8fafc' if i % 2 == 0 else ''}">
          <td style="padding:9px 12px;font-family:monospace;font-size:12px;color:#334155">{sku['sku']}</td>
          <td style="padding:9px 12px;font-size:13px;color:#475569">{(sku['title'] or '')[:45]}</td>
          <td style="padding:9px 12px;text-align:center;font-weight:700;color:#0b3b46">{sku['units']}</td>
        </tr>"""
        sku_rows_text += f"  {i}. {sku['sku']} — {sku['units']} units\n"

    no_skus_html = "<tr><td colspan='3' style='padding:16px;text-align:center;color:#94a3b8'>No orders yesterday</td></tr>"

    low_stock_html = ""
    if s["low_stock"] > 0:
        low_stock_html = f"""
        <div style="margin-top:16px;padding:14px 16px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b">
          ⚠️ <strong>{s['low_stock']} SKU(s)</strong> are running low on FBA stock — check your inventory dashboard.
        </div>"""

    subject = f"📦 Daily Sales Summary — {s['date'].strftime('%d %b')}"
    if s["total_orders"] == 0:
        subject = f"📦 Daily Summary — No orders on {s['date'].strftime('%d %b')}"

    html = f"""
    <div style="font-family:sans-serif;max-width:620px;margin:0 auto">
      <div style="background:#0b3b46;padding:28px 24px;border-radius:12px 12px 0 0">
        <h2 style="color:white;margin:0;font-size:22px">📦 Daily Sales Summary</h2>
        <p style="color:#94a3b8;margin:4px 0 0;font-size:14px">{date_str}</p>
      </div>

      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">

        <!-- Stats grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px">
          <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#16a34a">{revenue}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">Revenue</div>
          </div>
          <div style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#2563eb">{s['total_orders']}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">Orders</div>
          </div>
          <div style="background:#fef2f2;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#dc2626">{s['cancelled']}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">Cancelled</div>
          </div>
        </div>

        <!-- Fulfillment split -->
        <div style="display:flex;gap:8px;margin-bottom:24px">
          <span style="background:#dbeafe;color:#1d4ed8;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600">
            FBA: {s['fba_count']} orders
          </span>
          <span style="background:#e0e7ff;color:#4338ca;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600">
            FBM: {s['fbm_count']} orders
          </span>
        </div>

        <!-- Top SKUs -->
        <h3 style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">
          Top SKUs by Units
        </h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:9px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">SKU</th>
              <th style="padding:9px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Product</th>
              <th style="padding:9px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">Units</th>
            </tr>
          </thead>
          <tbody>
            {sku_rows_html if s['top_skus'] else no_skus_html}
          </tbody>
        </table>

        {low_stock_html}

        <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center">
          RBS Amazon Automation · <a href="https://mad-mars-next.vercel.app/dashboard/amazon" style="color:#0b3b46">View Dashboard</a>
        </p>
      </div>
    </div>"""

    skus_text = sku_rows_text or "  No orders\n"
    text = (
        f"Daily Sales Summary — {date_str}\n\n"
        f"Revenue  : {revenue}\n"
        f"Orders   : {s['total_orders']} (FBA: {s['fba_count']}, FBM: {s['fbm_count']})\n"
        f"Cancelled: {s['cancelled']}\n\n"
        f"Top SKUs:\n{skus_text}\n"
        f"Low stock: {s['low_stock']} SKUs\n"
    )

    return subject, html, text


def run_summary(date: datetime | None = None) -> bool:
    """
    Send the daily summary email.

    Args:
        date: The day to summarise. Defaults to yesterday.
    """
    if date is None:
        date = datetime.now(timezone.utc) - timedelta(days=1)

    logger.info("Building daily summary for %s", date.strftime("%Y-%m-%d"))
    summary = _get_summary(date)
    subject, html, text = _build_email(summary)
    sent = send_email(subject, html, text)

    if sent:
        logger.info("Daily summary sent.")
    return sent


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    # Pass a date like: python -m reports.daily_summary 2026-06-25
    if len(sys.argv) > 1:
        d = datetime.strptime(sys.argv[1], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    else:
        d = datetime.now(timezone.utc) - timedelta(days=1)

    run_summary(d)
