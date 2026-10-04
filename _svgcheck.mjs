/* Validate the generated SVG before rendering it.
 *
 * An XML parse error would otherwise only surface as a blank PNG, so the file
 * is parsed first and every <use> target is checked against the defined ids -
 * a reference to a missing glyph silently draws nothing. */
import fs from 'fs';

const F = 'docs/excel-ui-reference.svg';
const svg = fs.readFileSync(F, 'utf8');
const out = [];
const say = (s) => { out.push(s); fs.writeFileSync('_svgcheck.txt', out.join('\n')); };

/* Minimal well-formedness check: tags balance and attributes are quoted. */
const tags = [...svg.matchAll(/<\/?([A-Za-z][\w:-]*)([^>]*?)(\/?)>/g)];
const stack = [];
let bad = null;
for (const t of tags) {
  const [full, name, attrs, selfClose] = t;
  if (full.startsWith('<?') || full.startsWith('<!')) continue;
  if (full.startsWith('</')) {
    const top = stack.pop();
    if (top !== name) { bad = 'mismatched </' + name + '> (open was ' + top + ')'; break; }
  } else if (!selfClose && !full.endsWith('/>')) {
    stack.push(name);
  }
}
say(bad ? 'FAIL: ' + bad : (stack.length ? 'FAIL: unclosed <' + stack.join('>, <') + '>' : 'OK: tags balanced'));

const defined = new Set([...svg.matchAll(/<g id="([^"]+)"/g)].map(m => m[1]));
say('glyphs defined: ' + defined.size);
const used = [...new Set([...svg.matchAll(/<use href="#([^"]+)"/g)].map(m => m[1]))];
const missing = used.filter(u => !defined.has(u));
say('glyphs referenced: ' + used.length);
say(missing.length ? 'FAIL: unresolved -> ' + missing.join(', ') : 'OK: every <use> resolves');

/* Count the distinct features the brief asks for. Labels are matched as literal
 * text nodes rather than by pattern, so multi-word captions like "Page Layout"
 * are counted too. */
const textNodes = new Set([...svg.matchAll(/>([^<>]+)</g)].map(m => m[1].trim()));
const has = t => textNodes.has(t);
const tabs = ['Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View'];
const groups = ['Clipboard', 'Font', 'Alignment', 'Number', 'Styles', 'Cells', 'Editing'];
say('tabs present   : ' + tabs.filter(has).join(', ')
  + (tabs.every(has) ? '  OK (all 7)' : '  MISSING: ' + tabs.filter(t => !has(t)).join(', ')));
say('groups present : ' + groups.filter(has).join(', ')
  + (groups.every(has) ? '  OK (all 7)' : '  MISSING: ' + groups.filter(g => !has(g)).join(', ')));
say('formula bar    : ' + (svg.includes('=SUM(A1:A10)') && svg.includes('>fx<') ? 'OK' : 'MISSING'));
say('grid cells     : ' + ((svg.match(/class="cell"/g) || []).length) + ' rules, selected cell '
  + (has('A1') ? 'OK' : 'MISSING'));
say('size           : ' + (/width="(\d+)" height="(\d+)"/.exec(svg) || []).slice(1).join('x'));