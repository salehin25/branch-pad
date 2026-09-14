import { create } from 'zustand';

const useRepoStore = create((set) => ({
  repos: [],

  loadRepos: async () => {
    const repos = await window.api.db.getAll('SELECT * FROM repositories ORDER BY created_at DESC');
    set({ repos });
  },

  addRepo: async (owner, name, url) => {
    await window.api.db.run(
      'INSERT OR IGNORE INTO repositories (owner, name, url) VALUES (?, ?, ?)',
      [owner, name, url]
    );
    const repos = await window.api.db.getAll('SELECT * FROM repositories ORDER BY created_at DESC');
    set({ repos });
  },

  removeRepo: async (id) => {
    await window.api.db.run('DELETE FROM repositories WHERE id = ?', [id]);
    const repos = await window.api.db.getAll('SELECT * FROM repositories ORDER BY created_at DESC');
    set({ repos });
  },
}));

export default useRepoStore;