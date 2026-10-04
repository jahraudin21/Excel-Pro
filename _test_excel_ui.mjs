// Structural checks for the Excel-style UI: start screen, ribbon, account pill.
// Complements _ribboncheck.mjs (wiring) and _check.mjs (inline-script syntax).
import fs from 'fs';
import path from 'path';

// Resolved from the repo root, matching the other _*.mjs checkers in this repo.
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('index.html');
const css = read('css/styles.css');
const ss = read('js/start-screen.js');
const accountUi = read('js/account-ui.js');
const account = read('js/account.js');
const guard = read('js/auth-guard.js');
/* The ribbon/backstage wiring lives in the engine module, not the UI modules. */
const jsScript = read('js/script.js');
/* Every module that ships, so an encoding fault cannot hide in one of them. */
const extraModules = ['js/drawDesign.js', 'js/drive.js', 'js/ribbon-display.js', 'js/formulaAuditing.js'].map(read);

let pass = 0, fail = 0;
const chk = (label, cond) => { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } };

// ---------------------------------------------------------------- start screen
console.log('\n--- start screen (Excel Backstage) ---');
chk('recent, favorites AND templates tabs present',
  ['recent', 'favorites', 'templates'].every(t => new RegExp('data-ss-tab="' + t + '"').test(html)));
chk('each tab has its own pane', /id="ssPaneRecent"/.test(html) && /id="ssPaneFavorites"/.test(html)
  && /id="ssPaneTemplates"/.test(html));
chk('the templates pane is only shown on its own tab',
  /if\(tpl\)tpl\.hidden=activeTab!=='templates'/.test(ss)
  && /if\(activeTab!=='templates'\)renderList\(\)/.test(ss));
chk('both panes have their own .ssList host',
  /id="ssPaneRecent"><div class="ssList"/.test(html) && /id="ssPaneFavorites" hidden><div class="ssList"/.test(html));
chk('favorites list is filled, not just recent (regression guard)',
  /'ssPaneFavorites'\)/.test(ss) && /pane\?pane\.querySelector\('\.ssList'\)/.test(ss));
chk('templates section rendered', /id="ssTemplates"/.test(html) && /data-ss-tpl=/.test(ss));
chk('backstage left rail present', /class="ssRail"/.test(html) && /class="ssNav"/.test(html));
/* Excel's start screen is navigated from the left rail alone. The same three
   labels used to appear a second time in a horizontal strip above the pane,
   which is what put Recent / Favorites / Templates in the wrong place. */
const ssRailOrder = [...html.matchAll(/class="ssNavItem" data-ss-tab="([^"]+)"/g)].map(m => m[1]);
chk('rail is Templates / Recent / Favorites, once each',
  JSON.stringify(ssRailOrder) === JSON.stringify(['templates', 'recent', 'favorites']));
chk('no duplicate tab strip above the panes',
  !/class="ssTab"/.test(html) && !/class="ssTabs"/.test(html) && !/\.ssTab\{/.test(css));
chk('the rail is what the active section is mirrored onto',
  /querySelectorAll\('\.ssNavItem\[data-ss-tab\]'\)/.test(ss) && !/querySelectorAll\('\.ssTab'\)/.test(ss));
chk('rail nav items are wired to the tab handler', /closest\('\[data-ss-tab\]'\)/.test(ss));
chk('search box filters the list', /id="ssSearch"/.test(html) && /filtered\(\)/.test(ss) && /'ssNoMatch'/.test(ss));
chk('rows show name + location + last opened',
  /class="ssItemName"/.test(ss) && /locationOf\(item\)/.test(ss) && /'ssLastOpened'/.test(ss));
chk('favorite star + remove buttons still rendered', /data-ss-fav=/.test(ss) && /data-ss-del=/.test(ss));
chk('template tiles have a preview block', /ssTplPrev/.test(ss) && /\.ssTplPrev\{/.test(css));
chk('start screen is a full-bleed view, not a card',
  /#startScreen\{[^}]*position:fixed;inset:0/.test(css) && !/border-radius:16px/.test(css.split('/* ---------- Start screen')[1] || ''));

// ------------------------------------------------------------------- account
console.log('\n--- account profile (top corner) ---');
chk('account pill lives in the titlebar', /class="qbtn userChip" id="userChip"/.test(html));
chk('pill shows name and email', /id="userName"/.test(html) && /id="userMail"/.test(html));
chk('pill is pinned right via flex order', /\.userChip\{[^}]*order:3/.test(css) && /\.tbFlex\{[^}]*order:1/.test(css));
chk('renderUserChip fills the email', /ml\.textContent=u\?\(u\.email\|\|''\)/.test(read('js/account-ui.js')));
chk('start screen rail mirrors the account', /id="ssUserName"/.test(html) && /id="ssUserMail"/.test(html)
  && /function syncAccount\(\)/.test(ss) && /Account\.onChange/.test(ss));

// -------------------------------------------------------------------- ribbon
console.log('\n--- ribbon ---');
const tabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map(m => m[1]);
const pages = [...html.matchAll(/data-page="([^"]+)"/g)].map(m => m[1]);
chk('Home, Insert, Page Layout, Formulas tabs exist',
  ['home', 'insert', 'pagelayout', 'formulas'].every(t => tabs.includes(t)));
/* The reference layout: File, Home, Insert, Page Layout, Formulas, Data,
   Review, View, Team. Draw and Help are not tabs in that ribbon - the ink and
   shape tools ride on Insert, and the sharing/help commands sit on Team. */
const EXCEL_TABS = ['home', 'insert', 'pagelayout', 'formulas', 'data', 'review', 'view', 'team'];
chk('tabs are in Excel order: Home, Insert, Page Layout, Formulas, Data, Review, View, Team',
  JSON.stringify(tabs) === JSON.stringify(EXCEL_TABS));
chk('the command pages follow the tab order', JSON.stringify(tabs) === JSON.stringify(pages));
/* Excel's group structure per tab, verified against the rendered markup. */
const pageOf = p => {
  const m = html.match(new RegExp('data-page="' + p + '">([\\s\\S]*?)(?=<div class="rpage|\\n   <button id="ribbonMin")'));
  return m ? [...m[1].matchAll(/data-i18n="(g[A-Za-z0-9]+)"/g)].map(x => x[1]) : [];
};
/* Raw markup of one command page, so "is X on this tab?" can be asked without a
   lazy match running past the end of the page. */
const pageHtml = p => {
  const m = html.match(new RegExp('data-page="' + p + '">([\\s\\S]*?)(?=<div class="rpage|\\n   <button id="ribbonMin")'));
  return m ? m[1] : '';
};
const groupsAre = (p, want) => chk(p + ' groups: ' + want.join(' / '),
  JSON.stringify(pageOf(p)) === JSON.stringify(want));
groupsAre('home', ['gClip', 'gFont', 'gAlign', 'gNumber', 'gStyles', 'gCells', 'gEditing']);
/* Ink and the shape primitives used to be a Draw tab; they ride at the end of
   Insert in this layout, after the sheet/row/column group. */
groupsAre('insert', ['gTables', 'gIllus', 'gAddins', 'gCharts', 'gSpark', 'gLinks', 'gSymbols', 'gText', 'gFilters', 'gSheets', 'gDrawTools', 'gPens', 'gShapes', 'gInsert']);
groupsAre('pagelayout', ['gThemes', 'gPageSetup', 'gPageBreaks', 'gScaleFit', 'gSheetOpt']);
groupsAre('formulas', ['gFnLib', 'gFnCat', 'gFnHelp', 'gCalcOpt', 'gNames']);
groupsAre('data', ['gGetData', 'gSortF', 'gDataTools', 'gDataTypes', 'gSubtotal']);
groupsAre('review', ['gProofing', 'gA11y', 'gInsights', 'gComments', 'gProtect', 'gLang']);
groupsAre('view', ['gWbViews', 'gShow', 'gZoom', 'gFreeze', 'gPrint']);
groupsAre('team', ['gHelpHelp', 'gShare', 'gHelpTools']);
/* Draw and Help left the tab strip, so their commands must still be reachable
   somewhere - otherwise the buttons stay in the DOM but nothing can open them. */
chk('Draw and Help are not tabs; their commands are re-homed',
  !tabs.includes('draw') && !tabs.includes('help')
  && /id="bInkDraw"/.test(pageHtml('insert')) && /id="bShRect"/.test(pageHtml('insert'))
  && /id="bHelpOpen"/.test(pageHtml('team')) && /id="bShareMail"/.test(pageHtml('team')));
/* Every command this build added must be a real, wired control - the repo's
   ribbon check rejects decorative buttons, so pin the wiring here too. */
chk('Add-ins lives on Insert, not Home',
  !/id="bAddinAI"/.test(pageHtml('home')) && /id="bAddinAI"/.test(pageHtml('insert')));
const NEW_CMDS = [
  ['bDTText', /insertDrawing\('text'\)/], ['bDTPic', /openPic/], ['bDTShapes', /bDTShapes/],
  ['bCalcMode', /calcMode/], ['bNameGo', /bNameGo/], ['bDtNum', /extractType/],
  ['bDtText', /extractType/], ['bLang', /applyLang/], ['bShareCopy', /clip/], ['bShareMail', /mailto/]
];
for (const [id, re] of NEW_CMDS) {
  chk('added command #' + id + ' exists and is wired',
    new RegExp('id="' + id + '"').test(html) && re.test(jsScript));
}
chk('Accessibility and Languages stand as their own Review groups',
  /id="bA11yCheck"[\s\S]{0,220}?data-i18n="gA11y"/.test(html)
  && /id="bLang"[\s\S]{0,220}?data-i18n="gLang"/.test(html));

// ------------------------------------------------- icons, fonts, colours, rail
console.log('\n--- icons, fonts, colours, sidebar rail ---');
/* Office draws ribbon and backstage icons as monochrome line art. A colour
   emoji in either place is a visible departure, and an icon left as an HTML
   entity would slip past a plain character scan, so both are checked. */
const between = (a, b) => html.slice(html.indexOf(a), html.indexOf(b));
const UI = [
  ['ribbon body', between('<div class="rbody">', 'id="ribbonMin"')],
  ['backstage rail', between('<aside class="bsRail"', '</aside>')],
  ['start rail', between('<nav class="ssNav"', '</nav>')]
];
for (const [name, region] of UI) {
  chk(name + ' has no colour emoji',
    !/[\u{1F300}-\u{1FAFF}\u{2B00}-\u{2BFF}\u{FE0F}]/u.test(region));
  chk(name + ' has no icons left as HTML entities', !/&#x?[0-9A-Fa-f]{3,};/.test(region));
}
chk('no poorly-supported U+2Bxx glyphs remain in the ribbon',
  !/[\u2B00-\u2B2F\u2BC0-\u2BCF]/.test(between('<div class="rbody">', 'id="ribbonMin"')));
chk('every ribbon icon is vector line art, not a glyph',
  (between('<div class="rbody">', 'id="ribbonMin"').match(/<svg class="ic"/g) || []).length >= 100
  && /\.ic\{[^}]*stroke:currentColor/.test(css)
  && /\.rbtn\.big \.ic\{[^}]*width:18px/.test(css)
  && /\.sprite\{[^}]*width:0;height:0/.test(css));
/* Every <use> must resolve to a <symbol>, or the icon silently disappears. */
const SYMBOLS = new Set([...html.matchAll(/<symbol id="i-([^"]+)"/g)].map(m => m[1]));
const USES = [...html.matchAll(/<use href="#i-([^"]+)">/g)].map(m => m[1]);
const unresolved = [...new Set(USES.filter(n => !SYMBOLS.has(n)))];
chk('the sprite defines ' + SYMBOLS.size + ' icons and all ' + USES.length + ' references resolve',
  SYMBOLS.size >= 100 && unresolved.length === 0);
chk('both rails use the same sprite icons',
  /\.qbtn \.ic,\.ssNavItem \.ic\{[^}]*width:16px/.test(css)
  && /class="ssNavItem"[^>]*>\s*<svg class="ic"/.test(html));
/* Encoding guard across every shipped file, not just index.html. A UTF-8 byte
   sequence decoded as Windows-1252 turns one character into two or three, and
   neither shows up in a git diff, so it is asserted rather than eyeballed.

   The detector works on the DECODE, not on a list of lead bytes: any run of
   cp1252-decodable characters that turns back into valid UTF-8 is damage. A
   lead-byte list is what made the earlier version miss the Devanagari (E0) and
   emoji (F0) runs while still catching the arrow (E2) ones. */
const SOURCES = Object.assign({
  'index.html': html, 'css/styles.css': css, 'js/script.js': jsScript,
  'js/start-screen.js': ss, 'js/account-ui.js': accountUi, 'js/account.js': account,
  'js/auth-guard.js': guard
}, { 'js/drawDesign.js': extraModules[0], 'js/drive.js': extraModules[1],
  'js/ribbon-display.js': extraModules[2], 'js/formulaAuditing.js': extraModules[3] });

/* Windows-1252 0x80-0x9F; 0xA0-0xFF is Latin-1 and needs no table. */
const CP1252_HIGH = {
  0x80: '\u20AC', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E', 0x85: '\u2026',
  0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160',
  0x8B: '\u2039', 0x8C: '\u0152', 0x8E: '\u017D', 0x91: '\u2018', 0x92: '\u2019',
  0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
  0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153',
  0x9E: '\u017E', 0x9F: '\u0178'
};
const DECODABLE = new Set([...Object.values(CP1252_HIGH),
  ...Array.from({ length: 96 }, (_, i) => String.fromCharCode(0xA0 + i))]);
const toBytes = s => {
  const out = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7F) { out.push(cp); continue; }
    let b = -1;
    for (const [k, v] of Object.entries(CP1252_HIGH)) if (v === ch) b = +k;
    out.push(b < 0 ? cp : b);
  }
  return Buffer.from(out);
};
/* Every maximal run of decodable characters, and whether it decodes cleanly. */
const damaged = src => {
  const runs = [];
  let cur = '', start = 0;
  for (let i = 0; i < src.length; i++) {
    if (DECODABLE.has(src[i])) { if (!cur) start = i; cur += src[i]; continue; }
    if (cur) { runs.push(cur); cur = ''; }
  }
  if (cur) runs.push(cur);
  return runs.filter(r => {
    const d = toBytes(r).toString('utf8');
    return !d.includes('\uFFFD');
  });
};
const mojiFiles = Object.entries(SOURCES)
  .filter(([, src]) => damaged(src).length).map(([f]) => f);
const badFiles = Object.entries(SOURCES)
  .filter(([, src]) => /[\uFFFD\u0001-\u0008\u000B\u000C\u000E-\u001F]/.test(src)).map(([f]) => f);
chk('no cp1252 damage in any shipped file (' + Object.keys(SOURCES).length + ' checked)',
  mojiFiles.length === 0,
  mojiFiles.map(f => f + ' x' + damaged(SOURCES[f]).length).join(', '));
chk('no U+FFFD or C0 control character anywhere in the bundle',
  badFiles.length === 0, badFiles.join(', '));
/* Encoding guard. A cp1252 read/write round trip silently turns "▾" into three
   mojibake characters, and a latin1 "repair" of that then destroys it outright.
   Both are invisible in a diff, so they are asserted here. */
chk('index.html is valid UTF-8 with no C0 control characters',
  !/[\uFFFD\u0001-\u0008\u000B\u000C\u000E-\u001F]/.test(html),
  'a mojibake sequence means the file was written through the wrong codepage');
const MOJI = /[\u00C2\u00E2][\u0080-\u00BF\u2000-\u206F\u20A0-\u20BF]{1,3}/g;
chk('no double-encoded (mojibake) sequences in the markup',
  (html.match(MOJI) || []).length === 0,
  JSON.stringify((html.match(MOJI) || []).slice(0, 5)));
/* The glyphs the ribbon labels rely on must be real characters, not pictures. */
chk('dropdown carets and arrows are single code points',
  (html.split('\u25BE').length - 1) >= 10 && (html.split('\u2192').length - 1) >= 8);
chk('no button carries more than one icon',
  [...html.matchAll(/<button[^>]*>[\s\S]*?<\/button>/g)]
    .every(b => (b[0].match(/<svg class="ic"/g) || []).length <= 1));
/* The icon must sit outside the translated span: the i18n pass writes
   textContent, which would otherwise delete the icon. */
chk('rail icons sit outside the element data-i18n writes to',
  /class="bsItem[^"]*"[^>]*data-bs-page="[a-z]+"[^>]*>\s*<svg class="ic"[^>]*><use[^>]*><\/use><\/svg><span data-i18n=/.test(html)
  && !/class="bsItem[^"]*"[^>]*data-i18n="/.test(html));
chk('the backstage rail is in Excel order, one icon per item',
  /data-bs-page="home"[\s\S]*?data-bs-page="new"[\s\S]*?data-bs-page="open"[\s\S]*?data-bs-page="info"[\s\S]*?data-bs-page="save"[\s\S]*?data-bs-page="print"[\s\S]*?data-bs-page="export"[\s\S]*?data-bs-page="recent"[\s\S]*?data-bs-page="onedrive"[\s\S]*?data-bs-page="account"/.test(html)
  && [...html.matchAll(/<button[^>]*class="bsItem[^"]*"[^>]*data-bs-page="([a-z]+)"[^>]*><svg class="ic"/g)].length === 10);
chk('no icon-bearing button lets the translation pass delete its icon',
  !/<button[^>]*\bdata-i18n="[A-Za-z0-9_]+"[^>]*>\s*<svg class="ic"/.test(html));
chk('no label in the string table still leads with an emoji',
  !/(?:np|hi|en):'(?:\s*[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}])/u.test(jsScript));
chk('every Alignment command in Excel has an id and a vector icon',
  ['bVaTop','bVaMid','bVaBot','bAlLeft','bAlCenter','bAlRight','bIndentInc','bIndentDec','bOrientCell']
    .every(id => new RegExp('id="' + id + '"[^>]*><svg class="ic"').test(html) ||
                 new RegExp('id="' + id + '"[^>]*>\\s*<svg class="ic"').test(html)));
chk('alignment is driven by data-va / data-al, not baked into the button',
  /\[data-va\]/.test(jsScript) && /\[data-al\]/.test(jsScript)
  && /applyStyle\(\{va:b\.dataset\.va\}\)/.test(jsScript)
  && /applyStyle\(\{al:b\.dataset\.al\}\)/.test(jsScript));
const code = jsScript.replace(/\s+/g, ' ');
chk('applying a style re-latches the ribbon, so the active alignment shows',
  code.includes('saveLS();renderAll();syncRibbon();}'));
chk('the active horizontal alignment latches, not just the vertical one',
  code.includes("querySelectorAll('[data-al]').forEach(b2=>b2.classList.toggle('on',s.al===b2.dataset.al))"));
chk('Formula Auditing holds Excel auditing commands, not function buttons',
  /id="bTracePre"/.test(html) && /id="bTraceDep"/.test(html) && /id="bTraceClear"/.test(html)
  && /id="bShowFormulas"/.test(html)
  && !/id="bFnAll"[^>]*title="All functions"[\s\S]{0,400}Formula Auditing/.test(html));
chk('tracing parses real references, expands ranges and skips string literals',
  code.includes('function refsInFormula(text)')
  && code.includes('replace(/"[^"]*"/g,\'""\')')     // string literals blanked first
  && code.includes("\\$?[A-Z]{1,3}\\$?\\d+")        // the A1 reference pattern
  && code.includes("a.split(':')")                 // ranges are expanded, not literal
  && code.includes('2000)continue'));               // a whole-sheet range is refused
chk('precedents and dependents are two different walks',
  /function tracePrecedents\(\)\{const c=cell\(active\)/.test(jsScript)
  && /function traceDependents\(\)\{\s*const out=\[\];const cs=sheet\(\)\.cells/.test(jsScript.replace(/\s+/g, ' ')));
chk('Show Formulas swaps the cell text for the formula and latches',
  /wb\.showFormulas&&typeof raw==='string'&&raw\[0\]==='='\?raw:dispVal\(ref\)/.test(jsScript)
  && /t\('#bShowFormulas',!!wb\.showFormulas\)/.test(jsScript));
chk('traced cells are visibly outlined', /td\.traced\{/.test(css));
chk('indent steps 3 characters per click and rotation is applied to the cell',
  /bumpIndent\(1\)/.test(jsScript) && /bumpIndent\(-1\)/.test(jsScript)
  && /paddingLeft=s\.indent\?\(Number\(s\.indent\)\*3\+1\)\+'ch'/.test(jsScript)
  && /transform=s\.rot\?'rotate\('\+Number\(s\.rot\)\+'deg\)':''/.test(jsScript));
chk('every new command is wired and every new label is translated',
  ['bIndentInc','bIndentDec','bOrientCell','bTracePre','bTraceDep','bTraceClear','bShowFormulas']
    .every(id => new RegExp("tg\\('#" + id + "'").test(jsScript))
  && ['bTracePre','bShowFormulas','orientAngle','orientUp','orientClear']
    .every(k => jsScript.includes(k + ':{')));
/* paint() builds the class straight from the button's data-va value, so each of
   those values must have a matching rule. A mismatch is silent: the cell just
   falls back to the default alignment. */
const vaValues = [...new Set([...html.matchAll(/data-va="([a-z]+)"/g)].map(m => m[1]))];
chk('every data-va value has a matching vertical-align rule (' + vaValues.join(', ') + ')',
  vaValues.length > 0
  && vaValues.every(v => new RegExp('td\\.va-' + v + '\\{vertical-align:').test(css)));
chk('the horizontal alignment values map through AL, not through a class name',
  /const AL=\{left:'',center:'al-c',right:'al-r'\}/.test(jsScript)
  && /AL\[s\.al\|\|/.test(jsScript));
/* ---- typography: Excel sets its chrome in Segoe UI at 9pt (12px) ---- */
chk('every ribbon command, tab and title-bar item is Segoe UI 12px',
  /\.rbtn\{[^}]*font-size:12px/.test(css) && /\.rtab\{[^}]*font-size:12px/.test(css)
  && /\.titlebar\{[^}]*font-size:12px/.test(css) && /\.qbtn\{[^}]*font-size:12px/.test(css));
chk('group captions are one step below the commands, in Office grey',
  /\.rlabel\{[^}]*font-size:10px/.test(css) && /\.rlabel\{[^}]*color:var\(--xl-text-2\)/.test(css));
/* Scoped to the ribbon / title-bar chrome, which is what Excel parity governs.
   Dialog and start-screen text sizes are a separate design choice. */
chk('no fractional font sizes survive in the ribbon chrome',
  ['.rbtn', '.rbtn.big', '.rtab', '.rtabs', '.rtfile', '.rlabel', '.titlebar', '.qbtn', '.ssNavItem']
    .every(sel => {
      const m = css.match(new RegExp('(?:^|\\n)\\s*' + sel.replace('.', '\\.') + '\\{([^}]*)\\}'));
      return !m || !/font-size:\d+\.5px/.test(m[1]);
    })
  && !/font:13px inherit/.test(css),
  'a fractional size in the chrome is a half-pixel that never lands on a device boundary');
/* A new Excel workbook is Calibri 11pt; sizes are stored in points and converted
   at paint time, so "clear formatting" falls back to Excel's own default. */
chk('the grid defaults to Calibri at 11pt, Excel\'s own workbook default',
  /#grid\{[^}]*font-family:var\(--sheet-font,'Calibri'\)/.test(css)
  && /#grid\{[^}]*font-size:14\.67px/.test(css)
  && /const PT=96\/72,FS_DEFAULT=11/.test(jsScript)
  && /td\.style\.fontSize=s\.fs\?\(s\.fs\*PT\)/.test(jsScript)
  && !/s\.fs\|\|13/.test(jsScript));
/* ---- colour: the Office palette Excel ships with ---- */
chk('the ribbon, tab strip and title bar share Office Background 1 (#f3f2f1)',
  /--xl-ribbon:#f3f2f1/.test(css)
  && /\.rbody\{[^}]*background:var\(--xl-ribbon\)/.test(css)
  && /\.rtabs\{[^}]*background:var\(--xl-ribbon\)/.test(css));
chk('the active tab and the grid are white, the text is Office Text 1',
  /\.rtab\.on\{[^}]*background:#fff/.test(css) && /--xl-text:#323130/.test(css)
  && /--xl-text-2:#605e5c/.test(css) && /--accent:#217346/.test(css));
chk('group dividers are lighter than the ribbon border, as in Office',
  /--xl-divider:#e1dfdd/.test(css) && /\.rgrp\{[^}]*border-right:1px solid var\(--xl-divider\)/.test(css));
/* ---- sidebar: identical by construction, not by three copies of the numbers ---- */
chk('every rail metric comes from one shared token block',
  ['--rail-h:32px', '--rail-pad:14px', '--rail-icon:16px', '--rail-gap:10px', '--rail-bar:4px']
    .every(t => css.includes(t))
  && /\.ssNavItem\{[^}]*height:var\(--rail-h\)/.test(css)
  && /\.ssNavItem\{[^}]*line-height:var\(--rail-h\)/.test(css)
  && /\.ssNavItem\{[^}]*gap:var\(--rail-gap\)/.test(css)
  && /\.ssNavItem\{[^}]*padding:0 12px 0 var\(--rail-pad\)/.test(css)
  && /\.ssNavItem\{[^}]*border-left:var\(--rail-bar\) solid transparent/.test(css));
/* A large tile must never share a row with 22px buttons on the default tab: its
   18px icon would sit ~7px above the row's own baseline. Excel gives the large
   commands their own row, and Home > Editing is where that matters. */
const rrowBlocks = [...html.matchAll(/<div class="rrow">([\s\S]*?)<\/div>/g)].map(m => m[1]);
const isMixed = row => /class="rbtn big"/.test(row)
  && /class="rbtn"/.test(row.replace(/class="rbtn big"/g, ''));
/* Excel lines the 22px commands up with a 48px tile's ICON, not the row's middle.
   Centring them leaves the icons 7px apart; this is the rule that closes that. */
chk('a row with a 48px tile lines its 22px commands up with the tile icon',
  /\.rrow:has\(>\.rbtn\.big\)\{align-items:flex-start\}/.test(css)
  && /\.rrow:has\(>\.rbtn\.big\)>\.rbtn:not\(\.big\)\{margin-top:6\.2px\}/.test(css),
  'the offset is measured: (48 - 18 - 1 - 12.6)/2 + 9 - 11');
chk('the default tab never mixes a 48px tile with 22px commands',
  !rrowBlocks.filter((_, i) => i < 12).some(isMixed),
  rrowBlocks.filter(isMixed).length + ' row(s) across all tabs still do');

chk('the ribbon gives off-screen commands a way out, as Excel does',
  /id="rbPrev"/.test(html) && /id="rbNext"/.test(html)
  && /body\[data-rboverflow\] \.rbOverflow\{display:flex\}/.test(css)
  && /\.rbody\{[^}]*overflow-x:auto/.test(css) && /scrollbar-width:none/.test(css),
  'the scrollbar is hidden, so the chevrons are the only route to hidden commands');
chk('the overflow pair appears only on real overflow and greys out at each end',
  /scrollWidth>body\.clientWidth\+1/.test(jsScript)
  && /document\.body\.toggleAttribute\('data-rboverflow',over\)/.test(jsScript)
  && /prev\.disabled=!over\|\|body\.scrollLeft<=1/.test(jsScript)
  && /next\.disabled=!over\|\|body\.scrollLeft>=body\.scrollWidth-body\.clientWidth-1/.test(jsScript));
chk('it re-measures on resize, on tab change and while scrolling',
  /addEventListener\('resize',syncRibbonOverflow\)/.test(jsScript)
  && /'scroll',syncRibbonOverflow,\{passive:true\}/.test(jsScript)
  && /closest\('\.rtab'\)\)setTimeout\(syncRibbonOverflow/.test(jsScript));
chk('the chevron takes a discrete, clamped step',
  /body\.scrollLeft=Math\.max\(0,Math\.min\(max,body\.scrollLeft\+dir\*step\)\)/.test(jsScript)
  && /const step=Math\.max\(160,Math\.round\(body\.clientWidth\*0\.4\)\)/.test(jsScript)
  && !/scrollBy\(\{left:/.test(jsScript),
  'a smooth scrollBy is a silent no-op against the hidden scrollbar');
chk('row and column headers use Office Background 1, not a generic grey',
  /th\{background:var\(--xl-ribbon\)/.test(css) && !/th\{background:#f5f5f5/.test(css));
chk('every grid surface is either the Office grey or white',
  /--xl-surface:#fff/.test(css) && /--xl-ribbon:#f3f2f1/.test(css)
  && /#gridwrap\{[^}]*background:#fff/.test(css));
/* ---- popups: one layer scale, one placement rule ---- */
/* Every popup is a sibling inside #app, so a bare z-index is directly comparable
   with its neighbours. The whole point of the scale is that none is hard-coded. */
const POPUPS = ['#popMenu', '#ctxMenu', '#profilePanel', '#backstage', '#authLock',
  '#startScreen', '#aiPanel'];
const popupRules = POPUPS.map(s => {
  const m = css.match(new RegExp('(?:^|\\n)\\s*' + s.replace('#', '\\#') + '\\{([^}]*)\\}'));
  return m ? m[1] : '';
}).join(' ');
chk('every popup layer comes from the scale, not a hard-coded number',
  popupRules.length > 0 && popupRules.includes('var(--z-')
  && !/z-index:\d/.test(popupRules),
  'a bare z-index here is how a menu ended up behind the backstage');
chk('the scale is declared once and strictly ordered',
  /--z-panel:20/.test(css) && /--z-dialog:30/.test(css) && /--z-overlay:40/.test(css)
  && /--z-modal:50/.test(css) && /--z-screen:60/.test(css) && /--z-popup:70/.test(css)
  && (css.match(/--z-panel:20[\s\S]*?--z-popup:70/) || [''])[0].indexOf('--z-popup:70') > 0);
chk('menus float above every full-screen view',
  /#popMenu\{[^}]*z-index:var\(--z-popup\)/.test(css)
  && /#ctxMenu\{[^}]*z-index:var\(--z-popup\)/.test(css)
  && /#backstage\{[^}]*z-index:var\(--z-overlay\)/.test(css)
  && /#startScreen\{[^}]*z-index:var\(--z-screen\)/.test(css));
chk('the auth dialog and lock are lifted above the start screen by a token',
  /body\.start-open #authDialog,body\.start-open #authLock\{z-index:calc\(var\(--z-popup\) \+ 10\)\}/.test(css)
  && !/z-index:9100|z-index:9000/.test(css));
chk('every dialog is centred on the viewport, capped to it, and scrollable',
  /#findDlg[^{]*\{[^}]*position:fixed;left:50%;top:50%;transform:translate\(-50%,-50%\)/.test(css)
  && /max-width:calc\(100vw - 32px\)/.test(css)
  && /max-height:calc\(100vh - 32px\)/.test(css)
  && /overflow:auto;overscroll-behavior:contain\}/.test(css),
  'the old rule sat at top:80px of #app, so a tall dialog left a short window');
chk('a dialog cannot be wider than the window on a small one',
  /min-width:min\(340px,calc\(100vw - 32px\)\)/.test(css) && !/;min-width:340px\}/.test(css));
chk('both menus are placed by one shared helper, and neither guesses its size',
  /function placeFloating\(el,anchor,opts\)/.test(jsScript)
  && /placeFloating\(m,anchor\)/.test(jsScript)
  && /placeFloating\(menu,null,\{point:\{x:e\.clientX,y:e\.clientY\}\}\)/.test(jsScript)
  && !/innerWidth-200|innerHeight-230/.test(jsScript.replace(/\/\*[\s\S]*?\*\//g, '')),
  'the old context menu guessed 200x230 and went off the bottom of a short window');
chk('that helper measures the real box, clamps once, flips, and re-places on resize',
  /el\.classList\.add\('open'\);[\s\S]{0,200}?el\.offsetWidth,h=el\.offsetHeight/.test(jsScript)
  && /x=Math\.max\(POP_EDGE,Math\.min\(x,vw-w-POP_EDGE\)\)/.test(jsScript)
  && /y=Math\.max\(POP_EDGE,Math\.min\(y,vh-h-POP_EDGE\)\)/.test(jsScript)
  && /r\.left-w>=POP_EDGE/.test(jsScript) && /r\.top-h>=POP_EDGE/.test(jsScript)
  && /addEventListener\('resize'/.test(jsScript));
chk('both menus can scroll and cap themselves to the window',
  /#popMenu\{[^}]*max-height:min\(72vh,calc\(100vh - 16px\)\);overflow:auto/.test(css)
  && /#ctxMenu\{[^}]*max-height:min\(72vh,calc\(100vh - 16px\)\);overflow:auto/.test(css));
chk('the replaced File dropdown is gone rather than left as dead CSS',
  !/\.file-menu\{/.test(css) && !/class="file-menu/.test(html));
chk('the docked panel and the profile flyout are capped to the window too',
  /#aiPanel\{[^}]*max-width:min\(70%,420px\)/.test(css)
  && /#profilePanel\{[^}]*max-width:calc\(100vw - 20px\)/.test(css));
/* ---- close / back controls on every popup ---- */
const CLOSERS = ['aiClose', 'fClose', 'chartClose', 'pivotClose', 'recClose', 'picClose',
  'helpClose', 'psClose', 'ssClose', 'authClose', 'profileClose', 'bsBack'];
const closerTag = id => {
  const m = html.match(new RegExp('<button[^>]*\\bid="' + id + '"[^>]*>'));
  return m ? m[0] : '';
};
chk('all twelve close / back controls exist', CLOSERS.every(id => !!closerTag(id)),
  'missing: ' + CLOSERS.filter(id => !closerTag(id)).join(' '));
chk('every close control has an accessible name and the shared glyph',
  CLOSERS.every(id => /aria-label="(Close|Back)"/.test(closerTag(id))
    && /data-close="(close|back)"/.test(closerTag(id))),
  'an empty button is an invisible target that announces nothing');
chk('the glyph comes from one rule, not from each dialog',
  /\[data-close\]::before\{content:"\\00D7"\}/.test(css)
  && /\[data-close="back"\]::before\{content:"\\2039"/.test(css)
  && /\[data-close\]\{[^}]*color:inherit/.test(css));
/* Each close control must remove the open class from the box it belongs to. */
chk('every close button targets its own container',
  code.includes("$('#aiClose').onclick=()=>$('#aiPanel').classList.remove('open')")
  && code.includes("$('#fClose').onclick=()=>$('#findDlg').classList.remove('open')")
  && code.includes("$('#chartClose').onclick=()=>$('#chartDlg').classList.remove('open')")
  && code.includes("cl.onclick=closePageSetup")
  && code.includes("function closePageSetup(){const d=$('#psDlg');if(d)d.classList.remove('open');}")
  && code.includes("act('#bsBack',closeBackstage)"));
chk('the start screen close is bound by delegation, and that is allowed',
  /closest\('\[data-ss-close\]'\)\)\{close\(\);return;\}/.test(ss)
  && /id="ssClose"[^>]*data-ss-close/.test(html),
  'a delegated handler is real wiring; the audit has to understand it');
chk('the auth dialog refuses to close only while the guard holds it',
  /AuthGuard\.canCloseAuthDialog&&!AuthGuard\.canCloseAuthDialog\(\)\)return;/.test(accountUi)
  && /if\(d\)d\.classList\.remove\('open'\);showAuthError\(''\);/.test(accountUi),
  'that is a refusal to act, not a broken handler');
chk('Page Layout wiring is actually invoked, not just defined',
  /function wirePageLayout\(\)/.test(jsScript)
  && /initRibbonOverflow\(\);\s*\/\*[\s\S]{0,400}?\*\/\s*wirePageLayout\(\);/.test(jsScript),
  'an uncalled wire* function silently killed 17 controls on that tab');
chk('every popup open/close path is null-guarded on its container',
  /const hpc=\$\('#helpClose'\);if\(hpc\)hpc\.onclick=\(\)=>\{const d=\$\('#helpDlg'\);if\(d\)d\.classList\.remove\('open'\);\};/.test(jsScript)
  && /function openHelp\(\)\{const dlg=\$\('#helpDlg'\);if\(!dlg\)return;/.test(jsScript)
  && /function closePageSetup\(\)\{const d=\$\('#psDlg'\);if\(d\)d\.classList\.remove\('open'\);}/.test(jsScript)
  && /function closeAuthDialog\(\)\{const d=\$\('#authDialog'\);\s*\/\*[\s\S]{0,200}?\*\/\s*if\(typeof AuthGuard/.test(accountUi)
  && /function closeAuthDialog\(\)\{const d=\$\('#authDialog'\);[\s\S]{0,240}?if\(d\)d\.classList\.remove\('open'\);showAuthError\(''\);}/.test(accountUi),
  'a bare $().classList throws a TypeError if the dialog is ever renamed');
chk('the auth helpers they call are themselves guarded',
  /function showAuthError\(msg\)\{const el=\$\('#formError'\);if\(!el\)return;/.test(accountUi),
  'closeAuthDialog calls showAuthError() unguarded, so that must not throw');
/* The app shell must never be served stale. It used to be cache-first with
   background revalidation, so a user could run a whole session on the previous
   build of script.js / styles.css - the new copy only reached them on the NEXT
   load, and only if a version bump had been remembered. */
const sw = read('sw.js');
chk('the service worker serves the app shell network-first',
  /App-shell assets \(js\/, css\/\): network-first/.test(sw)
  && /fetch\(req\)\s*\.then\(res => \{[\s\S]{0,240}?caches\.open\(CACHE_NAME\)/.test(sw)
  && /\.catch\(\(\) => caches\.match\(req\)/.test(sw),
  'the cache must be the offline fallback, not the primary source');
chk('no cache-first path is left for same-origin assets',
  !/return cached \|\| fromNetwork/.test(sw) && !/stale-while-revalidate/.test(sw));
chk('the navigation path was already network-first and stays that way',
  /req\.mode === 'navigate'/.test(sw)
  && /caches\.match\('\.\/index\.html'\)/.test(sw));
chk('the service worker registration degrades quietly where it is unsupported',
  /navigator\.serviceWorker\.register\('\.\/sw\.js'\)/.test(html)
  && /\.catch\(err => console\.warn\('\[Mini Excel\] Service Worker registration failed:'/.test(html),
  'app:// does not support service workers, so the failure must not surface as an error');
/* ---- brand mark: replaces the MX text and the title-bar emoji ---- */
chk('the brand mark exists as a sprite symbol, not as text or an emoji',
  /<symbol id="i-brand" viewBox="0 0 32 32">/.test(html)
  && /id="i-brand"/.test(html));
chk('both placeholders are gone',
  !/ssBrandMark|>MX</.test(html) && !/\u{1F4CA}/u.test(html)
  && !/<span class="appTitle">\s*\u{1F}/u.test(html));
chk('the mark is used in the title bar and on the start-screen rail',
  /<span class="appTitle brand"><svg class="brandMark" aria-hidden="true"><use href="#i-brand">/.test(html)
  && /<svg class="brandMark brandRail" role="img" aria-label="Mini Excel"><use href="#i-brand">/.test(html));
chk('it is sized for both places and sized once, in CSS',
  /\.brand\{[^}]*inline-flex/.test(css)
  && /\.brandMark\{[^}]*width:18px/.test(css)
  && /\.brandMark\.brandRail\{[^}]*width:26px/.test(css));
chk('the mark uses the app green, not a Microsoft-style X',
  /<rect x="1.25" y="1.25" width="29.5" height="29.5" rx="7" fill="#217346"\/>/.test(html)
  && !/<path[^>]*d="M[^"]*[Mm][^"]*"\/>/.test(html.match(/<symbol id="i-brand"[\s\S]*?<\/symbol>/)[0] || ''),
  'the mark must be original artwork, not a rendering of a trademarked logo');
chk('it carries its own fills rather than the line-art rules',
  /class="brandMark"/.test(html) && !/class="ic brandMark"/.test(html)
  && /class="brandMark"/.test(html) && /\.brandMark\{[^}]*display:block/.test(css),
  'an .ic would inherit fill:none / stroke:currentColor and draw nothing');
/* The start-screen rail is pinned so Templates / Recent / Favorites cannot drift
   apart: a 32px row, a 12px label and a 16px icon column. */
chk('rail items are a fixed 32px row with a 12px label',
  /\.ssNavItem\{[^}]*height:var\(--rail-h\)/.test(css) && /\.ssNavItem\{[^}]*font-size:12px/.test(css)
  && /\.ssNavItem\{[^}]*line-height:var\(--rail-h\)/.test(css));
chk('rail icons sit in a 16px column and the active row carries a 4px bar',
  /\.qbtn \.ic,\.ssNavItem \.ic\{[^}]*width:16px/.test(css)
  && /\.ssNavItem\{[^}]*border-left:var\(--rail-bar\) solid transparent/.test(css));
chk('the active rail row is a white overlay, not a second green',
  /\.ssNavItem\.on\{[^}]*background:rgba\(255,255,255,\.18\)/.test(css)
  && /\.ssNavItem\.on\{[^}]*border-left-color:#fff/.test(css));
chk('the three rail labels each appear exactly once',
  (html.match(/data-i18n="ssRecent"/g) || []).length === 1
  && (html.match(/data-i18n="ssFavorites"/g) || []).length === 1
  && (html.match(/data-i18n="ssTemplates"/g) || []).length === 1);
/* The Office palette, stated as literals so a future edit cannot quietly drift. */
chk('Office neutral palette is declared as literals',
  /--xl-ribbon:#f3f2f1/.test(css) && /--xl-surface:#fff/.test(css)
  && /--xl-hover:#e1dfdd/.test(css) && /--xl-press:#c7c6c4/.test(css)
  && /--xl-line:#d2d0ce/.test(css) && /--xl-text:#323130/.test(css)
  && /--xl-text-2:#605e5c/.test(css) && /--xl-hover-line:#8a8886/.test(css)
  && /--xl-toggle:#c7c6c4/.test(css) && /--xl-toggle-line:#b3b0ad/.test(css)
  && /--accent:#217346/.test(css));
chk('the UI font stack is Segoe UI with Office fallbacks, in one token',
  /--xl-ui:'Segoe UI',Tahoma,Calibri,Arial,sans-serif/.test(css)
  && /font-family:var\(--xl-ui\)/.test(css));
chk('every tab has a matching command page', tabs.every(t => pages.includes(t)) && pages.every(p => tabs.includes(p)));
chk('ribbon body uses the Excel #f3f2f1 surface', /\.rbody\{background:var\(--xl-ribbon\)/.test(css));
chk('active tab is white like Excel', /\.rtab\.on\{background:#fff/.test(css));
chk('compact spacing (22px controls, 10px group labels)',
  /\.rbtn\{[^}]*height:22px/.test(css) && /\.rlabel\{[^}]*font-size:10px/.test(css));
/* Excel's own numbers, measured at 100% scaling on the default Office theme. The
   checks below pin the ribbon to them: the chrome font, the vertical rhythm of
   the tab strip / small buttons / large buttons / group captions, and the
   geometry of the two controls Excel parks at the right end of the tab strip. */
chk('chrome is Segoe UI; only the grid follows the workbook font',
  /--xl-ui:'Segoe UI'/.test(css) && /font-family:var\(--xl-ui\)/.test(css)
  && /#grid\{font-family:var\(--sheet-font/.test(css));
chk('tab strip is 26px, 12px labels, hairline drawn inside the strip',
  /\.rtabs\{[^}]*box-shadow:inset 0 -1px 0 var\(--xl-line\)/.test(css)
  && /\.rtab\{[^}]*height:26px/.test(css) && /\.rtab\{[^}]*font-size:12px/.test(css));
chk('the active tab is a white block with a 2px green bar over the hairline',
  /\.rtab\.on\{[^}]*background:#fff/.test(css)
  && /\.rtab\.on\{[^}]*box-shadow:inset 0 -2px 0 var\(--accent\)/.test(css));
chk('large buttons are 48px tiles: 18px glyph over a 12px caption',
  /\.rbtn\.big\{[^}]*height:48px/.test(css) && /\.rbtn\.big \.ic\{[^}]*width:18px/.test(css)
  && /\.rbtn\.big\{[^}]*font-size:12px/.test(css));
chk('group captions share one 13px line so they line up across tabs',
  /\.rlabel\{[^}]*line-height:13px/.test(css) && /\.rlabel\{[^}]*min-height:13px/.test(css));
chk('group content is top-aligned and only the caption is pinned to the foot',
  /\.rrow\{[^}]*flex:none/.test(css) && /\.rlabel\{[^}]*margin-top:auto/.test(css));
chk("the Home Clipboard group has Excel's shape: big command, then the rest below",
  /id="bPaste">[\s\S]{0,90}?<\/div><div class="rrow">\s*<button class="rbtn" id="bCut"/.test(html));
chk('corner controls are pinned to the tab strip, not the ribbon bottom',
  /#ribbonMin,#ribbonDispBtn\{[^}]*top:0;height:26px/.test(css)
  && !/#ribbon(Min|DispBtn)\{[^}]*bottom:0/.test(css));
chk('the collapse chevron and the display-options button do not overlap',
  (css.match(/#ribbonMin\{right:/g) || []).length === 1
  && (css.match(/#ribbonDispBtn\{right:/g) || []).length === 1
  && /#ribbonMin\{right:30px/.test(css) && /#ribbonDispBtn\{right:4px/.test(css));
chk('the tab strip reserves room for them',
  /\.rtabs\{[^}]*padding:0 64px 0 0/.test(css));
chk('the display-options menu drops from the tab strip, not the ribbon bottom',
  /\.rdMenu\{[^}]*top:27px/.test(css) && !/\.rdMenu\{[^}]*top:100%/.test(css));
chk('a collapsed ribbon keeps a single hairline, not two stacked ones',
  /\.ribbon\.min\{border-bottom:none\}/.test(css)
  && /\.ribbon\.rd-tabs,\.ribbon\.rd-auto\{border-bottom:none/.test(css));
chk('latched commands and keyboard focus use the Excel fills',
  /\.rbtn\.on\{background:var\(--xl-toggle\)/.test(css)
  && /\.rbtn:focus-visible\{outline:1px dotted/.test(css));
chk('select boxes are 22px and the size box width lives in the stylesheet',
  /\.rsel\{[^}]*height:22px/.test(css) && /#fontSize\{max-width:46px\}/.test(css)
  && !/id="fontSize" style=/.test(html));
chk('fill/font colour read as Excel split buttons: 22px with a colour band',
  /\.rgrp input\[type=color\]\{[^}]*width:22px;height:22px/.test(css)
  && /-webkit-color-swatch-wrapper\{padding:2px 2px 7px\}/.test(css));
chk('the dark theme still paints the strip, the active tab and the corner controls',
  /data-theme='dark'\] \.rtabs,/.test(css)
  && /data-theme='dark'\] \.rtab\.on\{[^}]*box-shadow:inset 0 -2px 0 #4cc38a/.test(css)
  && /data-theme='dark'\] #ribbonMin,body\[data-theme='dark'\] #ribbonDispBtn\{color:#bbb\}/.test(css));

// ------------------------------------------------------------- File backstage
console.log('\n--- File menu (backstage) ---');
const rail = [...html.matchAll(/data-bs-page="([^"]+)"/g)].map(m => m[1]);
chk('rail follows Excel\'s Backstage order (Info before Save, Account last)',
  JSON.stringify(rail) ===
  JSON.stringify(['home', 'new', 'open', 'info', 'save', 'print', 'export', 'recent', 'onedrive', 'account']));
chk('Home is the default page, like Excel',
  /class="bsPage on" data-bspane="home"/.test(html)
  && /showBsPage\('home'\);bsInfoRefresh\(\);bsRenderRecent\(\);/.test(jsScript));
chk('every rail entry has a matching page',
  rail.every(p => new RegExp('data-bspane="' + p + '"').test(html)));
chk('Home offers blank / open / OneDrive cards',
  /id="bsHomeBlank"/.test(html) && /id="bsHomeOpen"/.test(html) && /id="bsHomeOneDrive"/.test(html));
chk('OneDrive page offers sign-in, cloud saves and Drive',
  /id="bsCloudSignIn"/.test(html) && /id="bsCloudBooks"/.test(html) && /id="bsCloudDrive"/.test(html));
chk('Recent list is rendered on the Home page',
  /id="bsRecentList"/.test(html) && /function bsRenderRecent\(\)/.test(jsScript));
chk('rendering the list escapes workbook names',
  /function escHtml\(s\)/.test(jsScript) && /escHtml\(name\)/.test(jsScript));
chk('the new cards are wired to actions',
  /act\('#bsHomeBlank',startNewWorkbook\)/.test(jsScript)
  && /act\('#bsHomeOpen',triggerImport\)/.test(jsScript)
  && /act\('#bsHomeOneDrive'/.test(jsScript));
chk('clicking a recent row re-opens that workbook',
  /e\.target\.closest\('\[data-bs-recent\]'\)/.test(jsScript)
  && /StartScreen\.openCloudBook\(id\.slice\(6\)\)/.test(jsScript));
chk('openCloudBook is exported for the File menu to reuse',
  /openCloudBook:openCloudBook/.test(ss));
chk('recent-list styling is defined',
  /\.bsRecentItem\{/.test(css) && /\.bsRecentItem:hover\{/.test(css));
chk('all backstage i18n keys are defined',
  ['bsHome', 'bsRecent', 'bsRecentTitle', 'bsStartNew', 'bsOneDrive', 'bsOneDriveHint',
   'bsCloudHint', 'bsDrive', 'bsDriveHint', 'bsStoragePref', 'bsNoRecentBs']
    .every(k => jsScript.includes(k + ':{')));

// ------------------------------------------------------------------- launcher
console.log('\n--- Windows launcher (PowerShell execution policy) ---');
const launcher = fs.existsSync('start.cmd') ? read('start.cmd') : '';
chk('start.cmd exists', !!launcher);
chk('it is plain cmd, so the execution policy does not apply',
  /@echo off/.test(launcher) && !/\.ps1\b.*-ExecutionPolicy\s+(Bypass|Unrestricted)/.test(launcher));
chk('it calls npm.cmd explicitly, defeating PowerShell ps1-first resolution',
  /npm\.cmd/.test(launcher) && /%%~\$PATH:I/.test(launcher));
chk('the root cause is documented in the file',
  /npm\.ps1 cannot be loaded/.test(launcher) && /about_execution_policies/.test(launcher));
chk('the REM/? footgun is documented so it is not reintroduced',
  /Use :: for comments, not REM/.test(launcher));
chk('it is ASCII with CRLF and no BOM (cmd requirements)',
  (() => {
    const b = fs.readFileSync(path.join(root, 'start.cmd'));
    if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return false;
    if ([...b].some(x => x > 126)) return false;
    const s2 = b.toString('latin1');
    return !/(?<!\r)\n/.test(s2);
  })());

// -------------------------------------------------------- launch & login flow
console.log('\n--- launch, sign-in and Google storage ---');
chk('start screen is opened at launch', /StartScreen\.open\(\)/.test(accountUi));
chk('unauthenticated launch raises the sign-in dialog', /openAuthDialog\('signin'\)/.test(accountUi));
chk('start screen stays clickable while the guard is locked',
  /if\(e\.target\.closest\('#startScreen'\)\)return;/.test(guard));
chk('auth dialog + lock card stack above the start screen',
  /body\.start-open #authDialog,body\.start-open #authLock\{z-index:calc\(var\(--z-popup\) \+ 10\)\}/.test(css));
chk('lock veil spares the start screen (no blur / no pointer-events:none)',
  /body\.auth-locked #app>\*:not\(#authLock\):not\(#authDialog\):not\(#startScreen\)\{pointer-events:none/.test(css)
  && /not\(#authDialog\):not\(#startScreen\)\{filter:blur/.test(css));
chk('start-open flag is set and cleared', /classList\.add\('start-open'\)/.test(ss) && /classList\.remove\('start-open'\)/.test(ss));
chk('enterApp() redirects to the dashboard',
  /function enterApp\(\)/.test(accountUi) && /StartScreen\.close\(\)/.test(accountUi) && /getElementById\('grid'\)/.test(accountUi));
chk('both sign-in paths funnel through the shared auth transition',
  /function authTransition\(\)/.test(accountUi)
  && /function authTransition\(\)\{[^}]*enterApp\(\)/.test(accountUi)
  && (accountUi.match(/if\(res===true\)authTransition\(\);/g) || []).length >= 2);
chk('"Sign in with Google" button present', /id="gsignBtn"/.test(html));
chk('Google button carries the 4-colour logo',
  /class="gsignLogo"/.test(html) && /fill="#EA4335"/.test(html) && /fill="#4285F4"/.test(html)
  && /fill="#FBBC05"/.test(html) && /fill="#34A853"/.test(html));
chk('Google Identity Services loader is wired',
  /accounts\.google\.com\/gsi\/client/.test(html) && /googleRenderButton/.test(accountUi));
chk('Google accounts default to Drive as the cloud backend',
  /u\.provider==='google'\)return 'drive'/.test(account));
chk('Google sign-in persists the Drive preference',
  /if\(!u\.storagePref\)u\.storagePref='drive'/.test(account) && /storagePref:'drive'/.test(account));
chk('an explicit storage choice is never overwritten',
  /if\(u&&u\.storagePref\)return u\.storagePref/.test(account)
  && /if\(!u\.storagePref\)u\.storagePref='drive'/.test(account));
chk('Drive falls back safely when not connected',
  /p==='drive'&&typeof DriveBooks!=='undefined'&&DriveBooks\.isConnected\(\)\)return DriveBooks/.test(account));

chk('clearHeadersForNewAccount resets cells, widths and history for a new account',
  /function clearHeadersForNewAccount/.test(accountUi) && /wb=\{cur:0,sheets:\[\{name:'Sheet1',cells:\{\}\}\]\}/.test(accountUi)
  && /colW=new Array\(COLS\)\.fill\(88\)/.test(accountUi));
chk('a returning account keeps their own sheet',
  /if\(prev===user\.id\)return false/.test(accountUi) && /LAST_ACCOUNT_KEY='mx-last-account-v1'/.test(accountUi));
chk('it runs on every account change', /Account\.onChange\(\(\)=>\{[^}]*clearHeadersForNewAccount/.test(accountUi));

// ------------------------------------------------------------------- npm start
console.log('\n--- electron launch (npm start) ---');
const main = read('main.js');
chk('HTTP disk cache disabled (the stderr noise PowerShell surfaced)',
  /appendSwitch\('disk-cache-size',\s*'0'\)/.test(main));
chk('GPU program + shader disk caches disabled',
  /appendSwitch\('disable-gpu-program-cache'\)/.test(main)
  && /appendSwitch\('disable-gpu-shader-disk-cache'\)/.test(main));
chk('switches are applied before the app is ready',
  main.indexOf("appendSwitch('disk-cache-size'") < main.indexOf('whenReady()'));
chk('the root cause is documented next to the fix',
  /Unable to move the cache/.test(main) && /NativeCommandError/.test(main));

// ----------------------------------------------------------------- integrity
console.log('\n--- integrity ---');
const o = (html.match(/<div\b/g) || []).length, c = (html.match(/<\/div>/g) || []).length;
chk('div tags balanced (' + o + '/' + c + ')', o === c);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
chk('no duplicate ids', new Set(ids).size === ids.length);
chk('window is full-bleed (no green page padding)', /body\{background:var\(--xl-ribbon\);padding:0/.test(css));
for (const f of ['js/start-screen.js', 'js/account-ui.js', 'js/ribbon-display.js', 'js/account.js', 'js/auth-guard.js', 'js/formulaAuditing.js']) {
  let ok = true; try { new Function(read(f)); } catch (e) { ok = false; console.log('        ' + e.message); }
  chk(f + ' parses', ok);
}
/* Formula Auditing: the file is module-global code, so a mis-nested brace would
   still parse but would hide half the commands inside another function, where
   nothing can reach them. Asserting the real thing - that every entry point is
   a global after the module runs - is what catches that, where a syntax check
   cannot. The engine is stubbed because this module only borrows from it. */
const auditingSrc = read('js/formulaAuditing.js');
const auditGlobals = (() => {
  const stub = {
    document: {
      readyState: 'complete', getElementById: () => null,
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
      addEventListener() {}
    },
    STR: {}, LANG: 'en'
  };
  stub.window = stub;
  const run = new Function('$', 'T', 'STR', 'LANG', 'document', 'active', 'vals', 'wb',
    'cell', 'sheet', 'dispVal', 'refsInFormula', 'evalFormula', 'isErr',
    'popMenu', 'saveLS', 'setStatusMode', 'renderAll', 'syncRibbon', 'selA', 'selB',
    auditingSrc + '\nreturn {evaluateFormula, openEvaluateDialog, findCellErrors, errorCheckMenu, watchList, watchAdd, watchRemove, renderWatchList, openWatchDialog, initFormulaAuditing};');
  const noop = () => {};
  return run(noop, (k) => k, stub.STR, 'en', stub.document, 'A1', {}, { cells: {} },
    () => null, () => ({ cells: {} }), () => '', () => [], () => 0, () => false,
    noop, noop, noop, noop, 'A1', 'A1');
})();
chk('every Formula Auditing entry point is reachable from module scope',
  ['evaluateFormula', 'openEvaluateDialog', 'findCellErrors', 'errorCheckMenu',
   'watchList', 'watchAdd', 'watchRemove', 'renderWatchList', 'openWatchDialog',
   'initFormulaAuditing'].every(k => typeof auditGlobals[k] === 'function'));
chk('formulaAuditing.js adds no i18n key that collides with the id it fills',
  /data-i18n="evalResultLbl"/.test(html) && !/data-i18n="evalResult"/.test(html));
// Every data-i18n key used by the start screen must resolve inside its own module.
const ssKeys = new Set([...ss.matchAll(/^\s*([A-Za-z0-9_]+):\{/gm)].map(m => m[1]));
const ssUsed = new Set([
  ...[...html.matchAll(/data-i18n(?:-ph)?="(ss[A-Za-z0-9_]*)"/g)].map(m => m[1]),
  ...[...ss.matchAll(/\bT\('(ss[A-Za-z0-9_]*)'\)/g)].map(m => m[1])
]);
const ssMissing = [...ssUsed].filter(k => !ssKeys.has(k));
chk('all start-screen i18n keys defined' + (ssMissing.length ? ' (missing: ' + ssMissing.join(', ') + ')' : ''),
  ssMissing.length === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
