// _fix_prim.js - normalize the prim() tail of the extracted engine script.
// Targets the mangled copy, which has (a) one extra leading space on these six
// lines (6/6/5/4/4/3 spaces) and (b) the ) of expect(...) moved out of the
// quotes (expect(''));}).  Output is the current js/script.js text:
// 5/5/4/3/3/2 spaces with expect(')');}
// Usage: node _fix_prim.js [path]      (default: c:/New folder/js/script.js)
// On the already-normalized js/script.js this script is a safe no-op.
const fs = require('fs');

const file = process.argv[2] || 'c:/New folder/js/script.js';
let content = fs.readFileSync(file, 'utf8');
const before = content;

// 1. dedent guard line (6 spaces -> 5)
content = content.replace(/^      if\(guard>=1000\)throw'#ERROR!';/gm,
  "     if(guard>=1000)throw'#ERROR!';");

// 2. dedent expect line + restore the ) that was moved out of the quotes
//    mangled: expect(''));}  ->  correct: expect(')');}
content = content.replace(/^      expect\(''\)\);}/gm,
  "     expect(')');}");

// 3. dedent return line (5 spaces -> 4)
content = content.replace(/^     return callFn\(t\.v,args\);}/gm,
  "    return callFn(t.v,args);}");

// 4. dedent if-line (4 spaces -> 3); the ( inside the string literal survives
content = content.replace(/^    if\(t\.t==='op'&&t\.v==='\('\)\{/gm,
  "   if(t.t==='op'&&t.v==='('){");

// 5. dedent throw line (4 spaces -> 3)
content = content.replace(/^    throw'#ERROR!';/gm,
  "   throw'#ERROR!';");

// 6. dedent prim() closing brace - anchored to only match after the throw line
content = content.replace(/(throw'#ERROR!';\r?\n)   \}/g, '$1  }');

if (content === before) console.log('nothing to normalize in', file);
else { fs.writeFileSync(file, content, 'utf8'); console.log('prim() tail normalized in', file); }
