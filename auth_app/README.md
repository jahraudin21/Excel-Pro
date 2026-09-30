# Mini Excel — Auth Backend + Login UI

A self-contained authentication service with a Python (Flask) backend and a
vanilla HTML/CSS/JS front-end.

## Features

| Area | What you get |
| --- | --- |
| Email + password | Sign-up and sign-in with PBKDF2-SHA256 hashing (260k iterations, per-user salt) |
| Email OTP | 6-digit codes, hashed at rest, 10-minute TTL, 3 attempts, single use |
| OAuth | Google, GitHub and Microsoft with state + PKCE protection |
| License keys | Offline HMAC-SHA256 signed keys with expiry enforcement |
| Storage choice | Per-user preference: `browser`, `cloud` or `drive` |

## Layout

```
auth_app/
  app.py            Flask app, routes, session handling
  db.py             SQLite schema + queries (users, oauth, otp, licenses)
  security.py       Password hashing, OTP generation, session tokens
  oauth.py          Google / GitHub / Microsoft OAuth 2.0 flows
  mailer.py         OTP delivery (console for dev, SMTP for production)
  license.py        Signed license key generator + validator
  templates/
    auth.html       Single-page auth UI (sign in / sign up / OTP / reset)
  static/
    auth.css        Card layout, dark-mode aware
    auth.js         Front-end controller
  requirements.txt
```

## Quick start

```powershell
pip install -r auth_app/requirements.txt
python auth_app/app.py            # http://127.0.0.1:5001
```

Open the page, click **Create account**, and the OTP will be printed to the
console *and* appended to `auth_app/outbox.log` — no SMTP needed for local use.

## API reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Auth page |
| `GET` | `/api/config` | Enabled providers, storage options, mail transport |
| `GET` | `/api/health` | Liveness probe |
| `POST` | `/api/signup` | Create account, sends signup OTP |
| `POST` | `/api/login` | Password sign-in |
| `POST` | `/api/logout` | Clear the session cookie |
| `GET` | `/api/session` | Current user + license summary |
| `POST` | `/api/otp/send` | Re-issue an OTP (`signup`/`login`/`reset`/`link`) |
| `POST` | `/api/otp/verify` | Verify an OTP, completes signup or unlocks reset |
| `POST` | `/api/storage-preference` | Save `browser` / `cloud` / `drive` |
| `POST` | `/api/password/reset` | Set a new password after OTP proof |
| `POST` | `/api/license/validate` | Validate a key (offline, supports `reference_date`) |
| `POST` | `/api/license/activate` | Attach a validated key to the account |
| `GET` | `/api/license/status` | License state with days remaining |
| `POST` | `/api/license/trial` | Issue a short demo key |
| `GET` | `/auth/start/<provider>` | Begin OAuth consent redirect |
| `GET` | `/auth/callback/<provider>` | OAuth redirect target |

## Configuration

Everything is environment driven; nothing is required for local development.

| Variable | Effect |
| --- | --- |
| `AUTH_SECRET` | HMAC key for sessions **and** license signatures. Set this in production. |
| `OTP_PEPPER` | Extra secret mixed into OTP hashes. Defaults to `AUTH_SECRET`. |
| `AUTH_PORT` | Port for `python auth_app/app.py` (default `5001`). |
| `AUTH_DB_PATH` | SQLite file location (default `auth_app/auth.db`). |
| `OAUTH_REDIRECT_BASE` | Public base URL used to build OAuth callbacks. **Required** in production; must be an absolute `https://` URL. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enable Google sign-in. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Enable GitHub sign-in. |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Enable Microsoft sign-in. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_STARTTLS` | Send real OTP email. |

Providers without credentials are shown as disabled buttons with a hint, so the
email flow keeps working while you set them up.

### OAuth callback URLs to register

Local development:

```
http://127.0.0.1:5001/auth/callback/google
http://127.0.0.1:5001/auth/callback/github
http://127.0.0.1:5001/auth/callback/microsoft
```

Production (`https://excel-pro-7n5l.onrender.com`):

```
https://excel-pro-7n5l.onrender.com/auth/callback/google
https://excel-pro-7n5l.onrender.com/auth/callback/github
https://excel-pro-7n5l.onrender.com/auth/callback/microsoft
```

Register the **full callback path**, not the bare origin. Google matches
redirect URIs literally, so adding only `https://excel-pro-7n5l.onrender.com`
does **not** work — the sign-in fails with `redirect_uri_mismatch`. The origin
alone (`https://excel-pro-7n5l.onrender.com`) belongs under *Authorized
JavaScript origins*, and is only needed by the client-side GIS flow in
`index.html` described in [`../GOOGLE_SIGNIN.md`](../GOOGLE_SIGNIN.md), not by
this backend.

Behind a TLS-terminating proxy such as Render, Flask only sees the internal
`http://` hop, so the public URL is pinned explicitly instead of being guessed
from the request:

```
OAUTH_REDIRECT_BASE=https://excel-pro-7n5l.onrender.com
```

This is **required** when `AUTH_ENV=production`; the app refuses to boot
without it, or with a value that is not an absolute `https://` URL. That is
deliberate — deriving the callback from the request `Host` would let a caller
supplying that header decide where Google delivers the authorization code.
`AUTH_ENV=production` also enables `ProxyFix` so other URLs the app generates
respect the proxy's `X-Forwarded-*` headers.

## License keys

Keys are `base64url(payload).base64url(HMAC-SHA256(payload))` — validation is
pure local computation, no network call, and any byte change breaks the
signature. The payload carries `kid`, `lic`, `tier`, `iat`, `exp` and `feat`.

```python
from auth_app.license import generate_license, validate_license

key = generate_license("Acme Corp", "2027-12-31", tier="enterprise")
valid, message, info = validate_license(key)
print(valid, message, info["days_remaining"])
```

Generate one from the CLI:

```powershell
python auth_app/license.py
```

In the UI, click **Get 14-day trial** to mint a key, then **Activate**.

## Tests

Run the complete verification suite:

```powershell
python _verify_auth_app.py
```

Or run each suite separately:

```powershell
python _test_license.py          # license + security helpers   (45 checks)
python _test_auth_db.py          # database layer                (23 checks)
python _test_auth_app.py         # full API surface              (83 checks)
python _test_live_server.py      # real HTTP server smoke test   (27 checks)
python _test_entrypoint.py       # documented `app.py` start-up  (14 checks)
```

## Security notes

* Passwords never leave the backend and are compared with `hmac.compare_digest`.
* OTPs are stored as salted hashes and deleted the moment they are used.
* OAuth uses a single-use `state` value; PKCE is applied where the provider supports it.
* Login responses are identical for unknown emails and wrong passwords.
* The auth token is an HMAC-signed, expiring cookie (`mx-session`, httpOnly, SameSite=Lax).
  Flask's own flow cookie uses a separate name (`mx-flow`) so the two never collide.
* SQLite access is parameterised throughout — no string-built queries.
