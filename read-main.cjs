const fs = require('fs');
const lines = fs.readFileSync('electron/main.js', 'utf8').split('\n');
// Extract the runGh helper + both comment handlers.
const start = Math.max(0, lines.findIndex((l) => l.includes('function runGh')) - 5);
const end = Math.min(lines.length, lines.findIndex((l, i) => i > start && l.trim().startsWith("ipcMain.handle('gh:prView")) );
fs.writeFileSync('main-snippet.txt', lines.slice(start, Math.max(start + 60, end)).map((l, i) => `${start + i + 1}\t${l}`).join('\n'));