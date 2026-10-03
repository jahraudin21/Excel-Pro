/* Exercise landing.js in a minimal DOM sandbox.
 *
 * The gate is client-side, so a Python-only test proves the server half but
 * not the unlock. This drives the real landing.js with stub fetch responses for
 * /api/session and /api/otp/verify and asserts the gate classes flip.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('  PASS ' + msg); }
  else { failed++; console.log('  FAIL ' + msg); }
}

/* Minimal element stubs covering exactly what landing.js touches. */
function el(id, tag) {
  const node = {
    id, tagName: (tag || 'div').toUpperCase(), textContent: '', value: '',
    hidden: false, disabled: false, className: '', _classes: new Set(),
    attrs: {}, dataset: {}, style: {}, children: [], listeners: {},
    classList: {
      add(c) { node._classes.add(c); },
      remove(c) { node._classes.delete(c); },
      contains(c) { return node._classes.has(c); },
      toggle(c, on) { if (on === undefined) { node._classes.has(c) ? node._classes.delete(c) : node._classes.add(c); } else if (on) { node._classes.add(c); } else { node._classes.delete(c); } }
    },
    setAttribute(k, v) { node.attrs[k] = v; },
    getAttribute(k) { return node.attrs[k]; },
    removeAttribute(k) { delete node.attrs[k]; },
    addEventListener(t, fn) { (node.listeners[t] = node.listeners[t] || []).push(fn); },
    focus() { doc.activeElement = node; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    value: ''
  };
  return node;
}

const ids = ['gate', 'gateBody', 'unlockedText', 'signupModal', 'modalAlert',
  'suName', 'suEmail', 'suPassword', 'suSubmit', 'pwFill', 'pwMeter', 'pwHint',
  'stepDetails', 'stepOtp', 'otpCode', 'otpSubmit', 'otpHint', 'openLogin',
  'resendOtp', 'backToDetails', 'signupForm', 'otpForm'];

const nodes = {};
ids.forEach(id => { nodes[id] = el(id); });

/* Ship the gate in the locked state, as the template does. */
nodes.gate._classes.add('is-locked');
nodes.gateBody.setAttribute('aria-hidden', 'true');

const triggers = [el('cta-hero', 'button'), el('cta-veil', 'button')];
const doc = {
  readyState: 'complete',
  activeElement: null,
  getElementById: id => nodes[id] || null,
  querySelectorAll: sel => (sel === '[data-open-signup]' ? triggers : []),
  addEventListener: () => {}
};
const window = { location: { href: '' } };

function run(sessionPayload) {
  const sandbox = {
    document: doc, window, console,
    fetch: () => Promise.resolve({
      status: 200,
      json: () => Promise.resolve(sessionPayload)
    }),
    setTimeout, clearTimeout, Promise, JSON, Object, Array, RegExp, Error
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'auth_app', 'static', 'landing.js'), 'utf8'), sandbox);
}

console.log('=== landing gate (DOM sandbox) ===');

console.log('\n--- anonymous visitor sees a locked gate ---');
run({ ok: true, authenticated: false });

setTimeout(() => {
  ok(nodes.gate._classes.has('is-locked'), 'gate stays locked with no session');
  ok(!nodes.gate._classes.has('is-unlocked'), 'no unlock class applied');
  ok(nodes.gateBody.getAttribute('aria-hidden') === 'true',
    'gated body remains aria-hidden');

  console.log('\n--- returning visitor with a session is unlocked ---');
  const saved = nodes.gate._classes;
  saved.clear();
  saved.add('is-locked');
  nodes.gateBody.setAttribute('aria-hidden', 'true');
  run({ ok: true, authenticated: true, user: { name: 'Ada Lovelace' } });

  setTimeout(() => {
    ok(nodes.gate._classes.has('is-unlocked'), 'gate unlocks for an authenticated user');
    ok(!nodes.gate._classes.has('is-locked'), 'locked class removed');
    ok(nodes.gateBody.getAttribute('aria-hidden') === undefined,
      'aria-hidden removed so the content is reachable');

    console.log('\n%d passed, %d failed', passed, failed);
    process.exit(failed ? 1 : 0);
  }, 30);
}, 30);