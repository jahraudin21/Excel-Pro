const fs = require('fs');
const j = fs.readFileSync('C:/New folder/js/script.js', 'utf8');
const lines = j.split('\n');
let inSyncRibbon = false;
let issues = [];

lines.forEach((l, i) => {
  if (l.indexOf('function syncRibbon') !== -1) {
    inSyncRibbon = true;
    console.log('syncRibbon starts at line ' + (i + 1));
  }
  if (inSyncRibbon) {
    // Check for direct .title assignments on specific buttons without null check
    if (l.indexOf('.title') !== -1 && l.indexOf('#b') !== -1 && 
        l.indexOf('if') === -1 && l.trim().indexOf('const ') === -1 &&
        l.trim().indexOf('let ') === -1) {
      issues.push('Line ' + (i + 1) + ': ' + l.trim());
    }
    if (l === '}' && inSyncRibbon) {
      inSyncRibbon = false;
    }
  }
});

console.log('\nFound ' + issues.length + ' potential syncRibbon issues:');
issues.forEach(x => console.log(x));

// Check the specific buttons that were removed
const removedButtons = ['bNew', 'bImport', 'bPrint'];
removedButtons.forEach(btn => {
  const count = j.split("$('#" + btn + "')").length - 1;
  if (count > 0) {
    console.log('\nWarning: "#' + btn + '" still referenced ' + count + ' times');
    // Find the lines
    lines.forEach((l, i) => {
      if (l.indexOf("$('#" + btn + "')") !== -1) {
        console.log('  Line ' + (i + 1) + ': ' + l.trim());
      }
    });
  }
});