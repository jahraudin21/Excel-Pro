# Google Sign-In + Google Drive — setup & notes

Mini Excel's auth dialog (`#authDialog`) offers **Sign in with Google** next to the
email/password form (fields: `Email`, `Name`, `Password` — no `acc` prefix).
Google users get everything password users get: cloud saves, API keys, profile,
plus optional **Google Drive** storage with auto-save.

## One-time setup (required for Google + Drive)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Add **Authorized JavaScript origins**, e.g. `http://127.0.0.1:5000` and `http://localhost:5000` (the Flask dev server in `app.py`).
4. Enable **Google Drive API** (APIs & Services → Library → Google Drive API → Enable).
5. Configure the OAuth consent screen (External + test users is fine while developing). Add scope `https://www.googleapis.com/auth/drive.file`.
6. Copy the client ID (`…apps.googleusercontent.com`) into `index.html`:

   ```html
   <meta name="google-client-id" content="PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com">
   ```

Reload the page: the *or — Sign in with Google* button appears in the auth dialog,
and the profile panel shows **Storage preference: Browser / App cloud / Google Drive**
with a **Connect Drive** button. Leave `content=""` (the default) to keep Google
hidden; email/password sign-in is unaffected.

## What was changed

| File | Change |
|------|--------|
| `index.html` | GIS loader script, `google-client-id` meta tag, Google button row (`#googleRow/#googleBtn`) in `#authDialog`, storage-preference radios + `#driveConnectBtn`, clean auth card markup (`#authForm`, `#emailField`, `#nameField`, `#passwordField`) |
| `js/drive.js` (new) | `DriveBooks` provider: OAuth token client (`drive.file`), folder `MiniExcel`, list/save/get/update/delete via Drive v3 REST + multipart upload |
| `js/account.js` | `Account.setStoragePref`, `StorageBooks` router (browser/cloud/drive), renamed `acc*` helpers/keys to clean names (`readStoredJSON`, `APP_*_KEY`, error codes `invalidEmail`, `googleSignInFailed`, ...) |
| `js/account-ui.js` | Clean IDs/classes/i18n (`userChip`, `authDialog`, `emailLabel`, ...), `paintDriveBtn`, `scheduleDriveAutosave` (2s debounce via `saveLS`), storage radios wiring, sign-out disconnects Drive |
| `js/script.js` | `saveLS()` triggers `scheduleDriveAutosave()`; `bsOpenAccount` uses renamed `showAccountPage` |
| `css/styles.css` | `.userChip/.fieldLabel/.formError/.btnPrimary/.googleRow/...`, auth card (rounded 16px, focus rings), `.storagePrefRow/.storageOpt`, avatar image rules |

## Behaviour

- **First Google sign-in** creates a local account (`provider:"google"`, `googleSub`, profile picture) and starts the usual session.
- **Same Google account later** reuses the stored record — no duplicates.
- **Matching email** on an existing password account *links* Google to it (password still works; cloud books/API keys stay with the same user id).
- **Google-only accounts** have no local password: the *Change password* row is replaced with an explanatory note, and the engine rejects password changes (`googleNoPasswordNote`).
- **Storage preference** (per user + `mx-storage-pref` fallback): Browser = localStorage only; App cloud = same local `CloudBooks`; Drive = `DriveBooks` when connected, else falls back to local. Drive saves also mirror locally. Auto-save fires ~2s after any edit while Drive is selected + connected.
- Button/labels translate with the app language (np → Nepali `ne`, hi → `hi`, en → `en`).
- Without a client ID or when the GIS script cannot load (e.g. offline), the Google row simply stays hidden — email/password sign-in is unaffected. Drive methods resolve `'driveNeedConnect'` so the UI falls back safely.

## Security notes / limitations

- The ID token's **claims** are validated client-side: issuer (`accounts.google.com`),
  audience (your client ID), expiry, and `email_verified`. The token **signature is not
  verified** in the browser. Drive access tokens live only in memory (`DriveBooks._token`).
- That matches this app's existing trust model: the whole account system (users,
  sessions, API keys) lives in `localStorage` in the browser.
- Before trusting Google identities for **server-side** data, verify the ID token on the
  backend (e.g. a Flask endpoint using `google-auth`'s `id_token.verify_oauth2_token`) and
  move sessions server-side. The frontend hook is `Account.signInWithGoogle(credential)`,
  which receives the raw `credential` (JWT) — feed it to your API instead of parsing locally.
- Profile pictures are only accepted from `https://*.googleusercontent.com/...` before
  being used in CSS.

## Test

```powershell
node --check js/account.js
node --check js/account-ui.js
node --check js/drive.js
node --check js/script.js
node _test_google_signin.js
```

Run the app: `python app.py` → http://127.0.0.1:5000 (the client ID above is required
for the Google button + Drive connect to work).

