const fs = require('fs');
const cp = require('child_process');
const dir = 'C:\\New folder';

console.log('=== FINAL VERIFICATION ===\n');

// Syntax checks
const files = ['js\\script.js', 'js\\account.js', 'js\\account-ui.js'];
files.forEach(f => {
  try {
    const fullPath = dir + '\\' + f;
    cp.execSync('node --check "' + fullPath + '"', { encoding: 'utf8' });
    console.log('✓ ' + f + ' - syntax OK');
  } catch(e) {
    console.log('✗ ' + f + ' - SYNTAX ERROR');
  }
});

// Final state check
const h = fs.readFileSync(dir + '\\index.html', 'utf8');
const a = fs.readFileSync(dir + '\\js\\account.js', 'utf8');
const u = fs.readFileSync(dir + '\\js\\account-ui.js', 'utf8');
const j = fs.readFileSync(dir + '\\js\\script.js', 'utf8');

console.log('\n=== FEATURE CHECK ===');
console.log('1. Toolbar buttons removed:');
console.log('   bNew:', !h.includes('id="bNew"') ? '✓ removed' : '✗ still present');
console.log('   bImport:', !h.includes('id="bImport"') ? '✓ removed' : '✗ still present');
console.log('   bPrint:', !h.includes('id="bPrint"') ? '✓ removed' : '✗ still present');

console.log('2. Backstage (File menu):');
console.log('   Sidebar HTML:', h.includes('id="backstage"') ? '✓ present' : '✗ missing');
console.log('   JS functions:', j.includes('openBackstage') && j.includes('closeBackstage') ? '✓ present' : '✗ missing');
console.log('   File button wired:', j.includes('openBackstage') && j.includes('rFile') ? '✓ wired' : '✗ not wired');

console.log('3. Account system:');
console.log('   Auth dialog:', h.includes('id="accDlg"') ? '✓ present' : '✗ missing');
console.log('   Account panel:', h.includes('id="accPanel"') ? '✓ present' : '✗ missing');
console.log('   Account engine:', a.includes('signUp') && a.includes('signIn') && a.includes('signOut') ? '✓ present' : '✗ missing');

console.log('4. API key system:');
console.log('   getApiKey:', a.includes('getApiKey') ? '✓ present' : '✗ missing');
console.log('   regenerateApiKey:', a.includes('regenerateApiKey') ? '✓ present' : '✗ missing');
console.log('   Monthly rotation:', a.includes('monthKey') && a.includes('86400000') && a.includes('/ 30') ? '✓ present' : '✗ missing');
console.log('   UI elements:', h.includes('id="accApiKeyInput"') && h.includes('id="accRegenerateApiKey"') ? '✓ present' : '✗ missing');

console.log('\n=== ALL CHECKS COMPLETE ===');
