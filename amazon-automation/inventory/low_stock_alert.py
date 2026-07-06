"""
Low stock alert — emails you when any FBA SKU drops below threshold.

Deduplicates: won't re-alert for the same SKU within 24 hours.

Run manually:
    python -m inventory.low_stock_alert

Or call from scheduler:
    from inventory.low_stock_alert import run_alert
    run_alert()
"""

import logging
from datetime import datetime, timedelta, timezone

from config import app as app_cfg, notifications as notif_cfg
from db.database import get_supabase
from notifications.email import send_email

logger = logging.getLogger(__name__)

ALERT_COOLDOWN_HOURS = 24


def _already_alerted(sku: str) -> bool:
    """Return True if we already sent a low-stock alert for this SKU in the last 24h."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=ALERT_COOLDOWN_HOURS)).isoformat()
    result = (
        get_supabase()
        .from_("amazon_alert_log")
        .select("id")
        .eq("alert_type", "low_stock")
        .eq("reference", sku)
        .gte("sent_at", cutoff)
        .limit(1)
        .execute()
    )
    return len(result.data) > 0


def _log_alert(sku: str) -> None:
    get_supabase().from_("amazon_alert_log").insert({
        "alert_type": "low_stock",
        "reference":  sku,
        "sent_at":    datetime.now(timezone.utc).isoformat(),
    }).execute()


def _build_email(items: list[dict]) -> tuple[str, str]:
    threshold = app_cfg.low_stock_threshold
    out_of_stock = [i for i in items if i["fulfillable_qty"] == 0]
    low_stock    = [i for i in items if 0 < i["fulfillable_qty"] <= threshold]

    rows_html = ""
    rows_text = ""

    for item in out_of_stock + low_stock:
        qty   = item["fulfillable_qty"]
        sku   = item["seller_sku"]
        name  = item.get("product_name") or "—"
        color = "#dc2626" if qty == 0 else "#d97706"
        label = "OUT OF STOCK" if qty == 0 else f"{qty} units left"

        rows_html += f"""
        <tr>
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:13px">{sku}</td>
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569">{name[:55]}</td>
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:700;color:{color}">{label}</td>
        </tr>"""

        rows_text += f"  {'❌' if qty == 0 else '⚠️'}  {sku} — {label}\n"

    subject = f"⚠️ Low Stock Alert — {len(items)} SKU{'s' if len(items) > 1 else ''} need attention"

    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0b3b46;padding:24px;border-radius:12px 12px 0 0">
        <h2 style="color:white;margin:0;font-size:20px">⚠️ Low Stock Alert</h2>
        <p style="color:#94a3b8;margin:4px 0 0">RBS Amazon Automation · {datetime.now().strftime('%d %b %Y, %I:%M %p')}</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px">
        <p style="color:#475569;margin-top:0">
          {len(out_of_stock)} SKU(s) are <strong style="color:#dc2626">out of stock</strong> and
          {len(low_stock)} SKU(s) are <strong style="color:#d97706">below {threshold} units</strong>.
          Restock immediately to avoid lost sales.
        </p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:10px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase">SKU</th>
              <th style="padding:10px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase">Product</th>
              <th style="padding:10px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase">Status</th>
            </tr>
          </thead>
          <tbody>{rows_html}</tbody>
        </table>
        <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b">
          <p style="margin:0;font-size:13px;color:#92400e">
            Alert threshold: ≤ {threshold} units. Change <code>LOW_STOCK_THRESHOLD</code> in <code>.env</code> to adjust.
          </p>
        </div>
      </div>
    </div>"""

    text = f"Low Stock Alert — {datetime.now().strftime('%d %b %Y')}\n\n{rows_text}\nThreshold: {threshold} units"

    return subject, html, text


def run_alert() -> dict:
    threshold = app_cfg.low_stock_threshold

    inventory = (
        get_supabase()
        .from_("amazon_inventory")
        .select("seller_sku, product_name, fulfillable_qty")
        .lte("fulfillable_qty", threshold)
        .execute()
    )

    if not inventory.data:
        logger.info("All SKUs above threshold (%d units). No alert needed.", threshold)
        return {"alerted": 0, "skipped": 0}

    to_alert = []
    skipped  = 0

    for item in inventory.data:
        if _already_alerted(item["seller_sku"]):
            logger.info("Skipping %s — alerted within last 24h", item["seller_sku"])
            skipped += 1
        else:
            to_alert.append(item)

    if not to_alert:
        logger.info("All low-stock SKUs already alerted recently.")
        return {"alerted": 0, "skipped": skipped}

    subject, html, text = _build_email(to_alert)
    sent = send_email(subject, html, text)

    if sent:
        for item in to_alert:
            _log_alert(item["seller_sku"])
        logger.info("Low stock alert sent for %d SKUs", len(to_alert))

    return {"alerted": len(to_alert) if sent else 0, "skipped": skipped}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = run_alert()
    print(f"\nAlerted: {result['alerted']} SKUs, Skipped (cooldown): {result['skipped']} SKUs")
