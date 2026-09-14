const fs = require('fs');
const src = fs.readFileSync('electron/main.js', 'utf8');
const lines = src.split('\n');
const idx = lines.findIndex((l) => l.includes("ipcMain.handle('gh:prCommentReply'"));
const out = {
  hasResolvedInReplyTo: src.includes('const inReplyToId = Number(opts?.inReplyToId) || null;'),
  hasUpperCaseFieldF: src.includes("'-F', `in_reply_to=${inReplyToId}`"),
  hasLowerCaseFieldF_forReply: src.includes("'-f', `in_reply_to=${inReplyToId}`"),
  handlerSnippet: lines.slice(idx, idx + 27).map((l, i) => `${idx + i + 1}\t${l}`).join('\n'),
};
fs.writeFileSync('reply-check.json', JSON.stringify(out, null, 1));