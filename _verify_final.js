const fs = require('fs');
const path = 'C:/New folder';

console.log('========================================');
console.log('  MINI EXCEL - FINAL VERIFICATION');
console.log('========================================\n');

let allPassed = true;

function check(name, condition) {
  const status = condition ? 'PASS' : 'FAIL';
  if (!condition) allPassed = false;
  console.log(status + ' - ' + name);
}

// Load all files
const h = fs.readFileSync(path + '/index.html', 'utf8');
const j = fs.readFileSync(path + '/js/script.js', 'utf8');
const a = fs.readFileSync(path + '/js/account.js', 'utf8');
const u = fs.readFileSync(path + '/js/account-ui.js', 'utf8');
const c = fs.readFileSync(path + '/css/styles.css', 'utf8');

// === HTML CHECKS ===
console.log('--- HTML ---');
check('bNew button removed', !h.includes('id="bNew"') && !h.includes("id='bNew'"));
check('bImport button removed', !h.includes('id="bImport"') && !h.includes("id='bImport'"));
check('bPrint button removed', !h.includes('id="bPrint"') && !h.includes("id='bPrint'"));
check('Backstage sidebar exists', h.includes('id="backstage"') && h.includes('bsRail') && h.includes('bsPane'));
check('Account dialog exists', h.includes('id="accDlg"'));
check('Account panel exists', h.includes('id="accPanel"'));
check('API key UI elements exist', h.includes('accApiKeyInput') && h.includes('accShowApiKey') && h.includes('accRegenerateApiKey'));

// === SCRIPT.JS CHECKS ===
console.log('\n--- script.js ---');
const noBNew = !j.includes("$('#bNew').onclick") && !j.includes("$(&#bNew').onclick") && !j.match(/\$\('#bNew'\)/);
const noBImport = !j.includes("$('#bImport').onclick") && !j.includes("$(&#bImport').onclick") && !j.match(/\$\('#bImport'\)/);
const noBPrint = !j.includes("$('#bPrint').onclick") && !j.includes("$(&#bPrint').onclick") && !j.match(/\$\('#bPrint'\)/);
check('bNew handler removed', noBNew);
check('bImport handler removed', noBImport);
check('bPrint handler removed', noBPrint);
check('fileIn handler preserved', j.includes("$('#fileIn').onchange"));
check('bExport handler preserved', j.includes("$('#bExport').onclick"));
check('bXlsx handler preserved', j.includes("$('#bXlsx').onclick"));
check('bAllCsv handler preserved', j.includes("$('#bAllCsv').onclick"));
check('Backstage functions exist', j.includes('openBackstage') && j.includes('closeBackstage') && j.includes('showBsPage'));
check('Account UI init exists', j.includes('initAllAccountUI'));
check('Syntax valid', (() => { try { new Function(j); return true; } catch(e) { return false; } })());

// === ACCOUNT.JS CHECKS ===
console.log('\n--- account.js ---');
check('getApiKey function', a.includes('Account.getApiKey') && a.includes('monthKey'));
check('regenerateApiKey function', a.includes('Account.regenerateApiKey'));
check('listApiKeys function', a.includes('Account.listApiKeys'));
check('Monthly rotation logic', a.includes('monthKey') && a.includes('86400000 / 30'));
check('Crypto hashing', a.includes('crypto.subtle.digest') || a.includes('SHA-256'));
check('localStorage keys', a.includes('ACCOUNT_USERS_KEY') && a.includes('ACCOUNT_SESSION_KEY'));
check('Cloud storage', a.includes('CloudBooks'));
check('Syntax valid', (() => { try { new Function(a); return true; } catch(e) { return false; } })());

// === ACCOUNT-UI.JS CHECKS ===
console.log('\n--- account-ui.js ---');
const hasShowHandler = u.includes('on("#accShowApiKey"') || u.includes("on('#accShowApiKey'");
const hasRegenHandler = u.includes('on("#accRegenerateApiKey"') || u.includes("on('#accRegenerateApiKey'");
check('Show API key handler', hasShowHandler);
check('Regenerate API key handler', hasRegenHandler);
check('apiKeyInput reference', u.includes('apiKeyInput'));
check('getApiKey call', u.includes('Account.getApiKey'));
check('regenerateApiKey call', u.includes('Account.regenerateApiKey'));
check('i18n: accApiKey', u.includes('accApiKey') && u.includes('API key'));
check('i18n: accShowApiKey', u.includes('accShowApiKey'));
check('i18n: accRegenerateApiKey', u.includes('accRegenerateApiKey'));
check('i18n: accApiKeyHint', u.includes('accApiKeyHint'));
check('i18n: accCopySuccess', u.includes('accCopySuccess'));
check('Syntax valid', (() => { try { new Function(u); return true; } catch(e) { return false; } })());

// === CSS CHECKS ===
console.log('\n--- styles.css ---');
check('Backstage CSS', c.includes('#backstage') && c.includes('.bsRail') && c.includes('.bsPane'));
check('Account system CSS', c.includes('#accDlg') && c.includes('#accPanel') && c.includes('.accChip'));
check('API key CSS', c.includes('accApiKeyInput') && c.includes('accApiKeyHint'));
check('Dark theme API key', c.includes("body[data-theme='dark'] .accApiKeyInput") && c.includes("body[data-theme='dark'] .accApiKeyHint"));
check('Sharp FX API key', c.includes("body[data-fx='sharp'] .accApiKeyInput"));
check('Round FX API key', c.includes("body[data-fx='round'] .accApiKeyInput"));

// === SUMMARY ===
console.log('\n========================================');
console.log(allPassed ? '  ALL 28 CHECKS PASSED' : '  SOME CHECKS FAILED');
console.log('========================================');