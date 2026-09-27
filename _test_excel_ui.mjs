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
chk('every tab has a matching command page', tabs.every(t => pages.includes(t)) && pages.every(p => tabs.includes(p)));
chk('ribbon body uses the Excel #f3f2f1 surface', /\.rbody\{background:var\(--xl-ribbon\)/.test(css));
chk('active tab is white like Excel', /\.rtab\.on\{background:#fff/.test(css));
chk('compact spacing (22px controls, 9.5px group labels)',
  /\.rbtn\{[^}]*height:22px/.test(css) && /\.rlabel\{[^}]*font-size:9\.5px/.test(css));

// ------------------------------------------------------------- File backstage
console.log('\n--- File menu (backstage) ---');
const rail = [...html.matchAll(/data-bs-page="([^"]+)"/g)].map(m => m[1]);
chk('rail is Home / New / Open / Recent / Save / Export / Print / OneDrive / Info / Account',
  JSON.stringify(rail) ===
  JSON.stringify(['home', 'new', 'open', 'recent', 'save', 'export', 'print', 'onedrive', 'info', 'account']));
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
  /body\.start-open #authDialog,body\.start-open #authLock\{z-index:9100\}/.test(css));
chk('lock veil spares the start screen (no blur / no pointer-events:none)',
  /body\.auth-locked #app>\*:not\(#authLock\):not\(#authDialog\):not\(#startScreen\)\{pointer-events:none/.test(css)
  && /not\(#authDialog\):not\(#startScreen\)\{filter:blur/.test(css));
chk('start-open flag is set and cleared', /classList\.add\('start-open'\)/.test(ss) && /classList\.remove\('start-open'\)/.test(ss));
chk('enterApp() redirects to the dashboard',
  /function enterApp\(\)/.test(accountUi) && /StartScreen\.close\(\)/.test(accountUi) && /getElementById\('grid'\)/.test(accountUi));
chk('both sign-in paths use enterApp(), not just closeAuthDialog()',
  (accountUi.match(/\{enterApp\(\);/g) || []).length >= 2);
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
for (const f of ['js/start-screen.js', 'js/account-ui.js', 'js/ribbon-display.js', 'js/account.js', 'js/auth-guard.js']) {
  let ok = true; try { new Function(read(f)); } catch (e) { ok = false; console.log('        ' + e.message); }
  chk(f + ' parses', ok);
}
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
