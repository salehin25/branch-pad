# BranchPad — Complete Feature Specification

> **Purpose:** A detailed, AI-friendly spec of every feature in BranchPad so that anyone
> could rebuild this app (or something like it) using an AI coding assistant from scratch.

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Electron main process                        │
│  main.js  ─── IPC handlers  ─── gh CLI (execSync)                   │
│  database.js ─── better-sqlite3 (WAL, foreign keys)                  │
│  preload.js ─── contextBridge exposes `window.api` to renderer       │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  ipcRenderer.invoke / ipcRenderer.on
┌──────────────────────────┴───────────────────────────────────────────┐
│                      Renderer process (Vite + React)                  │
│  App.jsx  ─── Sidebar + view routing                                 │
│  stores/  ─── Zustand (repoStore, branchStore, notesStore, etc.)     │
│  components/ ─── RepoPage, BranchRow, StickyNotesView, etc.          │
│  index.css ─── Tailwind + custom classes                              │
└──────────────────────────────────────────────────────────────────────┘
```

**Key tech decisions:**
- Electron 28+ (for `contextBridge` isolation — no `nodeIntegration`).
- React 18 + Vite 5 for fast HMR in dev and small production bundle.
- Zustand (tiny, no boilerplate) for renderer state — persisted via SQLite.
- better-sqlite3 (synchronous, no worker needed) for local data.
- `gh` CLI (already installed on dev machines) as the GitHub API gateway — avoids token management.
- Tailwind CSS 3 for utility-first styling with zero custom CSS boilerplate.

---

## 2. Data Model (SQLite)

Database file: `branchpad.db` in the app's data directory.

| Table | Purpose | Key columns |
|---|---|---|
| `repositories` | GitHub repos the user tracks | `id`, `owner`, `name`, `url` |
| `branches` | Branch names the user tracks (belongs to a repo) | `id`, `repo_id` (FK → repositories, CASCADE), `name` |
| `pull_requests` | PR data fetched from GitHub (one per branch) | `id`, `github_id` (unique), `branch_id` (FK → branches, CASCADE), `number`, `title`, `state`, `is_draft`, `approvals_count`, `pending_comments_count`, `html_url`, `merged_at`, `last_fetched` |
| `saved_prs` | Bookmarked PRs not tied to a tracked branch | `id`, `github_id` (unique), `repo_owner`, `repo_name`, `number`, `title`, `state`, `html_url` |
| `sticky_notes` | Corkboard notes (standalone, `target_type='note'`) | `id`, `target_type`, `target_id`, `content`, `updated_at` |
| `pr_history` | PRs that were merged, auto-archived | `id`, `github_id` (unique), `repo_owner`, `repo_name`, `branch_name`, `number`, `title`, `html_url`, `merged_at`, `moved_to_history_at` |
| `settings` | Key-value store (e.g. `refresh_interval`) | `key` (PK), `value` |

**Pragmas on init:**
```sql
PRAGMA journal_mode = WAL;      -- concurrent reads during writes
PRAGMA foreign_keys = ON;        -- CASCADE deletes propagate
```

---

## 3. IPC Bridge (main ↔ renderer)

The preload script (`preload.js`) uses `contextBridge.exposeInMainWorld` to expose a `window.api` object. The renderer **never** touches Node, `child_process`, or `require` directly.

### IPC shape

```js
// preload.js
contextBridge.exposeInMainWorld('api', {
  app: { ping: () => ipcRenderer.invoke('app:ping') },
  db: {
    getAll: (q, p) => ipcRenderer.invoke('db:getAll', q, p),
    getOne: (q, p) => ipcRenderer.invoke('db:getOne', q, p),
    run:    (q, p) => ipcRenderer.invoke('db:run', q, p),
  },
  gh: {
    prList:        (opts) => ipcRenderer.invoke('gh:prList', opts),
    prView:        (opts) => ipcRenderer.invoke('gh:prView', opts),
    checkAuth:     ()    => ipcRenderer.invoke('gh:checkAuth'),
    prComments:    (opts) => ipcRenderer.invoke('gh:prComments', opts),
    prCommentReply:(opts) => ipcRenderer.invoke('gh:prCommentReply', opts),
  },
  clipboard: { write: (text) => ipcRenderer.invoke('clipboard:write', text) },
});
```

### Handler → gh CLI flow (the `runGh` helper)

```js
// main.js
function runGh(args) {
  const cmd = ['gh', ...args].join(' ');  // args is an array of strings
  return execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim();
}
```

**Critical gotcha — `-f` vs `-F` in `gh api`:**
- `-f key=value` sends the value as a **raw string** (`"4004551677"`).
- `-F key=value` sends the value as **inferred JSON type** (`4004551677` as a number).
- The GitHub API for `POST /repos/.../pulls/{n}/comments` requires `in_reply_to` to be a **number**, so you **must** use `-F in_reply_to={id}`. Using lowercase `-f` causes HTTP 422 "is not a number".

**Critical gotcha — spaces in body values:**
Because `runGh` joins all args into one string for `execSync`, a body like `reply test3` would split into two shell tokens. The fix: wrap the body in shell double-quotes: `` `-f`, `body="${body}"` ``. This is safe because `safeArg()` already rejects `"` characters.

### `safeArg` — shell injection prevention

```js
function safeArg(value) {
  const s = String(value ?? '');
  if (/[&|<>^`"']/.test(s)) throw new Error(`Unsafe argument: ${s}`);
  return s;
}
```

Applied to every user-supplied value that goes into a shell command (repo owner/name, branch name, PR number). Body text is **not** run through `safeArg` (it needs to be arbitrary) but is quoted in the command string instead.

---

## 4. Feature: Multi-Repo Management

**UI:** Sidebar (dark left column) lists saved repos with a 🌿 icon per repo. Bottom of sidebar: nav items (Add, Notes, Saved PRs, History, Settings).

**Flow:**
1. User clicks "Add Repository" → `ReposView` shows an input for a GitHub URL (`https://github.com/owner/name`).
2. On submit: parses `owner/name` from the URL, inserts into `repositories` table, calls `loadRepos()` which re-queries SQLite.
3. `App.jsx` auto-selects the new repo via an `initializedRef` guard (only fires on initial mount — never hijacks the user's view after that).
4. User can remove a repo from the sidebar → deletes from `repositories` (CASCADE removes branches + PRs).

**Files:** `ReposView.jsx`, `repoStore.js`, `Sidebar.jsx`, `App.jsx`

---

## 5. Feature: Branch Tracking

**On a repo page (`RepoPage.jsx`):**
1. User pastes branch names (one per line) into a textarea.
2. On submit: each line is inserted into `branches` for that `repo_id` (duplicates skipped via `UNIQUE(repo_id, name)`).
3. Each branch triggers a PR lookup via `gh pr list --repo {owner}/{name} --head "{branch}" --state all --json number,url`.
4. If a PR exists, its full details are fetched via `gh pr view {number} --repo ... --json id,number,title,state,isDraft,reviewDecision,url,mergedAt,comments,reviews` and stored in `pull_requests`.

**Files:** `RepoPage.jsx`, `BranchesView.jsx`, `branchStore.js`

---

## 6. Feature: PR Status Enrichment

After fetching the raw PR, `enrichPr()` computes:

| Status | Condition | Badge |
|---|---|---|
| **Draft** | `pr.isDraft === true` | 🔵 Blue |
| **Ready** | No approvals, no pending comments | 🟡 Amber |
| **Approved** | At least 1 review with `state === 'APPROVED'` | 🟢 Green |
| **Comments** | Pending comments > 0, or any review with `state === 'CHANGES_REQUESTED'` | 🟣 Purple |
| **Merged** | `mergedAt` is set | ✅ Gray |
| **No PR** | No PR found for this branch | ⚪ Gray |

**`pending_comments_count`** is computed as:
```
pending_comments_count = (issue comments length)
                       + (reviews where state === 'CHANGES_REQUESTED').length
```

**Files:** `enrichPr()` in `main.js`, `BranchRow.jsx` (reads `pull_request` from the branch row)

---

## 7. Feature: Background Auto-Refresh

**How it works:**
1. When `RepoPage` mounts, it reads the `refresh_interval` setting from SQLite (default: `5` minutes).
2. If interval > 0: sets a `setInterval` that calls `refreshPRs(repoId)` at that cadence.
3. `refreshPRs` re-fetches all branches for the repo, looks up PRs for each via `gh pr view`, updates SQLite.
4. Shows an "Updated HH:MM" timestamp below the repo name.
5. Interval is cleared on unmount or repo switch.

**Configuring:** In Settings, the user can set `refresh_interval` (in minutes). Setting `0` disables auto-refresh (manual button only).

**The refresh runs in the Electron main process** (not the renderer). The renderer just triggers it via IPC and displays the result.

**Files:** `RepoPage.jsx` (interval logic), `SettingsView.jsx` (interval config), `branchStore.js` (`refreshPRs`)

---

## 8. Feature: PR Comments Viewer + Threaded Reply

### Fetching comments

`gh:prComments` handler fetches **two** endpoints:
- `GET /repos/{o}/{r}/pulls/{n}/comments` → **review comments** (inline code comments, tied to a file path + line)
- `GET /repos/{o}/{r}/issues/{n}/comments` → **general PR comments** (top-level, not tied to code)

Both are combined and sorted by `created_at` ASC.

Each comment carries:
```js
{ id, type: 'review'|'issue', author, body, path, line, createdAt, inReplyToId, updatedAt }
```

### Threaded display

In `BranchRow.jsx`, a `useMemo` builds thread groups from `inReplyToId`:
```js
const threads = useMemo(() => {
  const roots = [];
  const byParent = new Map();
  for (const c of comments) {
    if (c.inReplyToId) {
      byParent.get(c.inReplyToId).push(c);
    } else {
      roots.push(c);
    }
  }
  return roots.map((c) => ({ ...c, replies: byParent.get(c.id) || [] }));
}, [comments]);
```

Root comments render full-width; replies render nested with a purple left border.

### Posting replies

**Review thread reply** (to a specific review comment):
```
POST /repos/{o}/{r}/pulls/{n}/comments
Body: { body: "...", in_reply_to: <number> }
```
Uses `-F` (capital) for `in_reply_to` so `gh api` sends it as a JSON **number**, not a string. This is critical — the API returns HTTP 422 if `in_reply_to` is a string.

**General PR comment** (top-level):
```
POST /repos/{o}/{r}/issues/{n}/comments
Body: { body: "..." }
```
Uses lowercase `-f` (raw string), which is fine for body text.

**After posting:** comments are re-fetched to show the updated thread.

**Files:** `BranchRow.jsx` (UI), `main.js` (`gh:prComments` + `gh:prCommentReply` handlers), `preload.js` (exposes `gh.prComments`, `gh.prCommentReply`)

---

## 9. Feature: One-Click Copy

BranchRow shows action buttons for each branch with a PR:
- 🌿 Copy branch name
- # Copy PR number
- 🔗 Copy PR URL
- 🌐 Open PR in browser (`window.open`)
- ✕ Remove branch

All copy actions use `window.api.clipboard.write(text)` which calls Electron's `clipboard.writeText()`.

**Files:** `BranchRow.jsx`, `clipboard:write` handler in `main.js`

---

## 10. Feature: Sticky Notes Corkboard

**A dedicated notes section** in the sidebar (icon: 🗒️).

### Corkboard layout (`StickyNotesView.jsx`)

- Background: warm tan/cork color with subtle repeating gradient texture.
- Note cards: colored cards (cycling through yellow, green, pink, blue, orange via CSS `nth-child`), slightly rotated with a tape strip on top and drop shadow.
- Each card shows the first line as a bold title, followed by 2-3 lines of body preview.
- Cards are laid out in a flex-wrap grid (wraps on narrow screens).

### Note editor (modal)

- Clicking a card opens a full-screen modal overlay.
- Large textarea with `Consolas, 'Courier New', monospace` font (Notepad-style).
- Auto-saves on every keystroke with an 800ms debounce via `setTimeout`.
- Delete button in the header to remove the note.
- Close by clicking ✕ or clicking the overlay background.

### Data model

Notes are stored in `sticky_notes` with `target_type = 'note'` and `target_id = NULL`:
```
{ id, target_type: 'note', target_id: null, content: "...", updated_at }
```

### Notes store (`notesStore.js`)

```js
loadNotes()          → SELECT * FROM sticky_notes WHERE target_type='note' ORDER BY updated_at DESC
addNote()            → INSERT, returns lastInsertRowid
updateNote(id, text) → UPDATE content + updated_at
deleteNote(id)       → DELETE
```

**Files:** `StickyNotesView.jsx`, `notesStore.js`, `index.css` (corkboard + sticky card styles)

---

## 11. Feature: Saved PRs

Bookmark PRs that aren't tied to a tracked branch.

**Data:** `saved_prs` table (unique by `github_id`).

**Files:** `SavedPrsView.jsx`, `savedPrStore.js`

---

## 12. Feature: PR History

Merged PRs are automatically recorded in `pr_history` when they're detected as merged during a refresh cycle.

**Data:** `pr_history` table (unique by `github_id`), includes `branch_name` and `moved_to_history_at` timestamp.

**Files:** `HistoryView.jsx`, `historyStore.js`

---

## 13. Feature: Settings

`SettingsView.jsx` reads/writes the `settings` table:
- **Refresh interval** (minutes): controls the background auto-refresh cadence. `0` = disabled.
- **gh auth status**: shows the currently logged-in GitHub user via `gh auth status`.

**Files:** `SettingsView.jsx`

---

## 14. Portable Packaging

The app is built as a **single portable .exe** (no installer, no admin rights):

```bash
npm run electron:build
# → dist/BranchPad-Portable-{version}.exe
```

**electron-builder** is configured in `package.json`:
```json
"build": {
  "appId": "com.branchpad.app",
  "productName": "BranchPad",
  "win": { "target": "portable" },
  "directories": { "output": "dist" }
}
```

### Portable data directory

On first launch, the portable exe creates `Portable/Data/` **next to itself** for the SQLite database. The code detects portability via:

```js
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  || process.env.PORTABLE_EXECUTABLE_FILE;
if (portableDir) {
  const dataDir = path.join(portableDir, 'Portable', 'Data');
  fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}
return app.getPath('userData'); // fallback for dev/non-portable
```

---

## 15. Native Module: better-sqlite3

`better-sqlite3` is a native Node addon and **must** be compiled for the exact Node version Electron ships. The rebuild command:

```bash
npm run electron-rebuild
# runs: electron-rebuild -f -w better-sqlite3
```

If you see `NODE_MODULE_VERSION mismatch`, run this again after changing the Electron version.

---

## 16. Environment Requirements

| Requirement | Version | Why |
|---|---|---|
| Node.js | 18+ | Vite 5, ES module support |
| `gh` CLI | 2.x | All GitHub API calls go through `gh` |
| `gh auth login` | — | Must be authenticated before using the app |
| Python + C++ build tools | — | Required by `better-sqlite3` native compilation |

---

## 17. Development Workflow

```bash
npm install
npm run electron-rebuild   # rebuild native modules for Electron
npm run electron:dev       # Vite dev server + Electron with hot reload
```

Production build:
```bash
npm run electron:build     # Vite build + electron-builder portable .exe
```

---

## 18. Gotchas & Lessons Learned

### 1. `gh api -f` vs `-F`
`-f` always sends strings. Many GitHub API fields require numbers (e.g. `in_reply_to`, `position`, `commit_id`). Use `-F` for numeric/boolean fields.

### 2. Shell argument injection via `execSync` + `.join(' ')`
When `runGh()` concatenates an array into a shell string, any unquoted spaces in a value create separate tokens. Fix: double-quote the value in the command string. Reject `"` in `safeArg` so quoting is safe.

### 3. React effect dependency hijacking
If a `useEffect([repos])` fires on every store update and switches the view, the user gets yanked away mid-typing. Fix: use a `useRef(false)` guard that runs the auto-select only once on initial load.

### 4. `better-sqlite3` must be rebuilt for Electron's Node version
The system Node and Electron ship different `NODE_MODULE_VERSION` values. Always run `electron-rebuild` after `npm install` or an Electron version bump.

### 5. Electron preload errors are silent
If `contextBridge` fails to load, `window.api` is `undefined` in the renderer with no visible error. Check the main process console for `[BranchPad] Preload error:` messages. Always wrap `window.api` calls in try/catch in the renderer.

### 6. gh CLI auth is global
The app relies on `gh auth login` having been done at the system level. It cannot (and should not) manage tokens itself. The Settings screen shows auth status so users know if they're logged in.

---

## 19. File Map

```
BranchPad/
├── electron/
│   ├── main.js          — Main process: IPC handlers, gh CLI helpers, window creation
│   ├── preload.js       — contextBridge: exposes window.api to renderer
│   └── database.js      — SQLite schema + initialization
├── src/
│   ├── main.jsx         — React entry point (renders <App />)
│   ├── App.jsx          — Layout: sidebar + content area, view routing
│   ├── index.css        — Tailwind directives + custom classes (corkboard, sticky cards, etc.)
│   ├── components/
│   │   ├── layout/Sidebar.jsx          — Dark sidebar with repo list + nav items
│   │   ├── repo/RepoPage.jsx           — Repo view: add branches, auto-refresh, branch list
│   │   ├── branches/BranchRow.jsx       — PR status card + comments panel + reply
│   │   ├── branches/BranchesView.jsx    — Branch list container
│   │   ├── repos/ReposView.jsx          — Add repository form
│   │   ├── notes/StickyNotesView.jsx    — Corkboard layout for standalone notes
│   │   ├── shared/StickyNote.jsx        — Shared sticky note component (used by BranchRow if needed)
│   │   ├── prs/SavedPrsView.jsx         — Saved/bookmarked PRs list
│   │   ├── history/HistoryView.jsx      — Merged PRs history
│   │   └── settings/SettingsView.jsx    — Refresh interval, gh auth status
│   └── stores/
│       ├── repoStore.js     — Zustand: repo CRUD + loadRepos
│       ├── branchStore.js   — Zustand: branch + PR fetching, refreshPRs
│       ├── notesStore.js    — Zustand: standalone sticky notes CRUD
│       ├── savedPrStore.js  — Zustand: saved/bookmarked PRs
│       └── historyStore.js  — Zustand: PR history
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
└── README.md
```
