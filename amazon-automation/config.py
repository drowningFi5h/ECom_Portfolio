"""Central configuration loader — all modules import from here."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from amazon-automation/ directory
load_dotenv(Path(__file__).parent / ".env")


class AmazonConfig:
    client_id: str = os.environ["AMAZON_CLIENT_ID"]
    client_secret: str = os.environ["AMAZON_CLIENT_SECRET"]
    refresh_token: str = os.environ["AMAZON_REFRESH_TOKEN"]
    # Merchant Token — used in SP-API for reports, feeds, shipments
    merchant_id: str = os.environ["AMAZON_MERCHANT_ID"]
    # Seller ID — marketplace profile identifier
    seller_id: str = os.environ["AMAZON_SELLER_ID"]
    marketplace_id: str = os.environ["AMAZON_MARKETPLACE_ID"]
    # Sandbox mode — uses test endpoints and mock data
    sandbox: bool = os.getenv("AMAZON_SANDBOX", "false").lower() == "true"


class SupabaseConfig:
    url: str = os.environ["SUPABASE_URL"]
    service_role_key: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


class NotificationConfig:
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    notify_email: str = os.getenv("NOTIFY_EMAIL", "")

    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_whatsapp_from: str = os.getenv("TWILIO_WHATSAPP_FROM", "")
    notify_whatsapp: str = os.getenv("NOTIFY_WHATSAPP", "")


class AppConfig:
    low_stock_threshold: int = int(os.getenv("LOW_STOCK_THRESHOLD", "10"))


amazon = AmazonConfig()
supabase_cfg = SupabaseConfig()
notifications = NotificationConfig()
app = AppConfig()
