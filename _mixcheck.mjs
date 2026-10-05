/* Reports which ribbon rows mix a 48px tile with 22px commands. Two notions of
 * "mixed" are shown, because the UI test and the layout reality differ:
 *   strict - a big tile and an uncorrected .rbtn as siblings. This is a real
 *            fault: the tile's 18px icon sits ~7px above the row's baseline.
 *   stack  - a big tile beside a .rstack. This is deliberate: the stack is a
 *            two-command column and the stylesheet corrects its 2px offset with
 *            the 4.2px rule, so the pair lines up rather than clashing.
 *   node _mixcheck.mjs
 */
import fs from 'fs';
const html = fs.readFileSync('index.html', 'utf8');

const rows = [...html.matchAll(/<div class="rrow">([\s\S]*?)<\/div>/g)].map(m => m[1]);
const hasTile = row => /class="rbtn big"/.test(row);
const hasStack = row => /class="rstack"/.test(row);
/* Drop a .rstack and everything in it, so only short commands that sit directly
   beside the tile are left. The .rcaret spans go first: each one closes before
   its stack does, so stopping at their </span> would leave the stack's own
   buttons behind and misreport a corrected row as a fault. */
const dropStacks = row => row
  .replace(/<span class="rcaret">[\s\S]*?<\/span>/g, '')
  .replace(/<span class="rstack">[\s\S]*?<\/span>/g, '');
const strict = row => {
  if (!hasTile(row)) return false;
  return /class="rbtn"/.test(dropStacks(row).replace(/class="rbtn big"/g, ''));
};

const shown = rows.map((row, i) => ({ i, row }))
  .filter(x => hasTile(x.row) && (strict(x.row) || hasStack(x.row)));
shown.forEach(({ i, row }) => {
  const ids = [...row.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  console.log('row ' + i + ': ' + ids.join(', ')
    + (strict(row) ? '   <- FAULT: uncorrected .rbtn beside the tile'
                   : '   ok: corrected .rstack beside the tile'));
});

const first12 = rows.filter((_, i) => i < 12);
const faults = first12.filter(strict);
console.log('\ndefault-tab rows mixing a tile with 22px commands: ' + faults.length
  + '  (the UI test needs 0)');
faults.forEach((_, k) => console.log('  fault at default-tab row index ' + k));