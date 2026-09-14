import { create } from 'zustand';

const useSavedPrStore = create((set, get) => ({
  savedPrs: [],

  loadSavedPrs: async () => {
    const rows = await window.api.db.getAll(
      `SELECT * FROM saved_prs ORDER BY created_at DESC`
    );
    set({ savedPrs: rows });
  },

  addSavedPr: async (owner, name, number) => {
    try {
      const detail = await window.api.gh.prView({ repo: `${owner}/${name}`, prNumber: number });
      await window.api.db.run(
        `INSERT OR IGNORE INTO saved_prs (github_id, repo_owner, repo_name, number, title, state, html_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [detail.github_id || null, owner, name, number, detail.title, detail.state, detail.html_url]
      );
    } catch (e) {
      // Still save with minimal info if fetch fails
      await window.api.db.run(
        `INSERT OR IGNORE INTO saved_prs (github_id, repo_owner, repo_name, number, title, state, html_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [null, owner, name, number, '', 'open', `https://github.com/${owner}/${name}/pull/${number}`]
      );
      console.error('gh view failed, saved without details:', e.message);
    }
    await get().loadSavedPrs();
  },

  removeSavedPr: async (id) => {
    await window.api.db.run('DELETE FROM saved_prs WHERE id = ?', [id]);
    await get().loadSavedPrs();
  },
}));

export default useSavedPrStore;