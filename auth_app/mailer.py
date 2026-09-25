"""Email OTP delivery.

Development default is a console transport that prints the code (and appends it
to ``auth_app/outbox.log``) so the flow is testable without an SMTP server.
Set ``SMTP_HOST`` (plus optional ``SMTP_PORT``, ``SMTP_USER``, ``SMTP_PASSWORD``,
``SMTP_FROM``, ``SMTP_STARTTLS``) to send real mail through SMTP.
"""

from __future__ import annotations

import os
import smtplib
import ssl
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Dict, Optional, Tuple

OUTBOX_PATH = Path(__file__).resolve().parent / "outbox.log"


def _smtp_config() -> Optional[Dict[str, object]]:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        return None
    return {
        "host": host,
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", "").strip() or None,
        "password": os.environ.get("SMTP_PASSWORD", "").strip() or None,
        "sender": os.environ.get("SMTP_FROM", "").strip() or os.environ.get("SMTP_USER", "").strip() or "no-reply@localhost",
        "starttls": os.environ.get("SMTP_STARTTLS", "1").strip() not in ("0", "false", "False"),
    }


def transport_name() -> str:
    return "smtp" if _smtp_config() else "console"


def build_message(to_email: str, code: str, purpose: str, sender: str) -> EmailMessage:
    labels = {
        "signup": "confirm your new account",
        "login": "complete your sign-in",
        "reset": "reset your password",
        "link": "link an additional sign-in method",
    }
    action = labels.get(purpose, purpose.replace("_", " "))

    message = EmailMessage()
    message["Subject"] = f"Your verification code: {code}"
    message["From"] = sender
    message["To"] = to_email
    message.set_content(
        "\n".join(
            [
                f"Use this one-time code to {action}:",
                "",
                f"    {code}",
                "",
                "The code expires in 10 minutes and can only be used once.",
                "If you did not request this code you can ignore this email.",
            ]
        )
    )
    message.add_alternative(
        f"""\
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f6f8fc;padding:24px">
  <div style="max-width:460px;margin:auto;background:#ffffff;border-radius:14px;
              box-shadow:0 8px 24px rgba(15,23,42,.08);padding:28px;text-align:center">
    <h2 style="margin:0 0 8px;color:#1f4e78">Verification code</h2>
    <p style="color:#475569;margin:0 0 18px">Use this code to {action}.</p>
    <div style="font-size:34px;letter-spacing:8px;font-weight:700;color:#1f4e78;
                background:#eef4fb;border-radius:10px;padding:14px 0">{code}</div>
    <p style="color:#64748b;font-size:13px;margin:18px 0 0">
      Expires in 10 minutes &middot; single use
    </p>
  </div>
</body></html>""",
        subtype="html",
    )
    return message


def send_otp_email(to_email: str, code: str, purpose: str = "signup") -> Tuple[bool, str]:
    """Deliver ``code`` to ``to_email``.

    Returns ``(sent, detail)``; in console mode ``sent`` is True and the detail
    explains where the code was written so local development can proceed.
    """
    config = _smtp_config()

    if not config:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
        line = f"{stamp}\t{to_email}\t{purpose}\t{code}\n"
        try:
            with OUTBOX_PATH.open("a", encoding="utf-8") as handle:
                handle.write(line)
        except OSError as exc:
            return False, f"Could not append to outbox: {exc}"

        print(f"[DEV MAIL] OTP for {to_email} ({purpose}) is: {code}")
        return True, f"Console transport: code written to {OUTBOX_PATH.name}."

    message = build_message(to_email, code, purpose, str(config["sender"]))
    try:
        with smtplib.SMTP(str(config["host"]), int(config["port"]), timeout=20) as server:
            server.ehlo()
            if config["starttls"]:
                context = ssl.create_default_context()
                server.starttls(context=context)
                server.ehlo()
            if config["user"] and config["password"]:
                server.login(str(config["user"]), str(config["password"]))
            server.send_message(message)
    except Exception as exc:  # noqa: BLE001 - surface any transport failure to caller
        return False, f"SMTP delivery failed: {exc}"

    return True, f"Verification code sent to {to_email}."
