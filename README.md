# Mini Excel — Spreadsheet

A browser-based spreadsheet application shipped two ways:

| Target | What it is | Build |
|--------|-----------|-------|
| **Desktop** | Electron shell wrapping `index.html` + `js/` + `css/` | `npm run build:win` / `build:mac` / `build:linux` |
| **Web** | Flask backend in `auth_app/` (auth, licenses, storage) | gunicorn via `Procfile` |

The spreadsheet UI itself is plain browser JavaScript — no framework, no bundler,
and no runtime dependencies. There is nothing to transpile.

---

## Desktop build

```bash
npm install          # install Electron + electron-builder
npm start            # run unpacked during development
npm test             # JavaScript test suite
```

### Starting on Windows: the PowerShell execution-policy error

If `npm start` fails with

```
npm.ps1 cannot be loaded because running scripts is disabled on this machine.
```

that is **PowerShell's execution policy, not a problem with this project**.
PowerShell resolves the bare name `npm` to `npm.ps1` — a PowerShell script — in
preference to `npm.cmd`, and refuses to run it when the policy is `Restricted`
(the Windows default, and still common on managed machines). npm never starts.

Three ways round it, in order of preference:

```bash
.\start.cmd          # recommended: plain cmd.exe, ignores the policy entirely
npm.cmd start        # call the cmd shim explicitly
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   # one-off, per user
```

`start.cmd` is the one to reach for: it is cmd.exe, so the execution policy does
not apply, and it works unchanged from PowerShell, cmd.exe, Explorer double-click
and Task Scheduler. It also accepts `start.cmd --test` to run the suite.

> **Editing `start.cmd`:** use `::` for comments, never `REM`. A `REM` line
> holding a URL with a query string (`fwlink/?LinkID=…`) makes cmd fail with
> `... was unexpected at this time`, because the `?` is parsed as part of the
> command line rather than as comment text. Keep the file ASCII, CRLF, no BOM.

### Producing installers

```bash
npm run build:win    # Windows: NSIS installer + portable .exe  -> release/
npm run build:mac    # macOS:   .dmg + .zip
npm run build:linux  # Linux:   AppImage + .deb
```

All artifacts land in `release/` (git-ignored). `npm run build` is an alias for
the Windows build.

Only these files are packaged into the app bundle:

```
main.js  index.html  sw.js  js/**  css/**
```

Everything else in the repository — the Flask backend, test scripts, VBA
exports, sample `.xlsx`/`.zip` files — is deliberately excluded by the `files`
whitelist in `package.json`, so installers stay small and no development-only
material ships to users.

### Notes

- The renderer runs with `nodeIntegration: false`, `contextIsolation: true` and
  `sandbox: true`; it has no Node access.
- `main.js` ignores `USE_DEV_SERVER` in a packaged build, so a shipped app can
  never depend on a local dev server.
- Packaged builds start with **no application menu** and cannot open devtools.
- The service worker (`sw.js`) does not run under `file://`, so the desktop build
  reads from disk. Offline caching is a web-only feature.
- Icons: no icon set is committed, so electron-builder uses its default. Drop
  `build/icon.ico` (or `icon.png`) in to customise.

---

## Web backend (`auth_app/`)

```bash
pip install -r requirements.txt
python auth_app/app.py     # http://127.0.0.1:5001
npm run test:auth          # 73 assertions across three suites
```

Configuration is documented in [`auth_app/.env.example`](auth_app/.env.example)
and [`auth_app/README.md`](auth_app/README.md).

### Production deployment

Set at minimum:

```bash
AUTH_ENV=production
AUTH_SECRET=<random>       # REQUIRED in production — see below
AUTH_DB_PATH=<path to auth.db>
OAUTH_REDIRECT_BASE=https://excel-pro-7n5l.onrender.com
```

`OAUTH_REDIRECT_BASE` pins the public URL used to build OAuth callbacks. It
matters on Render because TLS terminates at the proxy and gunicorn receives
plain `http`, so without it the backend would send Google an `http://` redirect
URI that is not on the allowlist. It is **required** in production — the app
refuses to boot without a valid `https://` value, because deriving the callback
from the request `Host` would let a caller decide where Google delivers the
authorization code. Register the full callback path with each provider —
`https://excel-pro-7n5l.onrender.com/auth/callback/google` — because Google
compares redirect URIs literally; the bare origin is not sufficient. See
[`auth_app/README.md`](auth_app/README.md) for the GitHub and Microsoft values.

Generate a secret with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

`AUTH_ENV=production` turns on:

- **Fail-fast on a weak secret.** If `AUTH_SECRET` is missing or left at the
  placeholder value, the app refuses to boot. This secret signs *both* session
  cookies and license keys, so a publicly known value would make every session
  and licence forgeable.
- **Fail-fast on a missing `OAUTH_REDIRECT_BASE`.** The public base URL for
  OAuth callbacks must be stated explicitly and must be `https://`, so the
  authorization code is never delivered to a host chosen by a caller.
- **`Secure` cookies** (`mx-session` and the Flask flow cookie).
- **HSTS** and a strict **Content-Security-Policy** (`script-src 'self'`;
  `https:` images are allowed because OAuth avatars are hosted by Google,
  GitHub and Microsoft).
- **Generic 500 responses** — exception text is no longer echoed to the browser.

Caching is set per route: `no-store` for `/api/*` (session and profile data),
`no-cache` for the sign-in page and static assets (they are not content-hashed,
so they must revalidate rather than risk a stale copy after a deploy).

### Two things to fix before running at scale

1. **SQLite is not durable or shared.** `auth_app/db.py` writes to a local file,
   which is wiped on every dyno restart/redeploy, and cannot be shared between
   processes. `Procfile` therefore pins `--workers 1`. Move `db.py` to a real
   database before increasing concurrency.
2. **`app.py` at the repository root is a legacy dev server**, not the
   production app. It serves the spreadsheet UI for local development and
   Electron's `USE_DEV_SERVER` mode. `Procfile` correctly targets
   `auth_app.app:app`.

---

## Repository layout

```
index.html  js/  css/  sw.js     spreadsheet UI (the actual app)
main.js                        Electron main process
app.py                         legacy dev/static server (port 5000)
auth_app/                      production Flask backend (port 5001)
Procfile  requirements.txt      deployment config
js/script.js                   ~209 KB — the spreadsheet engine
```

Files prefixed with `_` are development scratch scripts and tests; they are not
part of any build.
