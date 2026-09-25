"""Flask backend for the Mini Excel auth application.

Features
--------
* Email + password sign-up and sign-in
* Email OTP verification (signup confirmation, password reset, login)
* OAuth sign-in with Google, GitHub and Microsoft
* Per-user storage preference (browser / app cloud / google drive)
* Local, offline license key validation with expiry checking

Run::

    python auth_app/app.py           # http://127.0.0.1:5001

Environment variables
---------------------
``AUTH_SECRET``             HMAC key for sessions + license signing
``GOOGLE_CLIENT_ID``        OAuth credentials (same pattern for GitHub/Microsoft)
``GOOGLE_CLIENT_SECRET``
``SMTP_HOST``               optional, enables real email delivery
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import sys
import uuid
from datetime import date, datetime, timezone
from functools import wraps
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from flask import (
    Flask,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import auth_app.db as db  # noqa: E402
import auth_app.mailer as mailer  # noqa: E402
import auth_app.oauth as oauth  # noqa: E402
import auth_app.security as security  # noqa: E402
from auth_app.license import generate_license, validate_license  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent
SECRET_KEY = os.environ.get("AUTH_SECRET", "dev-auth-secret-change-me")
# Name of our own HMAC auth token cookie (separate from Flask's session cookie).
SESSION_COOKIE = "mx-session"

app = Flask(
    __name__,
    static_folder=str(BASE_DIR / "static"),
    template_folder=str(BASE_DIR / "templates"),
)
app.secret_key = SECRET_KEY
app.config.update(
    # Flask's signed cookie is only used for transient flow state (OAuth state,
    # reset proof), so it deliberately gets a different name from SESSION_COOKIE
    # to avoid the two cookies clobbering each other.
    SESSION_COOKIE_NAME="mx-flow",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,
)

STORAGE_PREFERENCES = ("browser", "cloud", "drive")
OAUTH_STATE_TTL = 600



# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def ok(payload: Optional[Dict[str, Any]] = None, status: int = 200):
    body: Dict[str, Any] = {"ok": True}
    if payload:
        body.update(payload)
    return jsonify(body), status


def fail(message: str, status: int = 400, **extra):
    body: Dict[str, Any] = {"ok": False, "error": message}
    body.update(extra)
    return jsonify(body), status


def json_body() -> Dict[str, Any]:
    payload = request.get_json(silent=True)
    return payload if isinstance(payload, dict) else {}


def current_user() -> Optional[Dict[str, Any]]:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    valid, user_id, _reason = security.read_session_token(token, SECRET_KEY)
    if not valid or not user_id:
        return None
    return db.get_user_by_id(user_id)


def login_user(response, user_id: str):
    token = security.create_session_token(user_id, SECRET_KEY)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=security.SESSION_TTL_SECONDS,
        httponly=True,
        samesite="Lax",
    )
    return response


def logout_user(response):
    session.pop("reset_user", None)
    response.delete_cookie(SESSION_COOKIE)
    return response


def public_user(record: Dict[str, Any]) -> Dict[str, Any]:
    """Strip secrets before sending a user record to the browser."""
    return {
        "id": record.get("id"),
        "email": record.get("email"),
        "name": record.get("name"),
        "role": record.get("role"),
        "avatar_url": record.get("avatar_url"),
        "email_verified": bool(record.get("email_verified")),
        "storage_pref": record.get("storage_pref") or "browser",
        "has_password": bool(record.get("password_hash")),
        "created_at": record.get("created_at"),
    }


def require_login(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return fail("Authentication required.", 401)
        return view(user, *args, **kwargs)

    return wrapper



# --------------------------------------------------------------------------- #
# Pages + config
# --------------------------------------------------------------------------- #
@app.get("/")
def index():
    return render_template("auth.html", providers=oauth.PROVIDERS)


@app.get("/api/config")
def api_config():
    """Expose which sign-in features are usable in this deployment."""
    return ok(
        {
            "providers": [
                {
                    "id": name,
                    "label": oauth.provider_label(name),
                    "url": f"/auth/start/{name}",
                    "enabled": oauth.is_configured(name),
                    "hint": None if oauth.is_configured(name) else oauth.missing_env_hint(name),
                }
                for name in oauth.provider_names()
            ],
            "storage_preferences": list(STORAGE_PREFERENCES),
            "email_transport": mailer.transport_name(),
            "otp_required_for_signup": True,
        }
    )


@app.get("/api/health")
def api_health():
    return ok({"service": "mini-excel-auth", "time": datetime.now(timezone.utc).isoformat()})


# --------------------------------------------------------------------------- #
# Sign-up / sign-in with password
# --------------------------------------------------------------------------- #
@app.post("/api/signup")
def api_signup():
    data = json_body()
    email = str(data.get("email", "")).strip().lower()
    name = str(data.get("name", "")).strip()
    password = str(data.get("password", ""))
    wants_otp = bool(data.get("send_otp", True))

    if not email or "@" not in email or "." not in email.split("@")[-1]:
        return fail("Please enter a valid email address.", 422)
    if not name:
        return fail("Please enter your name.", 422)

    problems = security.password_problems(password)
    if problems:
        return fail(" ".join(problems), 422)

    existing = db.get_user_by_email(email)
    if existing:
        if not existing.get("email_verified"):
            # Allow finishing an interrupted signup: re-issue the code instead.
            delivered, detail = issue_otp(existing["email"], "signup")
            return fail(
                "An account with this email already exists but is not verified. "
                "A fresh verification code has been sent."
                + ("" if delivered else f" ({detail})"),
                409,
                code="unverified_exists",
                user_id=existing["id"],
                otp_sent=delivered,
            )
        return fail("An account with this email already exists. Try signing in.", 409)

    user = db.create_user(
        user_id=str(uuid.uuid4()),
        email=email,
        name=name,
        password_hash=security.hash_password(password),
        email_verified=False,
        storage_pref=str(data.get("storage_pref") or "browser"),
    )

    result: Dict[str, Any] = {"user": public_user(user)}
    if wants_otp:
        delivered, detail = issue_otp(email, "signup")
        result["otp_sent"] = delivered
        result["detail"] = detail
    return ok(result, 201)


def issue_otp(email: str, purpose: str) -> Tuple[bool, str]:
    """Generate, store and deliver a fresh OTP for ``email``."""
    code = security.generate_otp()
    pepper = os.environ.get("OTP_PEPPER", SECRET_KEY)
    db.save_otp(
        email,
        security.hash_otp(code, pepper),
        purpose,
        security.otp_expiry_iso(),
    )
    return mailer.send_otp_email(email, code, purpose)


@app.post("/api/otp/send")
def api_otp_send():
    data = json_body()
    email = str(data.get("email", "")).strip().lower()
    purpose = str(data.get("purpose", "signup")).strip() or "signup"

    if purpose not in ("signup", "login", "reset", "link"):
        return fail("Unsupported OTP purpose.", 422)
    if not db.get_user_by_email(email):
        return fail("No account found for that email address.", 404)

    delivered, detail = issue_otp(email, purpose)
    if not delivered:
        return fail(detail, 502)
    return ok({"detail": detail, "transport": mailer.transport_name()})


@app.post("/api/otp/verify")
def api_otp_verify():
    data = json_body()
    email = str(data.get("email", "")).strip().lower()
    code = str(data.get("code", "")).strip()
    purpose = str(data.get("purpose", "signup")).strip() or "signup"

    if not email or not code:
        return fail("Email and code are both required.", 422)

    user = db.get_user_by_email(email)
    if not user:
        return fail("No account found for that email address.", 404)

    pepper = os.environ.get("OTP_PEPPER", SECRET_KEY)
    verified, message = db.verify_and_consume_otp(email, security.hash_otp(code, pepper), purpose)
    if not verified:
        return fail(message, 400)

    if purpose == "signup":
        db.mark_email_verified(user["id"])
    elif purpose == "reset":
        session["reset_user"] = user["id"]

    refreshed = db.get_user_by_email(email) or user
    response, status = ok({"message": message, "user": public_user(refreshed)})
    if purpose == "signup":
        return login_user(response, refreshed["id"]), status
    return response, status



@app.post("/api/login")
def api_login():
    data = json_body()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return fail("Email and password are both required.", 422)

    user = db.get_user_by_email(email)
    if not user or not user.get("password_hash"):
        if user and not user.get("password_hash"):
            return fail(
                "This account uses social sign-in. Use Google, GitHub or Microsoft instead.",
                400,
                code="oauth_only",
            )
        return fail("Invalid email or password.", 401)

    if not security.verify_password(password, user["password_hash"]):
        return fail("Invalid email or password.", 401)

    response, status = ok({"user": public_user(user), "email_verified": bool(user["email_verified"])})
    return login_user(response, user["id"]), status


@app.post("/api/logout")
def api_logout():
    response, status = ok({"message": "Signed out."})
    return logout_user(response), status


@app.get("/api/session")
def api_session():
    user = current_user()
    if not user:
        return ok({"authenticated": False})
    payload: Dict[str, Any] = {"authenticated": True, "user": public_user(user)}
    license_record = db.get_active_license_for_user(user["id"])
    if license_record:
        valid, message, info = validate_license(license_record["license_key"])
        payload["license"] = {
            "valid": valid,
            "message": message,
            "tier": license_record["tier"],
            "expires_at": license_record["expires_at"],
            "days_remaining": (info or {}).get("days_remaining"),
        }
    else:
        payload["license"] = None
    return ok(payload)


@app.post("/api/storage-preference")
@require_login
def api_storage_preference(user):
    data = json_body()
    pref = str(data.get("storage_pref", "")).strip().lower()
    if pref not in STORAGE_PREFERENCES:
        return fail(f"Storage preference must be one of: {', '.join(STORAGE_PREFERENCES)}.", 422)

    db.update_user_storage_pref(user["id"], pref)
    return ok({"storage_pref": pref, "message": f"Storage preference set to {pref}."})


@app.post("/api/password/reset")
def api_password_reset():
    """Complete a password reset after OTP verification."""
    data = json_body()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return fail("Email and new password are both required.", 422)

    user = db.get_user_by_email(email)
    if not user:
        return fail("No account found for that email address.", 404)

    confirmed = session.get("reset_user")
    if confirmed != user["id"]:
        return fail("Verify the emailed code before changing the password.", 403)

    problems = security.password_problems(password)
    if problems:
        return fail(" ".join(problems), 422)

    conn = db.get_db()
    with conn:
        conn.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (
                security.hash_password(password),
                datetime.now(timezone.utc).isoformat(),
                user["id"],
            ),
        )
    conn.close()
    session.pop("reset_user", None)
    return ok({"message": "Password updated. You can now sign in."})



# --------------------------------------------------------------------------- #
# License key validation (fully local / offline)
# --------------------------------------------------------------------------- #
@app.post("/api/license/validate")
def api_license_validate():
    data = json_body()
    key = str(data.get("license_key", "")).strip()
    if not key:
        return fail("License key is required.", 422)

    reference: Optional[date] = None
    override = str(data.get("reference_date", "")).strip()
    if override:
        try:
            reference = datetime.strptime(override, "%Y-%m-%d").date()
        except ValueError:
            return fail("reference_date must use YYYY-MM-DD format.", 422)

    valid, message, info = validate_license(key, reference_date=reference)
    status = 200 if valid else 403
    return (
        jsonify(
            {
                "ok": valid,
                "valid": valid,
                "message": message,
                "license": info,
            }
        ),
        status,
    )


@app.post("/api/license/activate")
@require_login
def api_license_activate(user):
    """Attach a validated license key to the signed-in account."""
    data = json_body()
    key = str(data.get("license_key", "")).strip()
    if not key:
        return fail("License key is required.", 422)

    valid, message, info = validate_license(key)
    if not valid or not info:
        return fail(message, 403, license=None)

    db.save_user_license(
        user["id"],
        key,
        info["key_id"],
        info["licensee"],
        info["tier"],
        info["issued_at"],
        info["expires_at"],
        info.get("features", []),
    )
    return ok({"message": message, "license": info})


@app.get("/api/license/status")
@require_login
def api_license_status(user):
    record = db.get_active_license_for_user(user["id"])
    if not record:
        return ok({"licensed": False, "license": None, "message": "No license key on file."})

    valid, message, info = validate_license(record["license_key"])
    return ok(
        {
            "licensed": valid,
            "message": message,
            "license": info,
            "tier": record["tier"],
            "key_id": record["key_id"],
        }
    )


@app.post("/api/license/trial")
def api_license_trial():
    """Issue a short-lived demo license so the flow can be exercised offline."""
    data = json_body()
    licensee = str(data.get("licensee", "Trial User")).strip() or "Trial User"
    days = int(data.get("days", 14) or 14)
    days = max(1, min(days, 365))

    from datetime import timedelta

    expires = (date.today() + timedelta(days=days)).isoformat()
    key = generate_license(licensee, expires, tier="trial", features=["drive_sync"])
    valid, message, info = validate_license(key)
    return ok({"valid": valid, "message": message, "license_key": key, "license": info})



# --------------------------------------------------------------------------- #
# OAuth: Google / GitHub / Microsoft
# --------------------------------------------------------------------------- #
def callback_uri(provider: str) -> str:
    base = os.environ.get("OAUTH_REDIRECT_BASE", request.host_url.rstrip("/"))
    return f"{base}/auth/callback/{provider}"


@app.get("/auth/start/<provider>")
def auth_start(provider: str):
    provider = provider.lower()
    if provider not in oauth.PROVIDERS:
        return fail(f"Unsupported provider '{provider}'.", 404)

    credentials = oauth.credentials_for(provider)
    if not credentials:
        return fail(oauth.missing_env_hint(provider), 503, code="provider_unconfigured")

    client_id, _client_secret = credentials
    state = secrets.token_urlsafe(24)
    session["oauth_state"] = state
    session["oauth_provider"] = provider

    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode("ascii")).digest()
    ).decode("ascii").rstrip("=")
    session["oauth_verifier"] = verifier if oauth.PROVIDERS[provider]["supports_pkce"] else ""

    url = oauth.build_authorize_url(
        provider,
        client_id,
        callback_uri(provider),
        state,
        code_challenge=challenge,
    )
    return redirect(url)


@app.get("/auth/callback/<provider>")
def auth_callback(provider: str):
    provider = provider.lower()
    error = request.args.get("error")
    if error:
        description = request.args.get("error_description", error)
        return render_template("auth.html", providers=oauth.PROVIDERS, oauth_error=description)

    state = request.args.get("state", "")
    code = request.args.get("code", "")
    expected_state = session.pop("oauth_state", None)
    expected_provider = session.pop("oauth_provider", None)
    verifier = session.pop("oauth_verifier", "") or None

    if not code:
        return render_template("auth.html", providers=oauth.PROVIDERS, oauth_error="Missing authorization code.")
    if not expected_state or state != expected_state or provider != expected_provider:
        return render_template(
            "auth.html",
            providers=oauth.PROVIDERS,
            oauth_error="State check failed. Please start the sign-in again.",
        )

    credentials = oauth.credentials_for(provider)
    if not credentials:
        return render_template(
            "auth.html",
            providers=oauth.PROVIDERS,
            oauth_error=oauth.missing_env_hint(provider),
        )
    client_id, client_secret = credentials

    try:
        profile = oauth.exchange_code(
            provider,
            client_id,
            client_secret,
            code,
            callback_uri(provider),
            code_verifier=verifier,
        )
    except oauth.OAuthError as exc:
        return render_template("auth.html", providers=oauth.PROVIDERS, oauth_error=str(exc))

    email = (profile.get("email") or "").strip().lower()
    if not email:
        return render_template(
            "auth.html",
            providers=oauth.PROVIDERS,
            oauth_error=f"{oauth.provider_label(provider)} did not share an email address.",
        )

    user = db.get_user_by_oauth(provider, profile.get("provider_user_id", "")) or db.get_user_by_email(email)
    created = False
    if not user:
        user = db.create_user(
            user_id=str(uuid.uuid4()),
            email=email,
            name=profile.get("name") or email.split("@")[0],
            password_hash=None,
            email_verified=bool(profile.get("email_verified", True)),
            avatar_url=profile.get("avatar_url"),
        )
        created = True
    elif not user.get("email_verified") and profile.get("email_verified"):
        db.mark_email_verified(user["id"])
        user = db.get_user_by_id(user["id"])

    db.link_oauth_account(
        user["id"],
        provider,
        profile.get("provider_user_id", ""),
        email,
        profile.get("name") or "",
        profile.get("avatar_url"),
    )

    response = redirect(f"/?signed_in=1&provider={provider}{'&created=1' if created else ''}")
    return login_user(response, user["id"])



# --------------------------------------------------------------------------- #
# Static assets + entry point
# --------------------------------------------------------------------------- #
@app.get("/static/<path:filename>")
def static_files(filename: str):
    return send_from_directory(BASE_DIR / "static", filename)


@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith("/api/"):
        return fail("Endpoint not found.", 404)
    return render_template("auth.html", providers=oauth.PROVIDERS), 404


@app.errorhandler(500)
def server_error(error):  # pragma: no cover - safety net
    if request.path.startswith("/api/"):
        return fail(f"Internal error: {error}", 500)
    return render_template("auth.html", providers=oauth.PROVIDERS), 500


if __name__ == "__main__":
    db.init_db()
    port = int(os.environ.get("AUTH_PORT", "5001"))
    print(f"Auth backend listening on http://127.0.0.1:{port}")
    print(f"  configured OAuth providers : {oauth.configured_providers() or 'none (set *_CLIENT_ID env vars)'}")
    print(f"  OTP email transport        : {mailer.transport_name()}")
    app.run(host="127.0.0.1", port=port, debug=True)
