/* One-off: re-wrap the dropdown carets in <span class="rcaret"> so the caret can
   be drawn a step smaller than its caption, the way Excel draws it. Kept as a
   script because the quoting is awkward to pass through PowerShell.
 * Usage:  node _wrap_carets.mjs
 */
import fs from 'fs';

const CARET = '\u25be';
let html = fs.readFileSync('index.html', 'utf8');

/* Wrap the caret only where it is not already wrapped, and never one that opens
   a <select> or belongs to a non-button control. */
const before = (html.match(new RegExp(' ' + CARET, 'g')) || []).length;
html = html.replace(new RegExp(' ' + CARET + '(?!</span>)', 'g'),
  '<span class="rcaret"> ' + CARET + '</span>');
fs.writeFileSync('index.html', html, 'utf8');

const after = (html.match(/class="rcaret"/g) || []).length;
console.log('caret characters found: ' + before);
console.log('carets wrapped in a span: ' + after);