'use strict';
/* Regression test: service worker (sw.js) + authentication guard (js/auth-guard.js).
   Both are loaded into VM sandboxes with stubbed browser globals, then
   exercised end-to-end: precache/offline fallbacks for the SW, and the
   lock / queue / intercept behaviour for the guard. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

/* Mirrors the URL resolution the service worker stub performs, so assertions can
   be written against the same relative paths listed in sw.js's precache array. */
const ORIGIN = 'https://example.test';
const ABS = u => (/^https?:\/\//.test(u) ? u : ORIGIN + '/' + String(u).replace(/^\.\//, ''));

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('  PASS ' + msg); }
  else { failed++; console.log('  FAIL ' + msg); }
}
function section(name) { console.log('\n[' + name + ']'); }

/* ---------- shared stubs ---------- */
function makeClassList() {
  const set = new Set();
  return {
    add: (...c) => c.forEach(x => set.add(x)),
    remove: (...c) => c.forEach(x => set.delete(x)),
    contains: c => set.has(c),
    toggle: (c, force) => {
      if (force === undefined) { set.has(c) ? set.delete(c) : set.add(c); }
      else { force ? set.add(c) : set.delete(c); }
      return set.has(c);
    }
  };
}
function makeEl(id) {
  return {
    id, dataset: {}, classList: makeClassList(), style: {},
    textContent: '', placeholder: '', title: '', onclick: null,
    querySelectorAll: () => [], closest: () => null
  };
}
function makeTarget(inside) {
  return { closest: sel => (inside.indexOf(sel) >= 0 ? { id: 'hit' } : null) };
}

/* ============ PART 1 - sw.js ============ */
function makeSwSandbox() {
  const net = { fail: new Set(), status: {}, calls: [] };
  const store = new Map();
  const listeners = {};

  /* The real Cache API keys entries by the *resolved absolute* request URL, so
     './js/script.js' and 'https://host/js/script.js' are the same entry. The stub
     must resolve the same way or precached assets can never be matched again. */
  const abs = ABS;

  class FakeRequest {
    constructor(url, opts) {
      this.url = abs(String(url));
      this.method = (opts && opts.method) || 'GET';
      this.mode = (opts && opts.mode) || 'no-cors';
      this.cache = (opts && opts.cache) || 'default';
    }
  }
  function makeRes(url, spec) {
    const s = spec || {};
    return {
      url,
      status: s.status === undefined ? 200 : s.status,
      type: s.type === undefined ? 'basic' : s.type,
      headers: { get: k => (k.toLowerCase() === 'cache-control' ? (s.cacheControl || null) : null) },
      body: s.body === undefined ? url : s.body,
      clone() { return makeRes(url, s); }
    };
  }
  const urlOf = r => abs(typeof r === 'string' ? r : r.url);

  const caches = {
    async open(name) {
      if (!store.has(name)) store.set(name, new Map());
      const m = store.get(name);
      return {
        async add(req) {
          const u = urlOf(req);
          if (net.fail.has(u)) throw new Error('404 ' + u);
          m.set(u, makeRes(u, net.status[u]));
        },
        async put(req, res) { m.set(urlOf(req), res); },
        async match(req) { return m.get(urlOf(req)) || null; }
      };
    },
    async keys() { return Array.from(store.keys()); },
    async delete(name) { return store.delete(name); },
    async match(req) {
      for (const m of store.values()) { const hit = m.get(urlOf(req)); if (hit) return hit; }
      return null;
    }
  };

  const self = {
    location: { origin: 'https://example.test' },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: () => { self.__skipped = true; return Promise.resolve(); },
    clients: { claim: () => { self.__claimed = true; return Promise.resolve(); } }
  };

  const sandbox = {
    console, self, caches, URL, Request: FakeRequest,
    /* store/net/listeners live in this closure, not in the VM global scope, so
       they must be exposed for the __sw handle appended to the source below. */
    listeners, store, net,
    fetch: (req) => {
      const u = urlOf(req);
      net.calls.push(u);
      if (net.fail.has(u)) return Promise.reject(new Error('offline'));
      return Promise.resolve(makeRes(u, net.status[u]));
    }
  };
  const ctx = vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8') +
    '\nglobalThis.__sw={STATIC_ASSETS,CACHE_NAME,listeners,store,net,self};';
  vm.runInContext(src, ctx, { filename: 'sw.js' });

  function fire(type, req) {
    let response = null;
    const waits = [];
    listeners[type]({
      request: req,
      respondWith: p => { response = p; },
      waitUntil: p => { waits.push(p); }
    });
    return { response, waits };
  }

  return { api: sandbox.__sw, net, store, makeRes, fire };
}

async function testServiceWorker() {
  section('sw.js - install / activate');
  const h = makeSwSandbox();
  const { api, net, store, makeRes } = h;

  ok(!!api, 'sw.js evaluates and exposes its constants');
  ok(Array.isArray(api.STATIC_ASSETS) && api.STATIC_ASSETS.indexOf('./index.html') >= 0,
    'precache list contains the app shell');

  /* Fail set is matched against resolved absolute URLs, so key it the same way. */
  net.fail.add(ABS('./js/drive.js'));
  const inst = h.fire('install', {});
  await Promise.all(inst.waits);
  ok(api.self.__skipped === true, 'install calls skipWaiting()');
  const own = store.get(api.CACHE_NAME);
  ok(!!own && own.size === api.STATIC_ASSETS.length - 1,
    'every reachable asset is precached (' + (own ? own.size : 0) + ')');
  ok(!!own.get(ABS('./js/auth-guard.js')), 'auth-guard.js is precached for offline use');

  store.set('excel-pro-v0', new Map([['./index.html', makeRes('./index.html')]]));
  const act = h.fire('activate', {});
  await Promise.all(act.waits);
  ok(!store.has('excel-pro-v0'), 'activate deletes stale cache versions');
  ok(store.has(api.CACHE_NAME), 'activate keeps the current cache');
  ok(api.self.__claimed === true, 'activate claims open clients');

  section('sw.js - fetch strategies');
  const req = (url, o) => Object.assign({ url, method: 'GET', mode: 'no-cors' }, o || {});
  const settle = () => new Promise(r => setImmediate(r));

  ok(h.fire('fetch', req('https://example.test/index.html', { method: 'POST' })).response === null,
    'POST requests are not intercepted');
  ok(h.fire('fetch', req('https://accounts.google.com/gsi/client')).response === null,
    'cross-origin (Google Sign-In) traffic bypasses the cache');

  const navRes = await h.fire('fetch', req('https://example.test/', { mode: 'navigate' })).response;
  ok(navRes && navRes.body === 'https://example.test/', 'navigation served from network when online');
  await settle();
  ok(store.get(api.CACHE_NAME).has('https://example.test/'), 'navigation response is written to cache');

  net.fail.add('https://example.test/');
  const offRes = await h.fire('fetch', req('https://example.test/', { mode: 'navigate' })).response;
  ok(offRes && offRes.body === ABS('./index.html'),
    'offline navigation falls back to the cached shell');

  /* Take this URL offline too, so the unknown-path branch is genuinely exercised. */
  net.fail.add('https://example.test/neverseen');
  const none = await h.fire('fetch', req('https://example.test/neverseen', { mode: 'navigate' })).response;
  /* sw.js intentionally answers ANY offline navigation with the cached shell, so
     an unknown URL is expected to resolve to index.html, not to undefined. */
  ok(none && none.body === ABS('./index.html'),
    'any offline navigation resolves to the cached app shell');

  net.calls.length = 0;
  const statRes = await h.fire('fetch', req('https://example.test/js/script.js')).response;
  ok(statRes && statRes.body === ABS('./js/script.js'), 'static asset served from cache (cache-first)');
  ok(net.calls.length === 1, 'cached asset is still revalidated in the background');

  const freshRes = await h.fire('fetch', req('https://example.test/js/newThing.js')).response;
  ok(freshRes && freshRes.body === 'https://example.test/js/newThing.js',
    'uncached static asset fetched from network');
  await settle();
  ok(store.get(api.CACHE_NAME).has('https://example.test/js/newThing.js'),
    'network response backfills the cache');

  net.status['https://example.test/js/secret.js'] = { cacheControl: 'no-store' };
  await h.fire('fetch', req('https://example.test/js/secret.js')).response;
  await settle();
  ok(!store.get(api.CACHE_NAME).has('https://example.test/js/secret.js'),
    'no-store responses are not cached');

  net.status['https://example.test/js/err.js'] = { status: 500 };
  const errRes = await h.fire('fetch', req('https://example.test/js/err.js')).response;
  ok(errRes && errRes.status === 500, 'error responses still reach the page');
  await settle();
  ok(!store.get(api.CACHE_NAME).has('https://example.test/js/err.js'),
    'non-200 responses are not cached');

  const missing = api.STATIC_ASSETS.filter(u =>
    u !== './' && !fs.existsSync(path.join(__dirname, u.replace(/^\.\//, ''))));
  ok(missing.length === 0, 'precache list matches the files on disk' +
    (missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''));
}

/* ============ PART 2 - js/auth-guard.js ============ */
function makeGuardSandbox() {
  const els = {
    authLock: makeEl('authLock'),
    authLockCta: makeEl('authLockCta'),
    authLockSignIn: makeEl('authLockSignIn'),
    authDialog: makeEl('authDialog'),
    userChip: makeEl('userChip')
  };
  const listeners = { capture: {}, bubble: {} };
  const doc = {
    body: makeEl('body'),
    readyState: 'complete',
    addEventListener: (type, fn, capture) => {
      (capture ? listeners.capture : listeners.bubble)[type] = fn;
    }
  };
  const changeHandlers = [];
  let user = null;
  const sandbox = {
    console, document: doc, setTimeout, clearTimeout,
    __opened: [], __status: null, __chip: 0,
    STR: {},
    Account: {
      currentUser: () => user,
      onChange: fn => changeHandlers.push(fn)
    },
    $: sel => els[sel.replace('#', '')] || null,
    T: k => (sandbox.STR[k] && sandbox.STR[k].en) || k,
    setStatusMode: m => { sandbox.__status = m; },
    renderUserChip: () => { sandbox.__chip++; },
    openAuthDialog: mode => { sandbox.__opened.push(mode); }
  };
  const ctx = vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(__dirname, 'js', 'auth-guard.js'), 'utf8') +
    '\nglobalThis.__g=AuthGuard;';
  vm.runInContext(src, ctx, { filename: 'auth-guard.js' });

  function fire(type, target, extra) {
    let prevented = false, stopped = false, bubbleRan = false;
    const e = Object.assign({
      key: '', target,
      preventDefault() { prevented = true; },
      stopPropagation() { stopped = true; }
    }, extra || {});
    const cap = listeners.capture[type];
    if (cap && !stopped) cap(e);
    const bub = listeners.bubble[type];
    if (bub && !stopped) { bubbleRan = true; bub(e); }
    return { prevented, stopped, bubbleRan };
  }
  const signIn = u => { user = u; changeHandlers.forEach(fn => fn()); };

  return { api: sandbox.__g, sandbox, els, doc, fire, signIn };
}

async function testAuthGuard() {
  section('auth-guard.js - boot state');
  const g = makeGuardSandbox();
  const { api, sandbox, els, fire, signIn } = g;

  ok(!!api, 'auth-guard.js evaluates and exposes AuthGuard');
  ok(!!sandbox.STR.lockTitle && !!sandbox.STR.lockCta, 'lock UI strings are added to STR');
  ok(api.locked === true, 'app starts locked when nobody is registered');
  ok(els.authLock.classList.contains('open'), 'lock overlay #authLock is shown');
  ok(sandbox.document.body.classList.contains('auth-locked'),
    'body.auth-locked is set (drives the CSS inertness)');

  section('auth-guard.js - gating features');
  let ran = 0;
  /* The SAME callback is passed twice on purpose: require() must de-duplicate it
     so unlocking replays the blocked feature exactly once. */
  const blocked = () => { ran++; };
  ok(api.require(blocked) === false, 'require() blocks a feature while locked');
  ok(ran === 0, 'blocked feature does not run');
  ok(sandbox.__status === 'Please create an account first', 'status bar explains why');
  ok(api.require(blocked) === false && sandbox.__opened.length === 0,
    'require() does not spam the auth dialog');
  ok(api._queue.length === 1, 'the same blocked action is queued only once');

  signIn({ id: 'u1', name: 'Asha', email: 'asha@example.com' });
  ok(ran === 1, 'the queued feature is replayed once the user registers');
  ok(api.locked === false, 'app unlocks after registration');
  ok(!els.authLock.classList.contains('open'), 'lock overlay is hidden after registration');
  ok(!sandbox.document.body.classList.contains('auth-locked'), 'body.auth-locked is cleared');

  let ran2 = 0;
  ok(api.require(() => { ran2++; }) === true, 'require() passes through when registered');
  ok(ran2 === 1, 'feature runs immediately when registered');

  section('auth-guard.js - cannot be dismissed while locked');
  ok(api.canCloseAuthDialog() === true, 'auth dialog is dismissible when registered');
  api.lock();
  ok(api.canCloseAuthDialog() === false, 'auth dialog is NOT dismissible while locked');

  section('auth-guard.js - event interception');
  let shortcutFired = 0;
  g.doc.addEventListener('keydown', () => { shortcutFired++; }, false);

  const appClick = fire('click', makeTarget(['#app', '.rbtn']));
  ok(appClick.prevented && !appClick.bubbleRan, 'clicks on the app surface are swallowed while locked');
  ok(shortcutFired === 0, 'click interceptor leaves unrelated listeners alone');

  const dlgClick = fire('click', makeTarget(['#authDialog']));
  ok(!dlgClick.prevented, 'the auth dialog stays clickable while locked');

  const lockClick = fire('click', makeTarget(['#authLock']));
  ok(!lockClick.prevented, 'the lock overlay stays clickable');

  const key = fire('keydown', makeTarget(['#app']), { key: 'z', ctrlKey: true });
  ok(key.stopped && !key.bubbleRan, 'keyboard shortcuts are blocked while locked');
  ok(shortcutFired === 0, "script.js document shortcuts never fire while locked");

  const keyInDlg = fire('keydown', makeTarget(['#authDialog']), { key: 'a' });
  ok(!keyInDlg.stopped, 'typing inside the auth dialog is not blocked');

  const tab = fire('keydown', makeTarget(['#app']), { key: 'Tab' });
  ok(!tab.stopped, 'Tab is allowed so focus can cycle in the dialog');

  section('auth-guard.js - lock card wiring & sign-out');
  sandbox.__opened.length = 0;
  els.authLockCta.onclick();
  ok(sandbox.__opened[0] === 'signup', 'lock CTA opens the sign-up form');
  ok(!els.authLock.classList.contains('open'),
    'the lock overlay is hidden once the CTA hands over to the sign-up modal');
  ok(api.locked === true, 'the app stays locked while the sign-up modal is open');
  ok(sandbox.document.body.classList.contains('auth-locked'),
    'app surfaces stay inert until a session exists');

  els.authLockSignIn.onclick();
  ok(sandbox.__opened[1] === 'signin', 'lock secondary button opens the sign-in form');
  ok(!els.authLock.classList.contains('open'),
    'the lock overlay stays hidden for the sign-in hand-off');

  /* A blocked action calling require() again must not re-raise the veil over the
     modal the user is working in. */
  els.authDialog.classList.add('open');
  api.lock();
  ok(!els.authLock.classList.contains('open'),
    'lock() does not re-raise the veil over an open dialog');
  els.authDialog.classList.remove('open');

  signIn(null);
  ok(api.locked === true, 'signing out re-locks the app');
  ok(els.authLock.classList.contains('open'), 'lock overlay returns after sign-out');

  const after = fire('keydown', makeTarget(['#app']), { key: 's', ctrlKey: true });
  ok(!after.bubbleRan, 'shortcuts are blocked again after sign-out');

  section('auth-guard.js - overlay click opens the login modal');
  ok(typeof els.authLock.onclick === 'function', 'the lock overlay carries an onclick listener');
  /* The real handler receives a click event; the harness passes the target via
     an event-like object, exactly as fire() builds one. */
  sandbox.__opened.length = 0;
  els.authLock.onclick({ target: makeTarget(['#authLock']) });
  ok(sandbox.__opened[0] === 'signin', 'clicking the dimmed backdrop opens the sign-in modal');
  ok(api.locked === true, 'the app stays locked until the sign-in succeeds');
  ok(!els.authLock.classList.contains('open'), 'the backdrop click also hides the veil');

  /* A real tap on the card bubbles to the overlay; it must not hijack the button
     that was actually pressed (e.g. "Create account"). */
  sandbox.__opened.length = 0;
  els.authLock.onclick({ target: makeTarget(['#authLock', '.lockCard']) });
  ok(sandbox.__opened.length === 0, 'a click inside the card is left to the card buttons');

  /* A click with no target (synthetic / programmatic) must not throw. */
  sandbox.__opened.length = 0;
  els.authLock.onclick({});
  ok(sandbox.__opened[0] === 'signin', 'a target-less click still opens the modal');

  sandbox.__opened.length = 0;
  ok(api.openLogin() === true, 'openLogin() keeps the lock while nobody is signed in');
  ok(sandbox.__opened[sandbox.__opened.length - 1] === 'signin', 'openLogin() raises the sign-in modal');

  signIn({ id: 'u-overlay' });
  ok(api.locked === false, 'a successful login sets the lock state to false');
  ok(!els.authLock.classList.contains('open'), 'the overlay is hidden once unlocked');
  ok(!document_locked(sandbox), 'body.auth-locked is cleared once unlocked');
}

/* The unlocked state must also drop the veil class from <body>. */
function document_locked(sandbox) {
  return sandbox.document.body.classList.contains('auth-locked');
}

/* ============ PART 3 - index.html / styles.css wiring ============ */
function testWiring() {
  section('index.html / styles.css wiring');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, 'css', 'styles.css'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));

  ok(/navigator\.serviceWorker\.register\(\s*['"]\.\/sw\.js['"]/.test(head),
    'index.html registers ./sw.js');
  ok(head.indexOf('serviceWorker') > -1, 'service worker registration lives in the <head>');
  ok(html.indexOf('js/auth-guard.js') > -1, 'auth-guard.js is loaded by index.html');
  ok(html.indexOf('id="authLock"') > -1 && html.indexOf('id="authLockCta"') > -1 &&
    html.indexOf('id="authLockSignIn"') > -1, 'lock overlay markup is present');
  ok(css.indexOf('body.auth-locked') > -1, 'styles.css has body.auth-locked rules');
  ok(css.indexOf('#authLock') > -1 && css.indexOf('.lockCard') > -1,
    'styles.css styles the lock overlay');
  ok(/body\.auth-locked #app>\*:not\(#authLock\)/.test(css),
    'locked CSS makes app surfaces inert without disabling the auth dialog');
}

async function main() {
  console.log('========================================');
  console.log(' Service Worker + Auth Guard tests');
  console.log('========================================');
  try { await testServiceWorker(); }
  catch (e) { failed++; console.log('  FAIL sw.js threw: ' + e.stack); }
  try { await testAuthGuard(); }
  catch (e) { failed++; console.log('  FAIL auth-guard.js threw: ' + e.stack); }
  try { testWiring(); }
  catch (e) { failed++; console.log('  FAIL wiring check threw: ' + e.stack); }

  console.log('\n========================================');
  console.log(' ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================');
  process.exit(failed ? 1 : 0);
}

main();