"""SQLite Database management for users, licenses, and OTP records."""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DB_PATH = Path(os.environ.get("AUTH_DB_PATH", Path(__file__).resolve().parent / "auth.db"))


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=15)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_db()
    with conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT,
                email_verified INTEGER DEFAULT 0,
                storage_pref TEXT DEFAULT 'browser',
                role TEXT DEFAULT 'user',
                avatar_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS oauth_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                provider_user_id TEXT NOT NULL,
                email TEXT NOT NULL,
                display_name TEXT,
                avatar_url TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(provider, provider_user_id)
            );

            CREATE TABLE IF NOT EXISTS otp_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                code_hash TEXT NOT NULL,
                purpose TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                attempts_left INTEGER DEFAULT 3,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                license_key TEXT UNIQUE NOT NULL,
                key_id TEXT NOT NULL,
                licensee TEXT NOT NULL,
                tier TEXT NOT NULL,
                issued_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                features TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
            CREATE INDEX IF NOT EXISTS idx_oauth_lookup ON oauth_accounts(provider, provider_user_id);
            """
        )
    conn.close()


def create_user(
    user_id: str,
    email: str,
    name: str,
    password_hash: Optional[str] = None,
    email_verified: bool = False,
    storage_pref: str = "browser",
    avatar_url: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT INTO users (id, email, name, password_hash, email_verified, storage_pref, avatar_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                email.lower().strip(),
                name.strip(),
                password_hash,
                1 if email_verified else 0,
                storage_pref,
                avatar_url,
                now,
                now,
            ),
        )
    conn.close()
    return get_user_by_id(user_id)


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
    conn.close()
    return dict(row) if row else None


def mark_email_verified(user_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    with conn:
        conn.execute(
            "UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?",
            (now, user_id),
        )
    conn.close()


def update_user_storage_pref(user_id: str, pref: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    with conn:
        conn.execute(
            "UPDATE users SET storage_pref = ?, updated_at = ? WHERE id = ?",
            (pref, now, user_id),
        )
    conn.close()



def link_oauth_account(
    user_id: str,
    provider: str,
    provider_user_id: str,
    email: str,
    display_name: str,
    avatar_url: Optional[str] = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO oauth_accounts
              (user_id, provider, provider_user_id, email, display_name, avatar_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                provider,
                str(provider_user_id),
                email.lower().strip(),
                display_name,
                avatar_url,
                now,
            ),
        )
    conn.close()


def get_user_by_oauth(provider: str, provider_user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute(
        """
        SELECT u.* FROM users u
        JOIN oauth_accounts oa ON u.id = oa.user_id
        WHERE oa.provider = ? AND oa.provider_user_id = ?
        """,
        (provider, str(provider_user_id)),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_oauth_links(user_id: str) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        "SELECT provider, email, display_name, created_at FROM oauth_accounts WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]



def save_user_license(
    user_id: Optional[str],
    license_key: str,
    key_id: str,
    licensee: str,
    tier: str,
    issued_at: str,
    expires_at: str,
    features: List[str],
) -> None:
    """Persist a validated license key record for auditing purposes."""
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO licenses
              (user_id, license_key, key_id, licensee, tier, issued_at, expires_at, features, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (
                user_id,
                license_key,
                key_id,
                licensee,
                tier,
                issued_at,
                expires_at,
                json.dumps(features),
                now,
            ),
        )
    conn.close()


def get_active_license_for_user(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM licenses WHERE user_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        return None
    record = dict(row)
    raw_features = record.get("features")
    record["features"] = json.loads(raw_features) if isinstance(raw_features, str) else raw_features
    return record



def save_otp(email: str, code_hash: str, purpose: str, expires_at: str) -> None:
    """Store a hashed OTP code for an email address."""
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    with conn:
        conn.execute(
            """
            INSERT INTO otp_codes (email, code_hash, purpose, expires_at, attempts_left, created_at)
            VALUES (?, ?, ?, ?, 3, ?)
            """,
            (email.lower().strip(), code_hash, purpose, expires_at, now),
        )
    conn.close()


def verify_and_consume_otp(email: str, code_hash: str, purpose: str) -> Tuple[bool, str]:
    """Validate an OTP guess, decrementing remaining attempts.

    Expired or exhausted codes are rejected; a correct code is consumed so it
    cannot be replayed.
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    row = conn.execute(
        """
        SELECT id, code_hash, expires_at, attempts_left FROM otp_codes
        WHERE email = ? AND purpose = ?
        ORDER BY id DESC LIMIT 1
        """,
        (email.lower().strip(), purpose),
    ).fetchone()

    if not row:
        conn.close()
        return False, "No OTP found. Please request a new code."

    record_id = row["id"]
    stored_hash = row["code_hash"]
    expires_at = row["expires_at"]
    attempts_left = row["attempts_left"]

    if attempts_left <= 0:
        conn.close()
        return False, "This OTP exceeded the maximum verification attempts. Request a new code."

    if now > expires_at:
        conn.close()
        return False, "This OTP has expired. Please request a new code."

    if stored_hash != code_hash:
        remaining = attempts_left - 1
        with conn:
            conn.execute("UPDATE otp_codes SET attempts_left = ? WHERE id = ?", (remaining, record_id))
        conn.close()
        return False, f"Incorrect OTP code. {remaining} attempt(s) remaining."

    with conn:
        conn.execute("DELETE FROM otp_codes WHERE id = ?", (record_id,))
    conn.close()
    return True, "OTP verified successfully."


def purge_expired_otps() -> int:
    """Delete expired OTP rows and return the number of removed records."""
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    with conn:
        cursor = conn.execute("DELETE FROM otp_codes WHERE expires_at < ?", (now,))
        removed = cursor.rowcount
    conn.close()
    return removed


init_db()
