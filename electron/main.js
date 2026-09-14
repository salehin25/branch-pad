const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { initDatabase, getDb } = require('./database');

let mainWindow;

function getDataDir() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || process.env.PORTABLE_EXECUTABLE_FILE;
  if (portableDir) {
    const dataDir = path.join(portableDir, 'Portable', 'Data');
    fs.mkdirSync(dataDir, { recursive: true });
    return dataDir;
  }
  return app.getPath('userData');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'BranchPad',
  });

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[BranchPad] Preload error: ${error.message}`);
  });
}

// ── App ping ───────────────────────────────────────────────────────────
ipcMain.handle('app:ping', () => true);

// ── Database IPC handlers ─────────────────────────────────────────────
ipcMain.handle('db:getAll', (_event, query, params) => {
  return getDb().prepare(query).all(...(params || []));
});

ipcMain.handle('db:getOne', (_event, query, params) => {
  return getDb().prepare(query).get(...(params || []));
});

ipcMain.handle('db:run', (_event, query, params) => {
  return getDb().prepare(query).run(...(params || []));
});

// ── GitHub CLI helpers ─────────────────────────────────────────────────
function safeArg(value) {
  const s = String(value ?? '');
  if (/[&|<>^`"']/.test(s)) throw new Error(`Unsafe argument: ${s}`);
  return s;
}

function runGh(args) {
  const cmd = ['gh', ...args].join(' ');
  return execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim();
}

function enrichPr(pr) {
  if (!pr) return null;
  const reviewers = {};
  const reviews = Array.isArray(pr.reviews) ? pr.reviews : [];
  for (const r of reviews) {
    if (r.user && r.user.login) reviewers[r.user.login] = r.state || '';
  }
  const approvalsCount = Object.values(reviewers).filter((s) => s === 'APPROVED').length;
  const comments = Array.isArray(pr.comments) ? pr.comments : [];
  const pendingCommentsCount =
    comments.length + reviews.filter((r) => r.state === 'CHANGES_REQUESTED').length;

  return {
    github_id: pr.id ?? null,
    number: pr.number,
    title: pr.title || '',
    state: pr.state || 'open',
    is_draft: !!pr.isDraft,
    review_decision: pr.reviewDecision || null,
    approvals_count: approvalsCount,
    pending_comments_count: pendingCommentsCount,
    html_url: pr.url || '',
    merged_at: pr.mergedAt || null,
  };
}

// ── GitHub CLI IPC handlers ───────────────────────────────────────────
ipcMain.handle('gh:prList', (_event, opts) => {
  const repo = safeArg(opts?.repo);
  const branch = safeArg(opts?.branch);
  try {
    const cmd = `gh pr list --repo ${repo} --head "${branch}" --state all --json number,url`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 20000 });
    return JSON.parse(output || '[]');
  } catch (err) {
    console.error('gh pr list failed:', err.message);
    return [];
  }
});

ipcMain.handle('gh:prView', (_event, opts) => {
  const repo = safeArg(opts?.repo);
  const prNumber = safeArg(opts?.prNumber);
  try {
    const args = [
      'pr', 'view', String(prNumber),
      '--repo', repo,
      '--json', 'id,number,title,state,isDraft,reviewDecision,url,mergedAt,comments,reviews',
    ];
    const output = runGh(args);
    return enrichPr(JSON.parse(output || '{}'));
  } catch (err) {
    console.error('gh pr view failed:', err.message);
    return null;
  }
});

ipcMain.handle('gh:checkAuth', () => {
  try {
    const user = runGh(['api', 'user', '--jq', '.login']);
    return { ok: true, user };
  } catch {
    return { ok: false, user: null, message: 'Not authenticated. Run `gh auth login`.' };
  }
});

// ── PR Comments IPC handlers ──────────────────────────────────────────
ipcMain.handle('gh:prComments', (_event, opts) => {
  const repo = safeArg(opts?.repo);
  const prNumber = safeArg(opts?.prNumber);
  try {
    // Fetch review comments (inline code comments)
    const reviewJson = runGh([
      'api', `repos/${repo}/pulls/${prNumber}/comments`,
    ]);
    const reviewComments = JSON.parse(reviewJson || '[]');
    const reviewMapped = reviewComments.map((c) => ({
      id: c.id,
      type: 'review',
      author: c.user?.login || 'unknown',
      body: c.body || '',
      path: c.path || null,
      line: c.line || null,
      createdAt: c.created_at || '',
      inReplyToId: c.in_reply_to_id || null,
      updatedAt: c.updated_at || '',
    }));

    // Fetch issue comments (general PR comments)
    const issueJson = runGh([
      'api', `repos/${repo}/issues/${prNumber}/comments`,
    ]);
    const issueComments = JSON.parse(issueJson || '[]');
    const issueMapped = issueComments.map((c) => ({
      id: c.id,
      type: 'issue',
      author: c.user?.login || 'unknown',
      body: c.body || '',
      path: null,
      line: null,
      createdAt: c.created_at || '',
      inReplyToId: null,
      updatedAt: c.updated_at || '',
    }));

    // Combine and sort by creation date
    const all = [...reviewMapped, ...issueMapped].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    return all;
  } catch (err) {
    console.error('gh pr comments failed:', err.message);
    return [];
  }
});

ipcMain.handle('gh:prCommentReply', (_event, opts) => {
  const repo = safeArg(opts?.repo);
  const prNumber = safeArg(opts?.prNumber);
  const body = String(opts?.body || '');
  const inReplyToId = opts?.inReplyToId || null;
  try {
    if (inReplyToId) {
      // Reply to a review comment thread
      // Values are double-quoted so spaces in the body survive execSync's
      // join — safeArg() already rejected any double-quote characters.
      const result = runGh([
        'api', `repos/${repo}/pulls/${prNumber}/comments`,
        '--method', 'POST',
        '-f', `body="${body}"`,
        '-f', `in_reply_to=${inReplyToId}`,
      ]);
      return { ok: true, comment: JSON.parse(result || '{}') };
    } else {
      // General issue comment
      const result = runGh([
        'api', `repos/${repo}/issues/${prNumber}/comments`,
        '--method', 'POST',
        '-f', `body="${body}"`,
      ]);
      return { ok: true, comment: JSON.parse(result || '{}') };
    }
  } catch (err) {
    console.error('gh pr comment reply failed:', err.message);
    return { ok: false, error: err.message };
  }
});

// ── Clipboard IPC handler ─────────────────────────────────────────────
ipcMain.handle('clipboard:write', (_event, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(String(text));
  return true;
});

// ── Bootstrap ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const dataDir = getDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  initDatabase(dataDir);
  createWindow();
  console.log(`[BranchPad] ready – data dir: ${dataDir}`);
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
