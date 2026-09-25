const fs = require('fs');
const p = 'C:/New folder';

var h = fs.readFileSync(p + '/index.html', 'utf8');
var j = fs.readFileSync(p + '/js/script.js', 'utf8');
var a = fs.readFileSync(p + '/js/account.js', 'utf8');
var u = fs.readFileSync(p + '/js/account-ui.js', 'utf8');
var c = fs.readFileSync(p + '/css/styles.css', 'utf8');

var allOk = true;
function chk(name, ok) {
  if (ok) { console.log('PASS - ' + name); }
  else { console.log('FAIL - ' + name); allOk = false; }
}

console.log('--- HTML ---');
chk('bNew button removed', h.indexOf('id="bNew"') === -1 && h.indexOf("id='bNew'") === -1);
chk('bImport button removed', h.indexOf('id="bImport"') === -1 && h.indexOf("id='bImport'") === -1);
chk('bPrint button removed', h.indexOf('id="bPrint"') === -1 && h.indexOf("id='bPrint'") === -1);
chk('Backstage sidebar exists', h.indexOf('id="backstage"') >= 0 && h.indexOf('bsRail') >= 0 && h.indexOf('bsPane') >= 0);
chk('Account dialog exists', h.indexOf('id="accDlg"') >= 0);
chk('Account panel exists', h.indexOf('id="accPanel"') >= 0);
chk('API key UI elements exist', h.indexOf('accApiKeyInput') >= 0 && h.indexOf('accShowApiKey') >= 0 && h.indexOf('accRegenerateApiKey') >= 0);

console.log('\n--- script.js ---');
var jq = String.fromCharCode(36) + '("';
var jqAttr = jq + '#bNew").onclick';
var jqImportAttr = jq + '#bImport").onclick';
var jqPrintAttr = jq + '#bPrint2").onclick';
var jqFileInAttr = jq + '#fileIn").onchange';
var jqExportAttr = jq + '#bExport").onclick';
var jqXlsxAttr = jq + '#bXlsx").onclick';
var jqAllCsvAttr = jq + '#bAllCsv").onclick';

chk('bNew onclick removed', j.indexOf(jqAttr) === -1);
chk('bImport onclick removed', j.indexOf(jqImportAttr) === -1);
chk('bPrint2 onclick removed', j.indexOf(jqPrintAttr) === -1);
chk('fileIn handler preserved', j.indexOf(jqFileInAttr) >= 0);
chk('bExport handler preserved', j.indexOf(jqExportAttr) >= 0);
chk('bXlsx handler preserved', j.indexOf(jqXlsxAttr) >= 0);
chk('bAllCsv handler preserved', j.indexOf(jqAllCsvAttr) >= 0);
chk('Backstage functions exist', j.indexOf('openBackstage') >= 0 && j.indexOf('closeBackstage') >= 0 && j.indexOf('showBsPage') >= 0);
chk('Account UI init exists', j.indexOf('initAllAccountUI') >= 0);
chk('Syntax valid', (function() { try { new Function(j); return true; } catch(e) { return false; } })());

console.log('\n--- account.js ---');
chk('getApiKey function', a.indexOf('Account.getApiKey') >= 0 && a.indexOf('monthKey') >= 0);
chk('regenerateApiKey function', a.indexOf('Account.regenerateApiKey') >= 0);
chk('listApiKeys function', a.indexOf('Account.listApiKeys') >= 0);
chk('Monthly rotation logic', a.indexOf('monthKey') >= 0 && a.indexOf('86400000 / 30') >= 0);
chk('Crypto hashing', a.indexOf('crypto.subtle.digest') >= 0 || a.indexOf('SHA-256') >= 0);
chk('localStorage keys', a.indexOf('ACCOUNT_USERS_KEY') >= 0 && a.indexOf('ACCOUNT_SESSION_KEY') >= 0);
chk('Cloud storage', a.indexOf('CloudBooks') >= 0);
chk('Syntax valid', (function() { try { new Function(a); return true; } catch(e) { return false; } })());

console.log('\n--- account-ui.js ---');
var onQuote = String.fromCharCode(39);
var showHandler = u.indexOf('on(' + onQuote + '#accShowApiKey' + onQuote) >= 0;
var regenHandler = u.indexOf('on(' + onQuote + '#accRegenerateApiKey' + onQuote) >= 0;
chk('Show API key handler', showHandler);
chk('Regenerate API key handler', regenHandler);
chk('apiKeyInput reference', u.indexOf('apiKeyInput') >= 0);
chk('getApiKey call', u.indexOf('Account.getApiKey') >= 0);
chk('regenerateApiKey call', u.indexOf('Account.regenerateApiKey') >= 0);
chk('i18n: accApiKey', u.indexOf('accApiKey') >= 0 && u.indexOf('API key') >= 0);
chk('i18n: accShowApiKey', u.indexOf('accShowApiKey') >= 0);
chk('i18n: accRegenerateApiKey', u.indexOf('accRegenerateApiKey') >= 0);
chk('i18n: accApiKeyHint', u.indexOf('accApiKeyHint') >= 0);
chk('i18n: accCopySuccess', u.indexOf('accCopySuccess') >= 0);
chk('Syntax valid', (function() { try { new Function(u); return true; } catch(e) { return false; } })());

console.log('\n--- styles.css ---');
chk('Backstage CSS', c.indexOf('#backstage') >= 0 && c.indexOf('.bsRail') >= 0 && c.indexOf('.bsPane') >= 0);
chk('Account system CSS', c.indexOf('#accDlg') >= 0 && c.indexOf('#accPanel') >= 0 && c.indexOf('.accChip') >= 0);
chk('API key CSS', c.indexOf('accApiKeyInput') >= 0 && c.indexOf('accApiKeyHint') >= 0);
chk('Dark theme API key', c.indexOf("body[data-theme='dark'] .accApiKeyInput") >= 0 && c.indexOf("body[data-theme='dark'] .accApiKeyHint") >= 0);
chk('Sharp FX API key', c.indexOf("body[data-fx='sharp'] .accApiKeyInput") >= 0);
chk('Round FX API key', c.indexOf("body[data-fx='round'] .accApiKeyInput") >= 0);

console.log('\n========================================');
console.log(allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED');
console.log('========================================');