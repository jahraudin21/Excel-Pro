/* Scratch: ground-truth check of which FN_CATS names are implemented on FN.
 * Extracts the FN definition blocks by brace counting (regexes lie about
 * nested `})` inside arrow bodies), then evaluates just those blocks. */
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('js/script.js', 'utf8') + '\n' + fs.readFileSync('js/drawDesign.js', 'utf8');

function objectLiteral(text, openBrace) {
  let depth = 0;
  for (let i = openBrace; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(openBrace, i + 1); }
  }
  return null;
}

const blocks = [];
for (const m of src.matchAll(/(?:const FN\s*=\s*|Object\.assign\(\s*FN\s*,\s*)/g)) {
  const brace = src.indexOf('{', m.index + m[0].length);
  if (brace < 0) continue;
  const lit = objectLiteral(src, brace);
  if (lit) blocks.push(lit);
}
console.log('found FN definition blocks:', blocks.length);

const ctx = { Math, JSON, Object, Array, String, Number, isNaN, parseInt, parseFloat, Date };
vm.createContext(ctx);
vm.runInContext('let FN={};\n' + blocks.map(b => 'Object.assign(FN,' + b + ')').join(';\n') + ';\nglobalThis.__FN=FN;', ctx);

const FN = ctx.__FN;
console.log('FN has', Object.keys(FN).length, 'functions');

const catsSrc = src.match(/const FN_CATS=(\{[\s\S]*?\n\});/)[1];
const FN_CATS = vm.runInNewContext('(' + catsSrc + ')');
const missing = [];
for (const cat of Object.keys(FN_CATS)) {
  const m = FN_CATS[cat].filter(n => typeof FN[n] !== 'function');
  if (m.length) missing.push('  ' + cat + ': ' + m.join(', '));
}
console.log('FN_CATS entries WITHOUT an FN implementation:');
console.log(missing.join('\n') || '  none');
console.log('ALL FN KEYS:');
console.log(Object.keys(FN).sort().join(','));

/* Definitive: does the bare uppercase word appear ANYWHERE outside the two
   registry literals (FN_CATS / FN_HELP)? If not, it is unimplemented. */
const want = ['PROPER', 'LEFT', 'MID', 'RIGHT', 'TEXT', 'VALUE', 'REPT',
  'SUBSTITUTE', 'REPLACE', 'FIND', 'SEARCH', 'IFNA', 'TRUE', 'FALSE',
  'ISBLANK', 'ISNUMBER', 'ISTEXT', 'ISEVEN', 'ISODD'];
const raw = fs.readFileSync('js/script.js', 'utf8');
const lines = raw.split('\n');
const REG = 518; /* 0-based index of the FN_CATS line region 519..532 */
for (const w of want) {
  const re = new RegExp('\\b' + w + '\\b');
  const elsewhere = [];
  lines.forEach((l, i) => {
    if (i >= REG && i <= REG + 14) return;      /* FN_CATS + FN_HELP lines */
    if (re.test(l)) elsewhere.push(i + 1);
  });
  if (elsewhere.length) console.log('  ' + w + ' also at lines ' + elsewhere.join(','));
}
console.log('WORLD SCAN DONE');

/* Any FN.NAME style registration anywhere in js/? */
for (const f of fs.readdirSync('js').filter(x => x.endsWith('.js'))) {
  const s = fs.readFileSync('js/' + f, 'utf8');
  const m = s.match(/FN\.[A-Z]+/g);
  if (m) console.log(f, 'FN.<name> assignments:', [...new Set(m)].join(','));
}
console.log('DONE');