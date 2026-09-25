const fs = require('fs');
var path = 'C:/New folder';
var allOk = true;
var passed = 0;
var failed = 0;

function chk(name, condition) {
  if (condition) {
    console.log('PASS - ' + name);
    passed++;
  } else {
    console.log('FAIL - ' + name);
    failed++;
    allOk = false;
  }
}

// Load files
var h = fs.readFileSync(path + '/index.html', 'utf8');
var j = fs.readFileSync(path + '/js/script.js', 'utf8');
var a = fs.readFileSync(path + '/js/account.js', 'utf8');
var u = fs.readFileSync(path + '/js/account-ui.js', 'utf8');
var css = fs.readFileSync(path + '/css/styles.css', 'utf8');

// jQuery selector patterns (using $("...")
var jqBNew = '$("#bNew").onclick';
var jqBImport = '$("#bImport").onclick';
var jqBPrint2 = '$("#bPrint2").onclick';
var jqFileIn = '$("#fileIn").onchange';
var jqBExport = '$("#bExport").onclick';
var jqBXlsx = '$("#bXlsx").onclick';
var jqBAllCsv = '$("#bAllCsv").onclick';

// Quotes pattern for account-ui.js (using single quotes: on('#...')  )
var sqBShowApiKey = "on('#accShowApiKey'";
var sqBRegenApiKey = "on('#accRegenerateApiKey'";

console.log('=== VERIFICATION START ===\n');

// HTML checks
console.log('--- HTML ---');
chk('bNew button removed from HTML', h.indexOf('id="bNew"') === -1 && h.indexOf("id='bNew'") === -1);
chk('bImport button removed from HTML', h.indexOf('id="bImport"') === -1 && h.indexOf("id='bImport'") === -1);
chk('bPrint button removed from HTML', h.indexOf('id="bPrint"') === -1 && h.indexOf("id='bPrint'") === -1);
chk('Backstage sidebar exists in HTML', h.indexOf('id="backstage"') >= 0);
chk('Account dialog exists in HTML', h.indexOf('id="accDlg"') >= 0);
chk('Account panel exists in HTML', h.indexOf('id="accPanel"') >= 0);
chk('API key UI in HTML', h.indexOf('accApiKeyInput') >= 0 && h.indexOf('accShowApiKey') >= 0 && h.indexOf('accRegenerateApiKey') >= 0);

// script.js checks
console.log('\n--- script.js ---');
chk('bNew handler removed', j.indexOf(jqBNew) === -1);
chk('bImport handler removed', j.indexOf(jqBImport) === -1);
chk('bPrint2 handler removed', j.indexOf(jqBPrint2) === -1);
chk('fileIn handler preserved', j.indexOf(jqFileIn) >= 0);
chk('bExport handler preserved', j.indexOf(jqBExport) >= 0);
chk('bXlsx handler preserved', j.indexOf(jqBXlsx) >= 0);
chk('bAllCsv handler preserved', j.indexOf(jqBAllCsv) >= 0);
chk('Backstage openBackstage', j.indexOf('openBackstage') >= 0);
chk('Backstage closeBackstage', j.indexOf('closeBackstage') >= 0);
chk('Backstage showBsPage', j.indexOf('showBsPage') >= 0);
chk('Account UI init', j.indexOf('initAllAccountUI') >= 0);
chk('script.js syntax valid', (function() { try { new Function(j); return true; } catch(e) { return false; } })());

// account.js checks
console.log('\n--- account.js ---');
chk('getApiKey function', a.indexOf('Account.getApiKey') >= 0);
chk('regenerateApiKey function', a.indexOf('Account.regenerateApiKey') >= 0);
chk('listApiKeys function', a.indexOf('Account.listApiKeys') >= 0);
chk('monthly rotation logic', a.indexOf('monthKey') >= 0);
chk('SHA-256 hashing', a.indexOf('crypto.subtle.digest') >= 0 || a.indexOf('SHA-256') >= 0);
chk('localStorage users key', a.indexOf('ACCOUNT_USERS_KEY') >= 0);
chk('localStorage session key', a.indexOf('ACCOUNT_SESSION_KEY') >= 0);
chk('CloudBooks storage', a.indexOf('CloudBooks') >= 0);
chk('account.js syntax valid', (function() { try { new Function(a); return true; } catch(e) { return false; } })());

// account-ui.js checks
console.log('\n--- account-ui.js ---');
chk('Show API key handler', u.indexOf(sqBShowApiKey) >= 0);
chk('Regenerate API key handler', u.indexOf(sqBRegenApiKey) >= 0);
chk('apiKeyInput reference', u.indexOf('apiKeyInput') >= 0);
chk('Account.getApiKey call', u.indexOf('Account.getApiKey') >= 0);
chk('Account.regenerateApiKey call', u.indexOf('Account.regenerateApiKey') >= 0);
chk('i18n: accApiKey', u.indexOf('accApiKey') >= 0);
chk('i18n: accShowApiKey', u.indexOf('accShowApiKey') >= 0);
chk('i18n: accRegenerateApiKey', u.indexOf('accRegenerateApiKey') >= 0);
chk('i18n: accApiKeyHint', u.indexOf('accApiKeyHint') >= 0);
chk('i18n: accCopySuccess', u.indexOf('accCopySuccess') >= 0);
chk('account-ui.js syntax valid', (function() { try { new Function(u); return true; } catch(e) { return false; } })());

// CSS checks
console.log('\n--- styles.css ---');
chk('Backstage CSS', css.indexOf('#backstage') >= 0 && css.indexOf('.bsRail') >= 0);
chk('Account system CSS', css.indexOf('#accDlg') >= 0 && css.indexOf('#accPanel') >= 0);
chk('API key CSS', css.indexOf('accApiKeyInput') >= 0 && css.indexOf('accApiKeyHint') >= 0);
chk('Dark theme API key CSS', css.indexOf("body[data-theme='dark'] .accApiKeyInput") >= 0);
chk('Sharp FX API key CSS', css.indexOf("body[data-fx='sharp'] .accApiKeyInput") >= 0);
chk('Round FX API key CSS', css.indexOf("body[data-fx='round'] .accApiKeyInput") >= 0);

// Summary
console.log('\n=== VERIFICATION COMPLETE ===');
console.log(passed + ' passed, ' + failed + ' failed');
console.log(allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED');