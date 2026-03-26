import httpx
import logging
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────── Telegram ───────────────────────────

async def send_telegram(message: str, chat_id: Optional[str] = None) -> bool:
    """Send a Telegram message via Bot API."""
    token = settings.TELEGRAM_BOT_TOKEN
    chat = chat_id or settings.TELEGRAM_CHAT_ID
    if not token or not chat:
        logger.warning("Telegram not configured — skipping alert.")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat, "text": message, "parse_mode": "HTML"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            logger.info("Telegram alert sent.")
            return True
    except Exception as e:
        logger.error("Telegram send failed: %s", e)
        return False


def send_telegram_sync(message: str, chat_id: Optional[str] = None) -> bool:
    """Synchronous version for use inside RQ workers."""
    token = settings.TELEGRAM_BOT_TOKEN
    chat = chat_id or settings.TELEGRAM_CHAT_ID
    if not token or not chat:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat, "text": message, "parse_mode": "HTML"}
    try:
        resp = httpx.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error("Telegram sync send failed: %s", e)
        return False


# ─────────────────────────── Twilio SMS ───────────────────────────

def send_sms(message: str) -> bool:
    """Send an SMS via Twilio REST API."""
    sid = settings.TWILIO_ACCOUNT_SID
    auth = settings.TWILIO_AUTH_TOKEN
    from_num = settings.TWILIO_FROM_NUMBER
    to_num = settings.TWILIO_TO_NUMBER
    if not all([sid, auth, from_num, to_num]):
        logger.warning("Twilio not configured — skipping SMS.")
        return False
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    data = {"From": from_num, "To": to_num, "Body": message}
    try:
        resp = httpx.post(url, data=data, auth=(sid, auth), timeout=10)
        resp.raise_for_status()
        logger.info("SMS sent via Twilio.")
        return True
    except Exception as e:
        logger.error("Twilio SMS failed: %s", e)
        return False


# ─────────────────────────── Unified Alert ───────────────────────────

def alert(message: str, level: str = "info") -> None:
    """
    Send notification to all configured channels.
    level: info | warning | error | critical
    """
    emoji = {"info": "ℹ️", "warning": "⚠️", "error": "❌", "critical": "🚨"}.get(level, "ℹ️")
    full_message = f"{emoji} <b>GuardianLayer [{level.upper()}]</b>\n{message}"
    send_telegram_sync(full_message)
    # SMS only for error/critical to avoid spam
    if level in ("error", "critical"):
        send_sms(f"[GuardianLayer {level.upper()}] {message}")
