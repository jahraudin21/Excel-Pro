// _test_fix.js - acceptance test for _fix_prim.js.
// 1. Builds a mangled copy of js/script.js: lines 615..620 get one extra
//    leading space (6/6/5/4/4/3) and the ) of expect(')');} moves out of the
//    quotes -> expect(''));}.
// 2. Runs _fix_prim.js on that copy and requires byte-for-byte equality with
//    the current (correct) js/script.js.
// 3. Runs the fixer again to prove it is a no-op on normalized text.
const fs = require('fs');
const cp = require('child_process');
const DIR = 'c:/New folder';
const FIXER = DIR + '/_fix_prim.js';
const REAL = DIR + '/js/script.js';
const FIXTURE = DIR + '/_prim_mangled.tmp';

const src = fs.readFileSync(REAL, 'utf8');
const lines = src.split('\n');   // split/join on '\n' is byte-preserving either way

const six = [614, 615, 616, 617, 618, 619];   // 1-based 615..620
six.forEach(i => { lines[i] = ' ' + lines[i]; });
const expectBefore = lines[615];
lines[615] = lines[615].replace("expect(')');}", "expect(''));}");
if (expectBefore === lines[615]) { console.log('SETUP FAIL: expect line not mangled'); process.exit(1); }

console.log('mangled fixture (six lines):');
const want = [6, 6, 5, 4, 4, 3];
six.forEach((i, k) => {
  const sp = (lines[i].match(/^ */) || [''])[0].length;
  const ok = sp === want[k];
  console.log('  line ' + (i + 1) + ' spaces=' + sp + ' (want ' + want[k] + ') ' + (ok ? 'OK' : 'BAD') + ' ' + JSON.stringify(lines[i]));
  if (!ok) { console.log('SETUP FAIL: wrong indent'); process.exit(1); }
});

fs.writeFileSync(FIXTURE, lines.join('\n'), 'utf8');

const out1 = cp.execFileSync('node', [FIXER, FIXTURE], { encoding: 'utf8' });
console.log('run 1:', out1.trim());

const fixed = fs.readFileSync(FIXTURE, 'utf8');
if (fixed !== src) {
  const a = fixed.split('\n'), b = src.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.log('DIFF at line ' + (i + 1));
      console.log('  got: ' + JSON.stringify(a[i]));
      console.log('  exp: ' + JSON.stringify(b[i]));
    }
  }
  console.log('FAIL: normalized fixture does not match js/script.js');
  process.exit(1);
}
console.log('PASS: mangled fixture normalized byte-for-byte to js/script.js');

const out2 = cp.execFileSync('node', [FIXER, FIXTURE], { encoding: 'utf8' });
console.log('run 2:', out2.trim());
if (out2.indexOf('nothing to normalize') === -1) { console.log('FAIL: fixer is not idempotent'); process.exit(1); }
console.log('PASS: idempotent (second run is a no-op)');

fs.unlinkSync(FIXTURE);
console.log('ALL FIXER TESTS PASSED');
