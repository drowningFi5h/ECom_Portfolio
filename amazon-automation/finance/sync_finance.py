"""
Finance sync — fetches SP-API financial events and settlement groups.

Tables populated:
  amazon_settlements       — one row per 14-day payout cycle, including
                             service fees, adjustments, and other charges
  amazon_financial_events  — per-order, per-SKU revenue + fee breakdown
                             (shipment and refund events only)

Non-order events (service fees, adjustments, chargebacks, debt recovery)
are aggregated as totals on the settlement row so reconciliation works:
  shipments + refunds + service_fees + adjustments + other_amount ≈ total_amount

Sync strategy:
  - Fetches settlement groups for the last 180 days
  - Skips groups already Closed in our DB (immutable — no new events possible)
  - Re-syncs Open groups on every run (new events may have arrived)

Run:
    python -m finance.sync_finance
"""

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from auth.sp_api_client import get_client
from db.database import get_supabase

logger = logging.getLogger(__name__)


# ── Money helpers ──────────────────────────────────────────────────────────────

def _money(obj: Any) -> float:
    if not obj:
        return 0.0
    return float(obj.get("CurrencyAmount") or 0)


def _fee_breakdown(fee_list: list) -> dict:
    out = {
        "referral_fee":     0.0,
        "variable_closing": 0.0,
        "fixed_closing":    0.0,
        "other_fees":       0.0,
    }
    for fee in (fee_list or []):
        t   = fee.get("FeeType", "")
        amt = _money(fee.get("FeeAmount") or fee.get("FeeAmount"))
        if t == "ReferralFee":
            out["referral_fee"] += amt
        elif t == "VariableClosingFee":
            out["variable_closing"] += amt
        elif t in ("FixedClosingFee", "ClosingFee"):
            out["fixed_closing"] += amt
        else:
            out["other_fees"] += amt
    return out


def _promo_total(promo_list: list) -> float:
    total = 0.0
    for p in (promo_list or []):
        for item in (p.get("PromotionAmountList") or []):
            total += _money(item.get("PromotionAmount"))
    return total


# ── Settlement groups ──────────────────────────────────────────────────────────

def _sync_settlements(client, sb) -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(days=180)).strftime("%Y-%m-%dT%H:%M:%SZ")
    groups: list[dict] = []
    next_token = None

    while True:
        if next_token:
            resp = client.list_financial_event_groups(NextToken=next_token)
        else:
            resp = client.list_financial_event_groups(
                FinancialEventGroupStartedAfter=since,
                MaxResultsPerPage=100,
            )
        payload    = resp.payload or {}
        batch      = payload.get("FinancialEventGroupList") or []
        groups.extend(batch)
        next_token = payload.get("NextToken")
        if not next_token:
            break
        time.sleep(0.5)

    if not groups:
        logger.info("No settlement groups found in last 180 days")
        return []

    rows = [
        {
            "group_id":             g.get("FinancialEventGroupId"),
            "processing_status":    g.get("ProcessingStatus"),
            "fund_transfer_status": g.get("FundTransferStatus"),
            "period_start":         g.get("FinancialEventGroupStart"),
            "period_end":           g.get("FinancialEventGroupEnd"),
            "fund_transfer_date":   g.get("FundTransferDate"),
            "total_amount":         _money(g.get("OriginalTotal")),
            "currency":             (g.get("OriginalTotal") or {}).get("CurrencyCode", "INR"),
        }
        for g in groups
    ]
    sb.table("amazon_settlements").upsert(rows, on_conflict="group_id").execute()
    logger.info("Upserted %d settlement groups", len(rows))
    return groups


# ── Shipment events ────────────────────────────────────────────────────────────

def _parse_shipments(events: dict, group_id: str) -> list[dict]:
    rows: list[dict] = []
    for shipment in (events.get("ShipmentEventList") or []):
        order_id   = shipment.get("AmazonOrderId", "")
        posted_raw = shipment.get("PostedDate")

        for item in (shipment.get("ShipmentItemList") or []):
            sku = item.get("SellerSKU", "")
            qty = int(item.get("QuantityShipped") or 1)

            principal = shipping_charge = 0.0
            for ch in (item.get("ItemChargeList") or []):
                t   = ch.get("ChargeType", "")
                amt = _money(ch.get("ChargeAmount"))
                if t == "Principal":
                    principal += amt
                elif t == "ShippingCharge":
                    shipping_charge += amt

            fees   = _fee_breakdown(item.get("ItemFeeList") or [])
            promos = _promo_total(item.get("PromotionList") or [])

            net_amazon = (
                principal + shipping_charge + promos
                + fees["referral_fee"]
                + fees["variable_closing"]
                + fees["fixed_closing"]
                + fees["other_fees"]
            )

            rows.append({
                "group_id":         group_id,
                "amazon_order_id":  order_id,
                "seller_sku":       sku,
                "event_type":       "shipment",
                "posted_date":      posted_raw,
                "quantity":         qty,
                "principal":        round(principal, 2),
                "shipping_charge":  round(shipping_charge, 2),
                **{k: round(v, 2) for k, v in fees.items()},
                "promotion_amount": round(promos, 2),
                "net_amazon":       round(net_amazon, 2),
            })
    return rows


# ── Refund events ──────────────────────────────────────────────────────────────

def _parse_refunds(events: dict, group_id: str) -> list[dict]:
    rows: list[dict] = []
    for refund in (events.get("RefundEventList") or []):
        order_id   = refund.get("AmazonOrderId", "")
        posted_raw = refund.get("PostedDate")

        for item in (refund.get("ShipmentItemAdjustmentList") or []):
            sku = item.get("SellerSKU", "")
            qty = int(item.get("QuantityShipped") or 1)

            principal = 0.0
            for ch in (item.get("ItemChargeAdjustmentList") or []):
                if ch.get("ChargeType") == "Principal":
                    principal += _money(ch.get("ChargeAmount"))

            fees       = _fee_breakdown(item.get("ItemFeeAdjustmentList") or [])
            net_amazon = (
                principal
                + fees["referral_fee"]
                + fees["variable_closing"]
                + fees["fixed_closing"]
                + fees["other_fees"]
            )

            rows.append({
                "group_id":         group_id,
                "amazon_order_id":  order_id,
                "seller_sku":       sku,
                "event_type":       "refund",
                "posted_date":      posted_raw,
                "quantity":         qty,
                "principal":        round(principal, 2),
                "shipping_charge":  0.0,
                **{k: round(v, 2) for k, v in fees.items()},
                "promotion_amount": 0.0,
                "net_amazon":       round(net_amazon, 2),
            })
    return rows


# ── Non-order aggregates (service fees, adjustments, chargebacks) ──────────────

def _sum_service_fees(events: dict) -> float:
    """Monthly subscription, inventory placement, long-term storage, etc."""
    total = 0.0
    for event in (events.get("ServiceFeeEventList") or []):
        for fee in (event.get("FeeList") or []):
            total += _money(fee.get("FeeAmount"))
    return total


def _sum_adjustments(events: dict) -> float:
    """FBA inventory reimbursements, price corrections, SAFE-T claims."""
    total = 0.0
    for adj in (events.get("AdjustmentEventList") or []):
        total += _money(adj.get("AdjustmentAmount"))
        # Some adjustments carry item-level amounts too
        for item in (adj.get("AdjustmentItemList") or []):
            total += _money(item.get("TotalAmount"))
    return total


def _sum_chargebacks(events: dict) -> float:
    """A-to-z guarantee claims and chargeback events."""
    total = 0.0
    for cb in (events.get("ChargebackEventList") or []):
        for charge in (cb.get("ChargeList") or []):
            total += _money(charge.get("ChargeAmount"))
    return total


def _sum_other(events: dict) -> float:
    """Debt recovery, loan servicing, coupon payments, and any remainder."""
    total = 0.0
    for event in (events.get("DebtRecoveryEventList") or []):
        for item in (event.get("DebtRecoveryItemList") or []):
            total += _money(item.get("RecoveryAmount"))
    for event in (events.get("LoanServicingEventList") or []):
        total += _money(event.get("LoanAmount"))
    for event in (events.get("CouponPaymentEventList") or []):
        total += _money(event.get("TotalAmount"))
    return total


# ── Events for one settlement group ───────────────────────────────────────────

def _sync_group_events(client, sb, group_id: str) -> dict:
    """
    Fetch all financial events for one group.
    Returns a summary dict with event count and non-order fee totals.
    """
    all_rows:     list[dict] = []
    service_fees  = 0.0
    adjustments   = 0.0
    chargebacks   = 0.0
    other_amount  = 0.0
    next_token    = None

    while True:
        if next_token:
            resp = client.list_financial_events_by_group_id(
                event_group_id=group_id,
                NextToken=next_token,
            )
        else:
            resp = client.list_financial_events_by_group_id(
                event_group_id=group_id,
                MaxResultsPerPage=100,
            )

        payload = (resp.payload or {}).get("FinancialEvents") or {}

        # Order-level events → stored as rows
        all_rows.extend(_parse_shipments(payload, group_id))
        all_rows.extend(_parse_refunds(payload, group_id))

        # Non-order events → aggregated as totals on the settlement
        service_fees += _sum_service_fees(payload)
        adjustments  += _sum_adjustments(payload)
        chargebacks  += _sum_chargebacks(payload)
        other_amount += _sum_other(payload)

        next_token = (resp.payload or {}).get("NextToken")
        if not next_token:
            break
        time.sleep(0.5)

    # Upsert order-level events
    if all_rows:
        sb.table("amazon_financial_events").upsert(
            all_rows,
            on_conflict="group_id,amazon_order_id,seller_sku,event_type",
        ).execute()

    # Write non-order totals back onto the settlement row
    non_order_total = round(service_fees + adjustments + chargebacks + other_amount, 2)
    sb.table("amazon_settlements").update({
        "service_fees": round(service_fees, 2),
        "adjustments":  round(adjustments,  2),
        "other_amount": round(chargebacks + other_amount, 2),
    }).eq("group_id", group_id).execute()

    logger.debug(
        "Group %s — service_fees=%.2f adjustments=%.2f other=%.2f",
        group_id, service_fees, adjustments, chargebacks + other_amount,
    )

    return {
        "events":        len(all_rows),
        "service_fees":  service_fees,
        "adjustments":   adjustments,
        "other_amount":  chargebacks + other_amount,
        "non_order_net": non_order_total,
    }


# ── Main entry point ───────────────────────────────────────────────────────────

def run_sync() -> str:
    client = get_client("Finances")
    sb     = get_supabase()

    groups = _sync_settlements(client, sb)
    if not groups:
        return "0 settlements, 0 events"

    # Groups already closed before this run — skip their events (immutable)
    already_done = {
        r["group_id"]
        for r in (
            sb.table("amazon_settlements")
              .select("group_id")
              .eq("processing_status", "Closed")
              .execute().data or []
        )
    }
    this_run_ids = {g.get("FinancialEventGroupId") for g in groups}
    skip = already_done - this_run_ids

    total_events = 0
    for g in groups:
        gid    = g.get("FinancialEventGroupId")
        status = g.get("ProcessingStatus", "")

        if gid in skip:
            logger.debug("Skipping closed group %s", gid)
            continue

        logger.info("Syncing group %s (%s)...", gid, status)
        try:
            result = _sync_group_events(client, sb, gid)
            total_events += result["events"]
            logger.info(
                "  ✔ %d events | service_fees=%.2f | adjustments=%.2f | other=%.2f",
                result["events"], result["service_fees"],
                result["adjustments"], result["other_amount"],
            )
            time.sleep(1.0)
        except Exception as exc:
            logger.error("  ✘ group %s failed: %s", gid, exc)

    return f"{len(groups)} settlements, {total_events} order events synced"


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    print(run_sync())
