const fs = require('fs');
const { execSync } = require('child_process');
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const head = sh('git rev-parse HEAD');
const remote = sh('git ls-remote --heads origin master').split(/\s+/)[0].trim();
const scratchTracked = sh('git ls-files').split('\n').filter((f) => /diag|diagnostic|electron-status/.test(f));
const worktree = sh('git status --porcelain') || '(clean)';
const diskLeft = fs.readdirSync('.').filter((n) => /\.(log|txt)$/.test(n) && /(diag|diagnostic|electron-status|final|verdict|tracked|removal)/.test(n));
fs.writeFileSync('DONE.json', JSON.stringify({
  head, remote, sameCommit: head === remote,
  scratchTrackedCount: scratchTracked.length,
  worktree, diskScratchLeft: diskLeft,
}, null, 1));