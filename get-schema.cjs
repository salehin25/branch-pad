const fs = require('fs');
const src = fs.readFileSync('electron/database.js', 'utf8');
const sqlLines = src.split('\n').filter(l => l.includes('CREATE') || l.includes('TABLE') || l.includes('key TEXT'));
fs.writeFileSync('schema-info.txt', [
  '=== database.js full source ===',
  src,
  '',
  '=== SQL lines ===',
  ...sqlLines,
].join('\n'));