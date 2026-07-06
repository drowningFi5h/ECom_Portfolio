"""
Gmail SMTP email sender — used by all alert and report modules.

Setup (one-time):
  1. Enable 2FA on your Gmail account
  2. Google Account → Security → App Passwords → create one for "Mail"
  3. Add to amazon-automation/.env:
       SMTP_USER=your-gmail@gmail.com
       SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx   (16-char app password)
       NOTIFY_EMAIL=tausifmdansari1@gmail.com
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import notifications as cfg

logger = logging.getLogger(__name__)


def send_email(subject: str, body_html: str, body_text: str = "") -> bool:
    """
    Send an HTML email via Gmail SMTP.

    Returns True on success, False on failure (never raises).
    """
    if not cfg.smtp_user or not cfg.smtp_password:
        logger.warning("Email not configured — set SMTP_USER and SMTP_PASSWORD in .env")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"RBS Automation <{cfg.smtp_user}>"
    msg["To"]      = cfg.notify_email

    if body_text:
        msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    try:
        with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(cfg.smtp_user, cfg.smtp_password)
            server.sendmail(cfg.smtp_user, cfg.notify_email, msg.as_string())
        logger.info("Email sent: %s → %s", subject, cfg.notify_email)
        return True
    except Exception as e:
        logger.error("Email failed: %s", e)
        return False
