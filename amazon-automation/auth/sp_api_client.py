"""
SP-API authentication module.

Handles LWA (Login with Amazon) token refresh and returns
ready-to-use sp-api client objects for any API section.

Usage:
    from auth import get_client
    orders_api = get_client("Orders")
    response = orders_api.get_orders(MarketplaceIds=[...])
"""

import logging
from typing import Any

import requests
from sp_api.api import Orders, Inventories, Reports, Products, Catalog, Notifications, Solicitations, Finances, ProductFees
from sp_api.base import Marketplaces, SellingApiException

from config import amazon

logger = logging.getLogger(__name__)

MARKETPLACE_MAP: dict[str, Marketplaces] = {
    "A21TJRUUN4KGV": Marketplaces.IN,
    "ATVPDKIKX0DER": Marketplaces.US,
    "A1F83G8C2ARO7P": Marketplaces.UK,
    "A33AVAJ2PDY3EV": Marketplaces.TR,
    "A2EUQ1WTGCTBG2": Marketplaces.CA,
    "A1AM78C64UM0Y8": Marketplaces.MX,
}

# 2.x only needs LWA credentials — no AWS keys required for Seller Central
CREDENTIALS: dict[str, str] = {
    "lwa_app_id": amazon.client_id,
    "lwa_client_secret": amazon.client_secret,
    "refresh_token": amazon.refresh_token,
}

SECTION_MAP: dict[str, Any] = {
    "Orders":         Orders,
    "Inventories":    Inventories,
    "Reports":        Reports,
    "Products":       Products,      # was "Pricing" in 0.x
    "ProductFees":    ProductFees,   # getMyFeesEstimateForSKU
    "Catalog":        Catalog,
    "Notifications":  Notifications,
    "Solicitations":  Solicitations,
    "Finances":       Finances,
}


def _get_marketplace() -> Marketplaces:
    mp = MARKETPLACE_MAP.get(amazon.marketplace_id)
    if mp is None:
        raise ValueError(
            f"Unknown marketplace_id '{amazon.marketplace_id}'. "
            f"Add it to MARKETPLACE_MAP in auth/sp_api_client.py"
        )
    return mp


def get_client(api_section: str) -> Any:
    """
    Return an sp-api client for the requested API section.

    Args:
        api_section: One of 'Orders', 'Inventories', 'Reports',
                     'Products', 'Catalog', 'Notifications'
    """
    cls = SECTION_MAP.get(api_section)
    if cls is None:
        raise ValueError(
            f"Unknown api_section '{api_section}'. "
            f"Available: {list(SECTION_MAP.keys())}"
        )

    return cls(credentials=CREDENTIALS, marketplace=_get_marketplace())


def refresh_access_token() -> dict[str, Any]:
    """
    Manually exchange the refresh token for a short-lived access token.
    Useful for debugging or custom HTTP calls outside the sp-api library.
    """
    resp = requests.post(
        "https://api.amazon.com/auth/o2/token",
        data={
            "grant_type":    "refresh_token",
            "client_id":     amazon.client_id,
            "client_secret": amazon.client_secret,
            "refresh_token": amazon.refresh_token,
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()

    if "access_token" not in data:
        raise RuntimeError(f"Token refresh failed: {data}")

    logger.info("Access token refreshed — expires in %ds", data.get("expires_in", 3600))
    return data


def test_connection() -> bool:
    """
    Smoke-test the connection by fetching orders from the last 30 days.
    """
    from datetime import datetime, timedelta, timezone

    env_label = "SANDBOX" if amazon.sandbox else "PRODUCTION"
    print(f"Testing SP-API connection [{env_label}]...")

    try:
        client = get_client("Orders")
        created_after = (
            datetime.now(timezone.utc) - timedelta(days=30)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

        resp = client.get_orders(
            MarketplaceIds=[amazon.marketplace_id],
            CreatedAfter=created_after,
        )

        orders = resp.payload.get("Orders", [])
        print(f"Connection successful — {len(orders)} orders found in last 30 days")

        if orders:
            sample = orders[0]
            print(
                f"  Sample: {sample.get('AmazonOrderId')} | "
                f"Status: {sample.get('OrderStatus')} | "
                f"Date: {sample.get('PurchaseDate', '')[:10]}"
            )

        return True

    except SellingApiException as e:
        print(f"SP-API error: {e.code} — {e.message}")
        return False
    except Exception as e:
        print(f"Connection failed: {e}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    test_connection()
