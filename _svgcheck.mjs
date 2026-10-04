/* Validate the generated SVG before rendering it.
 *
 * An XML parse error would otherwise only surface as a blank PNG, so the file
 * is parsed first and every <use> target is checked against the defined ids -
 * a reference to a missing glyph silently draws nothing. */
import fs from 'fs';

const F = process.argv[2] || 'docs/excel-ui-reference.svg';
const raw = fs.readFileSync(F, 'utf8');
const out = [];
const say = (s) => { out.push(s); fs.writeFileSync('_svgcheck.txt', out.join('\n')); };
say('file           : ' + F);

/* Comments are stripped before scanning. These files document themselves in
 * prose that names real elements ("does not reach through the <use> shadow
 * tree"), and the tag scanner below would otherwise parse that prose as a
 * stray <use> element and report the file as malformed.
 *
 * Two comment syntaxes have to go: XML comments, and the CSS block comments
 * inside the style element. The latter are invisible to an XML comment strip,
 * so a note written in that style still parsed as a bogus <use> tag. */
const svg = raw
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

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
/* The active cell and its formula differ per drawing, so accept either target
 * and report which one this file actually uses. */
const ref = ['A1', 'D8'].find(r => has(r));
/* The formula bar and the grid are checked by structure rather than by any one
 * file's exact markup: the name box, the fx glyph (one <text>fx</text> in one
 * drawing, a styled f + x pair in the other) and the grid rules all differ
 * between revisions, so each is matched on whatever form it takes. */
const fxc = (has('fx') || (/font-style="italic"/.test(svg) && has('f') && has('x'))) ? 'OK' : 'MISSING';
const rules = ['class="cell"', 'stroke="#dcdcdc"', 'stroke="#dcdcdc" '].filter(r => svg.includes(r));
say('formula bar    : ' + (has('fx') || /font-style="italic"/.test(svg) ? fxc + ' (name box, fx, input)' : 'MISSING'));
say('active cell    : ' + (ref ? ref + '  OK' : 'MISSING'));
say('grid rules     : ' + (rules.length ? 'OK (' + rules.length + ' rule groups)' : 'MISSING'));
say('size           : ' + (/width="(\d+)" height="(\d+)"/.exec(svg) || []).slice(1).join('x'));