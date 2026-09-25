const fs = require('fs');
const j = fs.readFileSync('C:/New folder/js/script.js', 'utf8');

// Find all references to title settings on potentially-removed buttons
const lines = j.split('\n');
let issues = [];

lines.forEach((line, i) => {
  // Check for direct .title assignments without null check
  const checks = [
    "$('#bNew').title",
    "$('#bImport').title", 
    "$('#bPrint').title",
    "$('#bNew').onclick",
    "$('#bImport').onclick",
    "$('#bPrint').onclick"
  ];
  
  checks.forEach(check => {
    if (line.indexOf(check) !== -1) {
      issues.push('Line ' + (i+1) + ': ' + line.trim());
    }
  });
});

if (issues.length > 0) {
  console.log('Found ' + issues.length + ' problematic references:');
  issues.forEach(i => console.log(i));
} else {
  console.log('No problematic references found');
}

// Also check for .title assignments via hide or other functions
lines.forEach((line, i) => {
  if ((line.indexOf('.title=') !== -1 || line.indexOf('.title =') !== -1) && 
      line.indexOf('if') === -1) {
    // Check if it's setting title on something that could be null
    if (line.indexOf('$(\'#b') !== -1) {
      console.log('Potential null title issue at line ' + (i+1) + ': ' + line.trim());
    }
  }
});

console.log('\nDone checking');