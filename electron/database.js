const path = require('path');
const Database = require('better-sqlite3');

let db;

function initDatabase(dataDir) {
  const dbPath = path.join(dataDir, 'branchpad.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS repositories (
      id INTEGER PRIMARY KEY,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(owner, name)
    );

    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY,
      repo_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
      UNIQUE(repo_id, name)
    );

    CREATE TABLE IF NOT EXISTS pull_requests (
      id INTEGER PRIMARY KEY,
      github_id INTEGER UNIQUE,
      branch_id INTEGER,
      number INTEGER,
      title TEXT,
      state TEXT,
      is_draft BOOLEAN,
      approvals_count INTEGER DEFAULT 0,
      pending_comments_count INTEGER DEFAULT 0,
      html_url TEXT,
      merged_at DATETIME,
      last_fetched DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_prs (
      id INTEGER PRIMARY KEY,
      github_id INTEGER UNIQUE,
      repo_owner TEXT,
      repo_name TEXT,
      number INTEGER,
      title TEXT,
      state TEXT,
      html_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sticky_notes (
      id INTEGER PRIMARY KEY,
      target_type TEXT,
      target_id INTEGER,
      content TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pr_history (
      id INTEGER PRIMARY KEY,
      github_id INTEGER UNIQUE,
      repo_owner TEXT,
      repo_name TEXT,
      branch_name TEXT,
      number INTEGER,
      title TEXT,
      html_url TEXT,
      merged_at DATETIME,
      moved_to_history_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  return db;
}

module.exports = { initDatabase, getDb: () => db };