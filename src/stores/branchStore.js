import { create } from 'zustand';

const useBranchStore = create((set, get) => ({
  branches: [],
  loading: false,

  loadBranches: async (repoId) => {
    const rows = await window.api.db.getAll(
      `SELECT b.*,
              pr.id AS pr_id, pr.github_id, pr.number, pr.title, pr.state,
              pr.is_draft, pr.approvals_count, pr.pending_comments_count,
              pr.html_url, pr.merged_at
       FROM branches b
       LEFT JOIN pull_requests pr ON pr.branch_id = b.id
       WHERE b.repo_id = ?
       ORDER BY b.name COLLATE NOCASE ASC`,
      [repoId]
    );
    const branches = rows.map((r) => ({
      id: r.id,
      repo_id: r.repo_id,
      name: r.name,
      created_at: r.created_at,
      pull_request: r.pr_id
        ? {
            id: r.pr_id,
            github_id: r.github_id,
            number: r.number,
            title: r.title,
            state: r.state,
            is_draft: r.is_draft,
            approvals_count: r.approvals_count,
            pending_comments_count: r.pending_comments_count,
            html_url: r.html_url,
            merged_at: r.merged_at,
          }
        : null,
    }));
    set({ branches });
  },

  addBranches: async (repoId, names) => {
    for (const name of names) {
      await window.api.db.run(
        'INSERT OR IGNORE INTO branches (repo_id, name) VALUES (?, ?)',
        [repoId, name]
      );
    }
    get().loadBranches(repoId);
  },

  removeBranch: async (id) => {
    const { branches } = get();
    const branch = branches.find((b) => b.id === id);
    await window.api.db.run('DELETE FROM branches WHERE id = ?', [id]);
    if (branch) get().loadBranches(branch.repo_id);
  },

  refreshPRs: async (repoId) => {
    set({ loading: true });
    try {
      const rows = await window.api.db.getAll(
        'SELECT b.id, b.name, r.owner, r.name AS repo_name FROM branches b JOIN repositories r ON r.id = b.repo_id WHERE b.repo_id = ?',
        [repoId]
      );
      for (const row of rows) {
        try {
          const repo = `${row.owner}/${row.repo_name}`;
          const prs = await window.api.gh.prList({ repo, branch: row.name });
          if (prs && prs.length > 0) {
            const pr = prs[0];
            // Extract PR number from list result (fields: number, url)
            const prNumber = pr.number;
            // Get full PR details
            const detail = await window.api.gh.prView({ repo, prNumber });
            if (!detail || !detail.number) {
              console.warn(`No detail for PR #${prNumber} (${row.name})`);
              continue;
            }
            await window.api.db.run(
              `INSERT INTO pull_requests (github_id, branch_id, number, title, state, is_draft, approvals_count, pending_comments_count, html_url, merged_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(github_id) DO UPDATE SET
                 title = excluded.title, state = excluded.state, is_draft = excluded.is_draft,
                 approvals_count = excluded.approvals_count, pending_comments_count = excluded.pending_comments_count,
                 html_url = excluded.html_url, merged_at = excluded.merged_at`,
              [
                detail.github_id, row.id, detail.number, detail.title, detail.state,
                detail.is_draft ? 1 : 0, detail.approvals_count || 0,
                detail.pending_comments_count || 0, detail.html_url,
                detail.merged_at || null
              ]
            );
          } else {
            // No PR for this branch — clear any stale entry
            await window.api.db.run('DELETE FROM pull_requests WHERE branch_id = ?', [row.id]);
          }
        } catch (e) {
          console.error(`Failed to fetch PR for branch ${row.name}:`, e.message);
        }
      }
      await get().loadBranches(repoId);
    } finally {
      set({ loading: false });
    }
  },
}));

export default useBranchStore;