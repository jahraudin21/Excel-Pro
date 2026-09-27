"""Verify the 'Sign in with Google' button on the auth login page.

Renders the real template through Flask and asserts the Google button carries
the official four-colour G logo and the correct label, and that the other
providers still fall back to their letter tile.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import os

os.environ.setdefault("AUTH_ENV", "development")
os.environ["AUTH_SECRET"] = "google-button-check"
os.environ["AUTH_DB_PATH"] = str(ROOT / "auth_app" / "_gbtn_check.db")

import auth_app.app as mod  # noqa: E402

PASSED = 0
FAILED = 0


def check(label, condition, extra=""):
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  PASS {label}")
    else:
        FAILED += 1
        print(f"  FAIL {label} {extra}")


def main():
    print("=== Google sign-in button check ===")
    html = mod.app.test_client().get("/").get_data(as_text=True)

    # Isolate the Google button block.
    match = re.search(
        r'<a class="oauth-btn[^"]*"[^>]*data-provider="google".*?</a>', html, re.S
    )
    check("google button is present", match is not None)
    block = match.group(0) if match else ""

    print("\n--- logo ---")
    check("contains an inline svg", "<svg" in block, block[:120])
    check("svg has the g-logo class", 'class="g-logo"' in block)
    check("svg uses the standard 48x48 viewBox", 'viewBox="0 0 48 48"' in block)
    for colour in ("#EA4335", "#4285F4", "#FBBC05", "#34A853"):
        check(f"logo uses brand colour {colour}", colour in block)
    check("logo has 4 paths", block.count("<path") == 4, f"found {block.count('<path')}")
    check("icon span is not empty", "></span>" not in block.split("oauth-icon")[-1][:200])

    print("\n--- label + link ---")
    check("label says 'Sign in with Google'", "Sign in with Google" in html)
    check("links to the google oauth start", 'href="/auth/start/google"' in block)

    print("\n--- other providers keep the letter fallback ---")
    for pid, letter in (("github", "G"), ("microsoft", "M")):
        m = re.search(r'<a class="oauth-btn[^"]*"[^>]*data-provider="%s".*?</a>' % pid, html, re.S)
        b = m.group(0) if m else ""
        check(f"{pid} button present", m is not None)
        check(f"{pid} has no svg (uses letter tile)", "<svg" not in b)
    check("github letter tile css still present",
          'data-icon="github"] { background: #24292f; }' in
          (ROOT / "auth_app" / "static" / "auth.css").read_text(encoding="utf-8"))
    check("google no longer uses the red tile",
          'data-icon="google"] { background: #ea4335; }' not in
          (ROOT / "auth_app" / "static" / "auth.css").read_text(encoding="utf-8"))

    print("\n--- javascript must not wipe the svg ---")
    js = (ROOT / "auth_app" / "static" / "auth.js").read_text(encoding="utf-8")
    check("auth.js guards on firstElementChild", "firstElementChild" in js)
    check("auth.js no longer hardcodes the google selector list",
          '.oauth-icon[data-icon=google]' not in js)

    print("\n========================================")
    print(f"{PASSED} passed, {FAILED} failed")
    print("========================================")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
