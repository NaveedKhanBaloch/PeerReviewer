"""Transactional email helpers."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from core.config import settings

logger = logging.getLogger(__name__)


def send_verification_email(to_email: str, full_name: str | None, verification_url: str) -> None:
    """Send an account verification email, or log the link in development."""
    subject = "Verify your AI Research Reviewer account"
    greeting = full_name or "Researcher"
    body = (
        f"Hello {greeting},\n\n"
        "Please verify your AI Research Reviewer account before signing in:\n\n"
        f"{verification_url}\n\n"
        "If you did not create this account, you can ignore this email.\n"
    )

    if not settings.SMTP_HOST:
        logger.warning("Email verification link for %s: %s", to_email, verification_url)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)
