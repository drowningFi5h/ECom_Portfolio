"""
One-time script to get a production SP-API refresh token.

Steps:
  1. Add http://localhost:8080 as a redirect URI in your SP-API app (Developer Console → your app → edit)
  2. Run:  python auth/get_token.py
  3. Open the printed URL in your browser (while logged into Seller Central)
  4. Click Allow — the script captures the code and prints your refresh token automatically
"""

import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import requests
from config import amazon

REDIRECT_URI = "http://localhost:8080"
STATE = "rbs_auth"
auth_code_holder = {}


class RedirectHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if "spapi_oauth_code" in params:
            auth_code_holder["code"] = params["spapi_oauth_code"][0]
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"""
                <html><body style="font-family:sans-serif;text-align:center;padding-top:60px">
                <h2>Authorization successful!</h2>
                <p>You can close this tab and return to the terminal.</p>
                </body></html>
            """)
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Missing authorization code.")

    def log_message(self, *args):
        pass  # suppress server logs


def exchange(code: str) -> str:
    resp = requests.post(
        "https://api.amazon.com/auth/o2/token",
        data={
            "grant_type":    "authorization_code",
            "code":          code,
            "client_id":     amazon.client_id,
            "client_secret": amazon.client_secret,
            "redirect_uri":  REDIRECT_URI,
        },
        timeout=10,
    )
    data = resp.json()
    if "refresh_token" not in data:
        print("\nToken exchange failed:", data)
        sys.exit(1)
    return data["refresh_token"]


def main():
    auth_url = (
        f"https://sellercentral.amazon.in/apps/authorize/consent"
        f"?application_id={amazon.client_id}"
        f"&state={STATE}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&version=beta"
    )

    print("\n" + "="*60)
    print("SP-API Production Token Setup")
    print("="*60)
    print("\nStep 1: Make sure http://localhost:8080 is added as a")
    print("        redirect URI in your Developer Console app settings.")
    print("\nStep 2: Opening authorization URL in your browser...")
    print(f"\n  {auth_url}\n")
    print("Step 3: Log in to Seller Central if prompted, then click Allow.")
    print("        This window will capture the response automatically.")
    print("="*60 + "\n")

    server = HTTPServer(("localhost", 8080), RedirectHandler)
    thread = threading.Thread(target=server.handle_request)
    thread.start()

    webbrowser.open(auth_url)
    thread.join(timeout=120)

    if "code" not in auth_code_holder:
        print("Timed out waiting for authorization. Try running again.")
        sys.exit(1)

    print("Authorization code received. Exchanging for refresh token...\n")
    refresh_token = exchange(auth_code_holder["code"])

    print("="*60)
    print("SUCCESS! Add this to amazon-automation/.env:")
    print("="*60)
    print(f"\nAMAZON_REFRESH_TOKEN={refresh_token}\n")
    print("="*60)


if __name__ == "__main__":
    main()
