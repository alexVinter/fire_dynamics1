import hashlib
import logging
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.email_verify_token import EmailVerifyToken
from app.models.user import User

logger = logging.getLogger(__name__)

TOKEN_LIFETIME = timedelta(hours=24)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def create_verify_token(db: Session, user_id: int) -> str:
    """Generate a random token, store its SHA-256 hash, return the raw token."""
    db.execute(
        select(EmailVerifyToken)
        .where(EmailVerifyToken.user_id == user_id)
    )
    # invalidate any existing tokens for this user
    for old in db.scalars(select(EmailVerifyToken).where(EmailVerifyToken.user_id == user_id)):
        db.delete(old)

    raw_token = secrets.token_urlsafe(32)
    record = EmailVerifyToken(
        user_id=user_id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + TOKEN_LIFETIME,
    )
    db.add(record)
    db.flush()
    return raw_token


def verify_token(db: Session, raw_token: str) -> User | None:
    """Validate token, mark email as verified, delete token. Returns user or None."""
    token_hash = _hash_token(raw_token)
    record = db.scalars(
        select(EmailVerifyToken).where(EmailVerifyToken.token_hash == token_hash)
    ).first()

    if record is None:
        return None
    if record.expires_at < datetime.now(timezone.utc):
        db.delete(record)
        db.flush()
        return None

    user = db.get(User, record.user_id)
    if user is None:
        db.delete(record)
        db.flush()
        return None

    user.email_verified = True
    db.delete(record)
    db.flush()
    return user


def send_verify_email(email: str, raw_token: str) -> None:
    """Send verification email via SMTP if configured, otherwise log the link."""
    base_url = os.environ.get("APP_BASE_URL", "http://localhost:5173")
    link = f"{base_url}/verify-email?token={raw_token}"

    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user or "noreply@example.com")

    if not smtp_host or not smtp_user:
        logger.info("SMTP not configured — verification link for %s:\n  %s", email, link)
        return

    msg = MIMEText(
        f"Подтвердите email, перейдя по ссылке:\n\n{link}\n\nСсылка действительна 24 часа.",
        "plain",
        "utf-8",
    )
    msg["Subject"] = "Динамика Огня — подтверждение email"
    msg["From"] = smtp_from
    msg["To"] = email

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)

    logger.info("Verification email sent to %s", email)
