// _writer.js - regenerates _fix_prim.js.
// String.raw keeps every regex backslash literal, so the text between the
// backticks is byte-for-byte what lands in _fix_prim.js (no escaping layers).
// Usage: node _writer.js [output]      (default: c:/New folder/_fix_prim.js)
const fs = require('fs');
const ln = s => s + '\n';

let out = '';
out += ln(String.raw`// _fix_prim.js - normalize the prim() tail of the extracted engine script.`);
out += ln(String.raw`// Targets the mangled copy, which has (a) one extra leading space on these six`);
out += ln(String.raw`// lines (6/6/5/4/4/3 spaces) and (b) the ) of expect(...) moved out of the`);
out += ln(String.raw`// quotes (expect(''));}).  Output is the current js/script.js text:`);
out += ln(String.raw`// 5/5/4/3/3/2 spaces with expect(')');}`);
out += ln(String.raw`// Usage: node _fix_prim.js [path]      (default: c:/New folder/js/script.js)`);
out += ln(String.raw`// On the already-normalized js/script.js this script is a safe no-op.`);
out += ln(String.raw`const fs = require('fs');`);
out += ln('');
out += ln(String.raw`const file = process.argv[2] || 'c:/New folder/js/script.js';`);
out += ln(String.raw`let content = fs.readFileSync(file, 'utf8');`);
out += ln(String.raw`const before = content;`);
out += ln('');

out += ln(String.raw`// 1. dedent guard line (6 spaces -> 5)`);
out += ln(String.raw`content = content.replace(/^      if\(guard>=1000\)throw'#ERROR!';/gm,`);
out += ln(String.raw`  "     if(guard>=1000)throw'#ERROR!';");`);
out += ln('');

out += ln(String.raw`// 2. dedent expect line + restore the ) that was moved out of the quotes`);
out += ln(String.raw`//    mangled: expect(''));}  ->  correct: expect(')');}`);
out += ln(String.raw`content = content.replace(/^      expect\(''\)\);}/gm,`);
out += ln(String.raw`  "     expect(')');}");`);
out += ln('');

out += ln(String.raw`// 3. dedent return line (5 spaces -> 4)`);
out += ln(String.raw`content = content.replace(/^     return callFn\(t\.v,args\);}/gm,`);
out += ln(String.raw`  "    return callFn(t.v,args);}");`);
out += ln('');

out += ln(String.raw`// 4. dedent if-line (4 spaces -> 3); the ( inside the string literal survives`);
out += ln(String.raw`content = content.replace(/^    if\(t\.t==='op'&&t\.v==='\('\)\{/gm,`);
out += ln(String.raw`  "   if(t.t==='op'&&t.v==='('){");`);
out += ln('');

out += ln(String.raw`// 5. dedent throw line (4 spaces -> 3)`);
out += ln(String.raw`content = content.replace(/^    throw'#ERROR!';/gm,`);
out += ln(String.raw`  "   throw'#ERROR!';");`);
out += ln('');

out += ln(String.raw`// 6. dedent prim() closing brace - anchored to only match after the throw line`);
out += ln(String.raw`content = content.replace(/(throw'#ERROR!';\r?\n)   \}/g, '$1  }');`);
out += ln('');

out += ln(String.raw`if (content === before) console.log('nothing to normalize in', file);`);
out += ln(String.raw`else { fs.writeFileSync(file, content, 'utf8'); console.log('prim() tail normalized in', file); }`);

const target = process.argv[2] || 'c:/New folder/_fix_prim.js';
fs.writeFileSync(target, out, 'utf8');
console.log('wrote', target, '(' + out.split('\n').length + ' lines)');
