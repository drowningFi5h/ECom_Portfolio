"""
One-time script to exchange an OAuth authorization code for a refresh token.
Run this after going through the seller authorization flow:

  python auth/exchange_code.py <spapi_oauth_code>
"""

import sys
import requests
from config import amazon


def exchange(auth_code: str) -> None:
    resp = requests.post(
        "https://api.amazon.com/auth/o2/token",
        data={
            "grant_type":   "authorization_code",
            "code":          auth_code,
            "client_id":     amazon.client_id,
            "client_secret": amazon.client_secret,
        },
        timeout=10,
    )

    data = resp.json()

    if "refresh_token" not in data:
        print("Exchange failed:", data)
        sys.exit(1)

    print("\nSuccess! Add this to amazon-automation/.env:\n")
    print(f"AMAZON_REFRESH_TOKEN={data['refresh_token']}\n")
    print(f"(Access token expires in {data.get('expires_in', 3600)}s — refresh token is permanent)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python auth/exchange_code.py <spapi_oauth_code>")
        sys.exit(1)
    exchange(sys.argv[1])
