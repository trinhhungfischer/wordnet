const fs = require('fs');
let code = fs.readFileSync('src/components/GraphEditor.tsx', 'utf8');

// 1. Fix implicit any
code = code.replace(/parsed\.nodes\.forEach\(\(n\) => \{/, 'parsed.nodes.forEach((n: Node) => {');

// 2. Fix reduce cast
code = code.replaceAll(/Math\.max\(max, \(n\.data\?\.globalIndex\) \|\| 0\)/g, 'Math.max(max, (n.data?.globalIndex as number) || 0)');

// 3. Fix sort cast
code = code.replaceAll(/\(a\.data\?\.globalIndex\) - \(b\.data\?\.globalIndex\)/g, '(a.data?.globalIndex as number) - (b.data?.globalIndex as number)');

fs.writeFileSync('src/components/GraphEditor.tsx', code);
console.log('Fixed TS errors');
