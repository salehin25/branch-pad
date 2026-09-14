# 🌿 BranchPad

A lightweight desktop app for developers to track GitHub **branches** and their **pull requests** in one place. No server, no accounts — it talks to GitHub through the `gh` CLI you already use, and saves everything to a local SQLite database.

Built with Electron, React, Vite, Tailwind, Zustand and better-sqlite3.

## Features

- **Multiple repos** — add as many GitHub repos as you like by URL.
- **Track branches** — paste branch names (one per line); BranchPad discovers the PR for each.
- **PR status at a glance** — Draft 🔵, Ready 🟡, Approved 🟢, Pending comments 🟣, Merged ✅.
- **Auto-refresh in the background** — PR statuses refresh automatically (default every 5 minutes, configurable in Settings; `0` disables).
- **One-click copy** — branch name, PR number, PR URL.
- **PR comments** — open a thread for any PR, read review + general comments, and **reply right from the app** (replies post to GitHub via `gh`).
- **Saved PRs** — bookmark PRs that aren't tied to a tracked branch.
- **History** — merged PRs recorded automatically.
- **Sticky notes** — a corkboard-style notes section (Notepad-style font, click to open the full note).
- **Everything autosaves** locally to SQLite.

## Requirements

- **Node.js 18+** (only needed for development / building)
- **GitHub CLI (`gh`)** — must be installed and authenticated

### Authenticating `gh`

```bash
gh auth login
# choose HTTPS, then authenticate with your token or browser
```

## Development

```bash
npm install
npm run electron-rebuild   # rebuild better-sqlite3 for Electron's Node version
npm run electron:dev       # starts Vite + Electron with hot reload
```

> **Important:** `better-sqlite3` is a native module and must be compiled for the exact Node version Electron ships with. If you get a `NODE_MODULE_VERSION` mismatch, run `npm run electron-rebuild` again.

## Packaging (portable .exe, no install needed)

```bash
npm run electron:build
```

Output: `dist/BranchPad-Portable-<version>.exe` — a single self-extracting exe.

- **No installer, no admin rights** — just run the exe.
- On first launch it creates a `Portable\Data` folder **next to the exe** for its SQLite database.
- `gh` must already be installed and logged in on the target machine.

## Project layout

```
electron/
  main.js        – Main process: IPC handlers, gh CLI calls, window
  preload.js     – Secure contextBridge API (window.api)
  database.js    – SQLite schema + init
src/
  App.jsx        – Layout + view routing (repos, notes, saved, history, settings)
  components/
    repo/        – RepoPage (add branches, auto-refresh, branch list)
    branches/    – BranchRow (PR status, comments panel, reply)
    notes/       – StickyNotesView (corkboard)
    prs/         – SavedPrsView
    history/     – HistoryView
    settings/    – SettingsView (refresh interval, gh auth status)
    layout/      – Sidebar
  stores/        – Zustand stores (repos, branches, notes)
```

## How reporting to GitHub works

Reads and comment replies go through the `gh` CLI in the main process using your existing authentication — a reply you send from BranchPad appears on GitHub exactly as if you'd posted it there.

## Troubleshooting

- **"Window API bridge missing"** — the preload script didn't attach. Exit and run `npm run electron:dev` again; check the terminal for a *Preload script error*.
- **No PR status** — `gh` isn't authenticated or the branch has no open PR. Run `gh auth status`.
- **NODE_MODULE_VERSION mismatch** — run `npm run electron-rebuild`.