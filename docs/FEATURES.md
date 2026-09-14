# BranchPad — Feature Overview

> A plain-English business description of what BranchPad is, what it does, and every feature it offers.

---

## 1. What is BranchPad?

BranchPad is a lightweight desktop application that helps developers keep track of all the branches they are working on and the pull requests (PRs) associated with each branch.

Instead of opening GitHub in the browser, switching between repositories, and checking each branch one by one, a developer can open BranchPad and see the status of all their PRs at a glance — from multiple repositories, in a single window.

It is designed to feel familiar to anyone who has used Notepad++ or similar lightweight editors: fast to open, simple to use, and no clutter.

---

## 2. Who is it for?

BranchPad is built for software developers who:

- Work on multiple branches across one or more GitHub repositories
- Frequently check whether their PRs have been approved, have comments, or are still in draft
- Prefer a lightweight desktop tool over juggling many browser tabs
- Want to review and reply to PR comments without leaving their desk workflow

---

## 3. What does it do?

At a high level, BranchPad:

1. Lets you save the GitHub repositories you care about
2. Lets you list the branches you are actively working on in each repository
3. Automatically finds the PR for each branch and shows its current status
4. Refreshes that status automatically in the background
5. Lets you view PR comments and reply to them directly from the app
6. Copies branch names, PR numbers, and links with one click
7. Keeps your own notes, bookmarks, and history safely stored on your computer

---

## 4. Features

### 4.1 Manage Multiple Repositories

- Add any GitHub repository to the app by pasting its GitHub URL
- Your saved repositories appear in a sidebar for quick switching
- Remove a repository at any time — its branches and PR data are cleaned up automatically
- All repository data is saved locally, so your list persists the next time you open the app

### 4.2 Track Branches

- For each repository, add the names of the branches you want to follow (one per line)
- BranchPad looks up whether each branch has a pull request on GitHub
- Branches without a PR are shown as-is; branches with a PR get the full PR details attached
- Duplicate branches are ignored, so you can re-add freely

### 4.3 PR Status at a Glance

Every tracked branch with a PR shows a color-coded status so you can scan your work quickly:

| Status | Meaning |
|---|---|
| 🔵 Draft | The PR is still a draft |
| 🟡 Ready | The PR is open and waiting for review |
| 🟢 Approved | At least one reviewer has approved the PR |
| 🟣 Needs Attention | There are pending comments or requested changes |
| ✅ Merged | The PR has been merged |
| ⚪ No PR | No pull request exists for this branch |

The app also shows how many approvals and how many pending comments each PR has, so you can judge where each PR stands without opening it.

### 4.4 Background Auto-Refresh

- PR statuses update automatically in the background — no need to click refresh
- You control the refresh interval (default: every 5 minutes)
- Set the interval to 0 to disable auto-refresh and refresh manually
- A timestamp next to the repository name shows when the data was last updated

### 4.5 PR Comments & Threaded Replies

- Open a comments panel on any PR to see all discussion in one place
- Shows both code review comments and general PR comments, in chronological order
- Replies are grouped into threads, so you can follow the conversation
- Reply to any comment directly from the app — no need to open GitHub
- Add a new general comment at any time

### 4.6 One-Click Copy

For every tracked branch with a PR, one click gives you:

- 🌿 Copy the branch name
- # Copy the PR number
- 🔗 Copy the PR URL
- 🌐 Open the PR in your browser

### 4.7 Sticky Notes Corkboard

- A dedicated Notes section with a warm corkboard-style layout
- Create as many notes as you like — each looks like a colorful sticky note on the board
- Notes open in a notepad-style editor with an easy-to-read monospace font
- Notes save automatically as you type — you never lose your work
- Delete notes whenever you are done with them

### 4.8 Saved PRs (Bookmarks)

- Bookmark any PR for quick access later, even if it is not tied to one of your tracked branches
- Your saved PRs are listed in their own section of the app

### 4.9 PR History

- PRs that get merged are automatically recorded in a history list
- Each entry remembers the repository, branch name, PR number, title, and when it was merged
- This gives you a record of your shipped work over time

### 4.10 Settings

- **Refresh interval**: control how often PR statuses auto-refresh
- **GitHub account**: see whether you are logged in to GitHub and, if so, as whom

### 4.11 Portable & Install-Free

- BranchPad is delivered as a single portable executable file
- No installation, no admin rights, no setup wizard — double-click and run
- Works from a USB drive or any folder you like
- All your data (repos, branches, notes, bookmarks, history) is stored in a folder right next to the executable, so it travels with you

---

## 5. Key Benefits

- **No browser juggling** — all your PRs from all your repos in one lightweight window
- **No logins or tokens to manage** — BranchPad uses the GitHub CLI already installed on your machine
- **Offline-friendly** — everything is stored locally on your computer; there is no cloud dependency
- **Private by design** — your data never leaves your machine; no telemetry, no tracking
- **Fast to use** — one-click copies, automatic refreshes, and threaded replies keep you focused

---

## 6. Notes on Data & Privacy

- BranchPad stores all data locally on your computer (repositories, branches, PR snapshots, notes, bookmarks, history)
- The only time it contacts the internet is to ask GitHub for PR information (through your GitHub CLI login)
- Deleting a repository, branch, or note permanently removes it from your local data