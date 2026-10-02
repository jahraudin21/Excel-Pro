'use strict';
/* Regression test for the authentication state-sync fixes.

   Three defects are covered:
     1. Account.currentUser() dropped a stale session token only in memory, so a
        session naming an account that no longer exists was re-read on every boot.
     2. The storage-preference radios and the backstage Account / Storage /
        Cloud-saves rows were written once at boot and never followed the signed-in
        account (Google accounts default to Drive, so they showed the wrong value).
     3. The account-change handler called Account.getApiKey(), which *creates and
        persists* a monthly key, so merely signing in wrote an API key nobody asked
        for.
   plus the wiring that keeps the Drive button label and the OneDrive page live. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('  PASS ' + msg); }
  else { failed++; console.log('  FAIL ' + msg); }
}

const ACCOUNT_SRC = fs.readFileSync(path.join(__dirname, 'js', 'account.js'), 'utf8');
const ACCOUNT_UI_SRC = fs.readFileSync(path.join(__dirname, 'js', 'account-ui.js'), 'utf8');
const SCRIPT_SRC = fs.readFileSync(path.join(__dirname, 'js', 'script.js'), 'utf8');

/* Pull a single function out of a module so the test need not boot the whole UI
   (which self-boots against a live DOM). Same helper as _test_new_account_reset.js. */
function extractFn(source, name) {
  const start = source.indexOf('function ' + name);
  if (start < 0) throw new Error(name + ' not found');
  const open = source.indexOf('{', start);
  let depth = 0, end = -1;
  for (let k = open; k < source.length; k++) {
    if (source[k] === '{') depth++;
    else if (source[k] === '}') { depth--; if (!depth) { end = k + 1; break; } }
  }
  if (end < 0) throw new Error(name + ' is unbalanced');
  return source.slice(start, end);
}

/* ---------- account.js: session token persistence ---------- */
function accountSandbox(store) {
  const sandbox = {
    console,
    TextEncoder, TextDecoder,
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    crypto: globalThis.crypto,
    document: { querySelector: () => null },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    __store: store
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(ACCOUNT_SRC + '\nglobalThis.__Account = Account;', ctx, { filename: 'account.js' });
  return ctx;
}

/* ---------- account-ui.js: syncStorageUi() ---------- */
function syncSandbox() {
  const els = Object.create(null);
  const radios = [
    { value: 'browser', checked: false },
    { value: 'cloud', checked: false },
    { value: 'drive', checked: false }
  ];
  const calls = { paint: 0 };
  const sandbox = {
    console,
    document: { querySelectorAll: sel => (sel === 'input[name="storagePref"]' ? radios : []) },
    $: id => (els[id] = els[id] || { textContent: '' }),
    T: k => 'T:' + k,
    Account: { currentUser: () => sandbox.__user },
    StorageBooks: { pref: () => sandbox.__pref, list: () => Promise.resolve(sandbox.__books) },
    CloudBooks: { list: () => Promise.resolve([]) },
    paintDriveBtn: () => { calls.paint++; },
    __user: { email: 'g@example.com', name: 'G' },
    __pref: 'drive',
    __books: [{}, {}, {}],
    __radios: radios,
    __els: els,
    __calls: calls
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(extractFn(ACCOUNT_UI_SRC, 'syncStorageUi') + '\nglobalThis.__sync = syncStorageUi;', ctx);
  return ctx;
}

async function main() {
  console.log('=== auth state sync ===');

  console.log('\n[session tokens that name a vanished account are dropped]');
  const store = Object.create(null);
  store['mx-users-v1'] = JSON.stringify([{ id: 'real-user', email: 'a@b.c', name: 'A', hash: 'x' }]);
  store['mx-session-v1'] = JSON.stringify({ id: 'ghost-user', at: Date.now() });
  const ghost = accountSandbox(store);
  ok(ghost.__Account.currentUser() === null, 'a session for a deleted account signs nobody in');
  ok(!Object.prototype.hasOwnProperty.call(store, 'mx-session-v1'),
    'the dead session token is removed instead of re-read on every boot');

  store['mx-session-v1'] = JSON.stringify({ id: 'real-user', at: Date.now() });
  const live = accountSandbox(store);
  ok(!!live.__Account.currentUser() && live.__Account.currentUser().id === 'real-user',
    'a valid session still resolves to its user');
  ok(Object.prototype.hasOwnProperty.call(store, 'mx-session-v1'), 'a valid session is kept');

  console.log('\n[the storage UI follows the signed-in account]');
  const s = syncSandbox();
  s.__sync();
  ok(s.__radios.find(r => r.value === 'drive').checked === true,
    'the Drive radio reflects the account preference');
  ok(s.__radios.find(r => r.value === 'browser').checked === false, 'the other radios are cleared');
  ok(s.__els['#bsCloudUser'].textContent === 'g@example.com', 'the backstage account row shows the email');
  ok(s.__els['#bsCloudPref'].textContent === 'T:storageDrive', 'the backstage storage row shows the preference');
  ok(s.__calls.paint === 1, 'the Drive connect/disconnect button is repainted');
  await new Promise(r => setImmediate(r));
  ok(s.__els['#bsCloudCount'].textContent === '3', 'the cloud-save count comes from the live provider');

  s.__user = null;
  s.__books = [];
  s.__sync();
  ok(s.__els['#bsCloudUser'].textContent === '\u2014', 'signed out, the account row falls back to a dash');
  ok(s.__els['#bsCloudCount'].textContent === '0', 'signed out, the cloud-save count is zero');

  console.log('\n[drive status strings are translatable]');
  ['disconnectDrive', 'driveConnected', 'driveSaved', 'driveSaveFailed', 'driveNeedConnect'].forEach(k => {
    ok(ACCOUNT_UI_SRC.indexOf(k + ':{np:') >= 0, k + ' is defined in the i18n table');
  });
  ok(ACCOUNT_UI_SRC.indexOf("driveSaveFailed:'driveSaveFailed'") >= 0 &&
    ACCOUNT_UI_SRC.indexOf("driveNeedConnect:'driveNeedConnect'") >= 0,
    'AUTH_ERR maps the Drive error codes so failures are not a bare "Error"');

  console.log('\n[signing in no longer mints an API key]');
  ok(ACCOUNT_UI_SRC.indexOf("apiKeyInput.value=k?'\u25cf'.repeat(16)") < 0,
    'the account-change handler no longer calls Account.getApiKey()');
  ok(ACCOUNT_UI_SRC.indexOf('Account.onChange(()=>{if(apiKeyInput){apiKeyInput.value=') >= 0,
    'it only resets the masked placeholder');

  console.log('\n[the sync is wired into the account lifecycle]');
  ok(ACCOUNT_UI_SRC.indexOf('clearHeadersForNewAccount(Account.currentUser());syncStorageUi();') >= 0,
    'an account change re-syncs the storage UI');
  ok(ACCOUNT_UI_SRC.indexOf('syncStorageUi();}') >= 0, 'the profile panel syncs the storage UI at boot');
  ok(SCRIPT_SRC.indexOf("if(typeof syncStorageUi==='function')syncStorageUi()") >= 0,
    'the OneDrive backstage page refreshes the cloud rows');
  ok(SCRIPT_SRC.indexOf("if(typeof paintDriveBtn==='function')paintDriveBtn()") >= 0,
    'a language switch repaints the Drive connect/disconnect label');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}
main().catch(err => { console.error(err); process.exit(1); });