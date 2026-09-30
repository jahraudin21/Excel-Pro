"""Verify the production hardening added to auth_app/app.py.

Checks that AUTH_ENV=production (a) refuses to boot without a real secret and
(b) turns on Secure cookies plus the security/caching headers.
"""

import importlib
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

PASSED = 0
FAILED = 0

# A valid production configuration, so individual checks can vary one key at a
# time without repeating the required values.
PROD_BASE = {
    "AUTH_SECRET": "a-real-random-secret-value-123",
    "OAUTH_REDIRECT_BASE": "https://excel-pro-7n5l.onrender.com",
}


def check(label, condition, extra=""):
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  PASS {label}")
    else:
        FAILED += 1
        print(f"  FAIL {label} {extra}")


def load_app(env):
    """Import auth_app.app fresh under the given environment."""
    for key in ("AUTH_ENV", "AUTH_SECRET", "AUTH_DB_PATH", "OAUTH_REDIRECT_BASE"):
        os.environ.pop(key, None)
    os.environ.update(env)
    os.environ["AUTH_DB_PATH"] = str(ROOT / "auth_app" / "_prodcheck.db")
    sys.modules.pop("auth_app.app", None)
    return importlib.import_module("auth_app.app")


def latest_otp(email):
    """Read the most recent dev-transport OTP for ``email`` from the outbox."""
    outbox = ROOT / "auth_app" / "outbox.log"
    if not outbox.exists():
        return None
    found = None
    for line in outbox.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) == 4 and parts[1] == email:
            found = parts[3]
    return found


def sign_up(client, email):
    """Create an account and complete OTP verification, which is what logs in."""
    client.post(
        "/api/signup",
        json={"email": email, "name": "Prod", "password": "Str0ngPass!"},
    )
    code = latest_otp(email)
    return client.post(
        "/api/otp/verify",
        json={"email": email, "code": code, "purpose": "signup"},
    )


def main():
    print("=== production hardening check ===")

    print("\n--- production refuses a missing/placeholder secret ---")
    for bad in ({}, {"AUTH_SECRET": "dev-auth-secret-change-me"}):
        try:
            load_app({"AUTH_ENV": "production", **bad})
            check(f"refuses to boot with {bad or 'no AUTH_SECRET'}", False, "no error raised")
        except RuntimeError as exc:
            check(f"refuses to boot with {bad or 'no AUTH_SECRET'}", True)
            check("  ...error names AUTH_SECRET", "AUTH_SECRET" in str(exc))

    print("\n--- production refuses a missing/invalid OAUTH_REDIRECT_BASE ---")
    for bad in (
        {"OAUTH_REDIRECT_BASE": ""},
        {"OAUTH_REDIRECT_BASE": "excel-pro-7n5l.onrender.com"},
        {"OAUTH_REDIRECT_BASE": "http://excel-pro-7n5l.onrender.com"},
    ):
        try:
            load_app({"AUTH_ENV": "production", **PROD_BASE, **bad})
            check(f"refuses to boot with OAUTH_REDIRECT_BASE={bad['OAUTH_REDIRECT_BASE']!r}", False,
                  "no error raised")
        except RuntimeError as exc:
            check(f"refuses to boot with OAUTH_REDIRECT_BASE={bad['OAUTH_REDIRECT_BASE']!r}", True)
            check("  ...error names OAUTH_REDIRECT_BASE", "OAUTH_REDIRECT_BASE" in str(exc))

    print("\n--- development still works with no configuration ---")
    mod = load_app({"AUTH_ENV": "development"})
    check("development boots without AUTH_SECRET", mod.SECRET_KEY == "dev-auth-secret-change-me")
    check("development is not prod", mod.IS_PROD is False)

    print("\n--- production accepts a real secret and hardens responses ---")
    mod = load_app({"AUTH_ENV": "production", **PROD_BASE})
    check("production boots with a real secret", mod.IS_PROD is True)
    check("prod keeps the supplied secret", mod.SECRET_KEY == "a-real-random-secret-value-123")

    client = mod.app.test_client()

    resp = client.get("/api/health")
    check("health returns 200", resp.status_code == 200)
    check("api is not cached", resp.headers.get("Cache-Control") == "no-store")
    check("nosniff set", resp.headers.get("X-Content-Type-Options") == "nosniff")
    check("frame denied", resp.headers.get("X-Frame-Options") == "DENY")
    check("referrer policy set", bool(resp.headers.get("Referrer-Policy")))
    check("HSTS set in production", bool(resp.headers.get("Strict-Transport-Security")))
    csp = resp.headers.get("Content-Security-Policy", "")
    check("CSP present", bool(csp))
    check("CSP script-src is self only", "script-src 'self'" in csp)
    check("CSP blocks framing", "frame-ancestors 'none'" in csp)

    page = client.get("/")
    check("page returns 200", page.status_code == 200)
    check("page is revalidated not cached", page.headers.get("Cache-Control") == "no-cache")

    css = client.get("/static/auth.css")
    check("static css served", css.status_code == 200)
    check("static css is revalidated", css.headers.get("Cache-Control") == "no-cache")

    print("\n--- auth cookie is marked Secure in production ---")
    resp = sign_up(client, "prod-check@example.com")
    check("otp verify accepted", resp.status_code == 200, resp.get_data(as_text=True)[:120])
    cookie = resp.headers.get("Set-Cookie", "")
    check("mx-session cookie is set", "mx-session" in cookie, cookie)
    check("cookie is Secure", "Secure" in cookie, cookie)
    check("cookie is HttpOnly", "HttpOnly" in cookie, cookie)
    check("session is live", client.get("/api/session").json.get("authenticated") is True)

    print("\n--- development cookies are not Secure (http localhost still works) ---")
    mod_dev = load_app({"AUTH_ENV": "development", "AUTH_SECRET": "dev-secret"})
    client_dev = mod_dev.app.test_client()
    resp_dev = sign_up(client_dev, "dev-check@example.com")
    check("dev otp verify accepted", resp_dev.status_code == 200)
    check("dev cookie is set", "mx-session" in resp_dev.headers.get("Set-Cookie", ""))
    check("dev cookie is not Secure", "Secure" not in resp_dev.headers.get("Set-Cookie", ""))
    check("dev session is live", client_dev.get("/api/session").json.get("authenticated") is True)
    check("dev has no HSTS", not client_dev.get("/api/health").headers.get("Strict-Transport-Security"))
    check("dev has no CSP", not client_dev.get("/api/health").headers.get("Content-Security-Policy"))

    print("\n--- OAuth callback URL is pinned, not taken from the Host header ---")
    os.environ["GOOGLE_CLIENT_ID"] = "prod-client-id"
    os.environ["GOOGLE_CLIENT_SECRET"] = "prod-client-secret"

    # Google matches redirect URIs literally, so the value sent must be the
    # registered https callback -- not the internal http hop gunicorn sees
    # behind Render's TLS-terminating proxy.
    resp = client.get(
        "/auth/start/google",
        headers={
            "Host": "excel-pro-7n5l.onrender.com",
            "X-Forwarded-Proto": "http",
            "X-Forwarded-Host": "attacker.example.com",
        },
    )
    check("configured provider redirects", resp.status_code == 302)
    location = resp.headers.get("Location", "")
    redirect_uri = parse_qs(urlparse(location).query).get("redirect_uri", [""])[0]
    check(
        "callback matches the registered URI",
        redirect_uri == "https://excel-pro-7n5l.onrender.com/auth/callback/google",
        redirect_uri,
    )
    check("callback is not the internal http hop", "http://" not in redirect_uri, redirect_uri)
    check("a forwarded Host cannot steer the callback",
          "attacker.example.com" not in redirect_uri, redirect_uri)

    print("\n--- a trailing slash on OAUTH_REDIRECT_BASE is normalised ---")
    mod_slash = load_app({"AUTH_ENV": "production", **PROD_BASE,
                          "OAUTH_REDIRECT_BASE": "https://excel-pro-7n5l.onrender.com/"})
    resp = mod_slash.app.test_client().get("/auth/start/google")
    redirect_uri = parse_qs(urlparse(resp.headers.get("Location", "")).query).get(
        "redirect_uri", [""]
    )[0]
    check(
        "trailing slash does not double up the separator",
        redirect_uri == "https://excel-pro-7n5l.onrender.com/auth/callback/google",
        redirect_uri,
    )

    print("\n--- development still derives the callback from the request host ---")
    mod_dev_proxy = load_app({"AUTH_ENV": "development", "AUTH_SECRET": "dev-secret"})
    resp = mod_dev_proxy.app.test_client().get(
        "/auth/start/google",
        base_url="http://127.0.0.1:5001",
    )
    redirect_uri = parse_qs(urlparse(resp.headers.get("Location", "")).query).get(
        "redirect_uri", [""]
    )[0]
    check("localhost callback works with no configuration",
          redirect_uri == "http://127.0.0.1:5001/auth/callback/google", redirect_uri)

    os.environ.pop("OAUTH_REDIRECT_BASE", None)
    os.environ.pop("GOOGLE_CLIENT_ID", None)
    os.environ.pop("GOOGLE_CLIENT_SECRET", None)

    # tidy up
    for name in ("_prodcheck.db",):
        path = ROOT / "auth_app" / name
        if path.exists():
            path.unlink()

    print("\n========================================")
    print(f"{PASSED} passed, {FAILED} failed")
    print("========================================")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
