'use strict';
/* Regression test: Google Sign-In integration in js/account.js.
   Loads the account engine in a VM sandbox with stubbed browser globals,
   then exercises Account.signInWithGoogle / parseGoogleCredential end-to-end
   (find-or-create, linking, password rules, claim validation, page wiring). */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const CLIENT_ID = '123456789-test.apps.googleusercontent.com';
let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('  PASS ' + msg); }
  else { failed++; console.log('  FAIL ' + msg); }
}

function b64url(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function idToken(payload) {
  return b64url({ alg: 'RS256', typ: 'JWT' }) + '.' + b64url(payload) + '.test-signature';
}
function claims(over) {
  return Object.assign({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: 'g-sub-1',
    email: 'googler@example.com',
    email_verified: true,
    name: 'Go Ogle',
    picture: 'https://lh3.googleusercontent.com/abc/s96-c',
    exp: Math.floor(Date.now() / 1000) + 3600
  }, over || {});
}

function makeSandbox() {
  const store = Object.create(null);
  const meta = { content: CLIENT_ID };
  const sandbox = {
    console,
    TextEncoder, TextDecoder,
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    crypto: globalThis.crypto,
    document: { querySelector: sel => (sel === 'meta[name=google-client-id]' ? meta : null) },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    __meta: meta
  };
  const ctx = vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(__dirname, 'js', 'account.js'), 'utf8')
    + '\nglobalThis.__Account = Account; globalThis.__StorageBooks = StorageBooks;';
  vm.runInContext(src, ctx, { filename: 'account.js' });
  return ctx;
}

async function main() {
  const ctx = makeSandbox();
  const A = ctx.__Account;
  ok(!!A, 'account engine loads in sandbox');

  console.log('\n[configuration]');
  ok(A.isGoogleConfigured() === true, 'configured when meta has a real client ID');
  ctx.__meta.content = '';
  ok(A.isGoogleConfigured() === false, 'unconfigured when meta is empty');
  ctx.__meta.content = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
  ok(A.isGoogleConfigured() === false, 'unconfigured for placeholder ID');
  ctx.__meta.content = CLIENT_ID;

  console.log('\n[claim validation]');
  ctx.__meta.content = '';
  ok(await A.signInWithGoogle(idToken(claims())) === 'googleSignInFailed',
    'sign-in rejected while unconfigured');
  ctx.__meta.content = CLIENT_ID;
  ok(await A.signInWithGoogle('garbage') === 'googleSignInFailed', 'malformed token rejected');
  ok(await A.signInWithGoogle(idToken({ sub: 'x', email: 'a@b.co' })) === 'googleSignInFailed',
    'token without iss/aud/exp rejected');
  ok(await A.signInWithGoogle(idToken(claims({ aud: 'evil.apps.googleusercontent.com' }))) === 'googleSignInFailed',
    'wrong audience rejected');
  ok(await A.signInWithGoogle(idToken(claims({ iss: 'https://evil.example.com' }))) === 'googleSignInFailed',
    'wrong issuer rejected');
  ok(await A.signInWithGoogle(idToken(claims({ exp: Math.floor(Date.now() / 1000) - 60 }))) === 'googleSignInFailed',
    'expired token rejected');
  ok(await A.signInWithGoogle(idToken(claims({ email_verified: false }))) === 'googleSignInFailed',
    'unverified email rejected');
  ok(await A.signInWithGoogle(idToken(claims({ email: undefined }))) === 'googleSignInFailed',
    'missing email rejected');

  console.log('\n[sign-in flow]');
  let changes = 0;
  A.onChange(() => { changes++; });
  ok(await A.signInWithGoogle(idToken(claims())) === true, 'valid token signs in');
  const u = A.currentUser();
  ok(!!u && u.email === 'googler@example.com', 'session user email set');
  ok(!!u && u.name === 'Go Ogle', 'display name taken from Google profile');
  ok(!!u && u.provider === 'google' && u.googleSub === 'g-sub-1', 'provider/sub recorded');
  ok(changes >= 1, 'change listeners notified');
  ok(ctx.localStorage.getItem('mx-session-v1') !== null, 'session persisted to localStorage');
  ok(A.users().length === 1, 'exactly one user stored');
  ok(await A.signInWithGoogle(idToken(claims({ name: 'Renamed' }))) === true,
    'repeat sign-in with same sub succeeds');
  ok(A.users().length === 1, 'repeat sign-in does not duplicate the user');
  ok(A.currentUser().name === 'Go Ogle', 'existing display name not overwritten by Google');

  console.log('\n[linking an existing password account]');
  A.signOut();
  ok(await A.signUp('link@example.com', 'Local User', 'secret1') === true, 'local sign-up works');
  const localId = A.currentUser().id;
  A.signOut();
  ok(await A.signInWithGoogle(idToken(claims({ sub: 'g-sub-2', email: 'link@example.com', name: 'Local User' }))) === true,
    'google sign-in with matching email succeeds');
  const linked = A.currentUser();
  ok(!!linked && linked.id === localId, 'existing account reused (same user id)');
  ok(!!linked && linked.provider === 'google' && linked.googleSub === 'g-sub-2',
    'account linked to Google');
  ok(!!linked && !!linked.hash, 'local password hash retained after linking');
  A.signOut();
  ok(await A.signIn('link@example.com', 'secret1') === true,
    'original password still signs in after linking');

  console.log('\n[password rules: pure-google vs linked]');
  A.signOut();
  await A.signInWithGoogle(idToken(claims()));
  ok(await A.changePassword('anything', 'newpass1') === 'googleNoPasswordNote',
    'password change blocked for Google-only account');
  A.signOut();
  await A.signInWithGoogle(idToken(claims({ sub: 'g-sub-2', email: 'link@example.com' })));
  ok(await A.changePassword('secret1', 'secret2') === true,
    'linked account can still change password');
  A.signOut();
  ok(await A.signIn('link@example.com', 'secret2') === true,
    'new password works for linked account');

  console.log('\n[profile sanitation]');
  A.signOut();
  await A.signInWithGoogle(idToken(claims({ sub: 'g-sub-3', email: 'pic@example.com', picture: 'https://attacker.tld/x.png' })));
  ok(A.currentUser() && A.currentUser().picture === '', 'non-googleusercontent picture dropped');
  A.signOut();
  await A.signInWithGoogle(idToken(claims({ sub: 'g-sub-4', email: 'uni@example.com', name: 'देवनागरी नाम' })));
  ok(A.currentUser() && A.currentUser().name === 'देवनागरी नाम', 'unicode name decodes correctly');
  A.signOut();
  ok(A.currentUser() === null, 'sign out clears session');

  console.log('\n[google drive is the primary cloud backend]');
  const SB = ctx.__StorageBooks;
  A.signOut();
  await A.signUp('pw@example.com', 'Pw User', 'secret1');
  ok(SB.pref() === 'browser', 'password accounts keep the local-first default');
  A.signOut();

  await A.signInWithGoogle(idToken(claims({ sub: 'g-drive', email: 'drive@example.com' })));
  ok(A.currentUser().storagePref === 'drive', 'google sign-in stamps drive as the storage preference');
  ok(SB.pref() === 'drive', 'google accounts resolve to Drive as their provider');

  /* An explicit choice made in the storage picker must survive. */
  SB.setPref('browser');
  ok(SB.pref() === 'browser', 'an explicit storage choice wins over the google default');
  ok(SB.provider() !== ctx.DriveBooks, 'falls back to the local provider when Drive is not connected');

  await A.signInWithGoogle(idToken(claims({ sub: 'g-drive', email: 'drive@example.com' })));
  ok(SB.pref() === 'browser', 're-signing in does not re-stamp an explicit choice');

  console.log('\n[page wiring]');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  ['meta name="google-client-id"', 'accounts.google.com/gsi/client', 'id="googleRow"',
   'id="googleBtn"', 'id="googlePasswordNote"', 'data-i18n="orLabel"'
  ].forEach(s => ok(html.indexOf(s) >= 0, 'index.html contains ' + s));
  const css = fs.readFileSync(path.join(__dirname, 'css', 'styles.css'), 'utf8');
  ['.googleRow', '.googleDivider', '.googleBtn', '.userAvatar{background-size:cover'
  ].forEach(s => ok(css.indexOf(s) >= 0, 'styles.css contains ' + s));
  const ui = fs.readFileSync(path.join(__dirname, 'js', 'account-ui.js'), 'utf8');
  ['googleSignInInit', 'googleCredentialHandler', 'renderButton', 'paintAvatar',
   'googleSignInFailed', 'googleNoPasswordNote'
  ].forEach(s => ok(ui.indexOf(s) >= 0, 'account-ui.js contains ' + s));

  console.log('\n[auth dialog layout: Google button closes the card]');
  const gi = html.indexOf('id="gsignBtn"');
  const noAccount = html.indexOf('id="authSwitchMode"');
  const formEnd = html.indexOf('</form>', gi);
  ok(gi > 0 && noAccount > 0, 'both the Google button and the sign-up link are present');
  ok(gi > noAccount, 'the Google button sits below the "no account" link');
  ok(gi < formEnd, 'the Google button is still inside the sign-in form');
  /* Nothing but the GIS host may follow it, so it really is the bottom of the
     card rather than merely after the link. */
  const tail = html.slice(html.indexOf('</button>', gi), formEnd);
  ok(tail.indexOf('id="emailField"') < 0 && tail.indexOf('id="passwordField"') < 0 &&
    tail.indexOf('id="authSubmit"') < 0,
    'no form field or submit button follows the Google button');
  /* The "or" divider that used to sit above the button moved with it; the GIS
     row no longer needs a second one. */
  ok((html.match(/data-i18n="orLabel"/g) || []).length === 1,
    'exactly one "or" divider remains');

  console.log('\n[a click on the Google button reaches the authentication logic]');
  ok(ui.indexOf('function googleOpenPrompt') >= 0, 'a Google prompt helper exists');
  ok(/googleSignInReady\)return googleOpenPrompt\(true\)/.test(ui),
    'a click with GIS already loaded opens the prompt immediately');
  ok(/googlePromptPending=true;/.test(ui) && /googleSignInInit\(\)/.test(ui),
    'a click while GIS is still loading records the intent and starts the loader');
  ok(/if\(googlePromptPending\)\{googlePromptPending=false;googleOpenPrompt\(false\);\}/.test(ui),
    'the loader fulfils the pending click the moment GIS is ready');
  ok(/google\.accounts\.id\.prompt\(\)/.test(ui), 'the One Tap prompt is opened as a fallback');
  ok(ui.indexOf("if(typeof googleSignInInit==='function'){googleSignInInit();return;}") < 0,
    'the old handler that returned after a no-op init is gone');

  console.log('\n[the click drives the OAuth flow]');
  ok(ui.indexOf('function googleShowOfficialButton') >= 0,
    'the click reveals the real GIS control rather than faking one');
  ok(/querySelector\('div\[role="button"\],iframe'\)/.test(ui),
    'both the FedCM div and the iframe fallback are detected');
  ok(/const drawn=googleShowOfficialButton\(\);\s*if\(drawn\)return true;/.test(ui),
    'the genuine control takes precedence over the One Tap fallback');
  ok(ui.indexOf('googleTriggerOAuthFlow') < 0,
    'the synthetic-click helper is gone (it silently no-opped on an iframe)');
  ok(/function googleOpenPrompt\(fromGesture\)\{/.test(ui),
    'the prompt helper knows whether a real user gesture is available');
  ok(/if\(fromGesture\)\{[\s\S]{0,200}?google\.accounts\.id\.prompt\(\)/.test(ui),
    'One Tap is only attempted where a real click supplies the gesture');
  ok(/if\(googleSignInReady\)return googleOpenPrompt\(true\)/.test(ui),
    'a genuine click passes the gesture flag');
  ok(/if\(googlePromptPending\)\{googlePromptPending=false;googleOpenPrompt\(false\);\}\}/.test(ui),
    'the deferred post-load call does not pretend to have a gesture');

  console.log('\n[successful connection transitions into the app]');
  ok(ui.indexOf('function authTransition') >= 0, 'a single post-auth transition exists');
  ok(/function authTransition\(\)\{[\s\S]{0,260}?enterApp\(\)/.test(ui),
    'the transition dismisses the dialog and start screen and focuses the grid');
  ok(/function authTransition\(\)\{[\s\S]{0,320}?syncStorageUi\(\)/.test(ui),
    'the transition re-syncs the storage UI');
  ok(/function googleCredentialHandler\(resp\)\{[\s\S]{0,420}?authTransition\(\)/.test(ui),
    'a Google credential runs the transition');
  ok(/Account\.signInWithGoogle\(resp\.credential\)/.test(ui),
    'the Google credential is exchanged for an account session');
  ok(ui.indexOf('function driveConnectAfterAuth') >= 0,
    'a Google sign-in hands the account to its Drive backend');
  ok(/DriveBooks\.connect\(\)\.then\(res=>\{[\s\S]{0,160}?driveConnected/.test(ui),
    'a granted Drive connection is reported');
  ok(/\{enterApp\(\);renderUserChip\(\);/.test(ui) === false,
    'the Google path no longer carries its own copy of the redirect');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
