import { create } from 'zustand';

const useHistoryStore = create((set, get) => ({
  history: [],

  loadHistory: async () => {
    const rows = await window.api.db.getAll(
      `SELECT h.*, b.name AS branch_name, r.owner, r.name AS repo_name
       FROM pr_history h
       LEFT JOIN branches b ON b.id = h.branch_id
       LEFT JOIN repositories r ON r.id = h.repo_id
       ORDER BY h.merged_at DESC`
    );
    set({ history: rows });
  },

  clearHistory: async () => {
    await window.api.db.run('DELETE FROM pr_history');
    await get().loadHistory();
  },

  removeHistory: async (id) => {
    await window.api.db.run('DELETE FROM pr_history WHERE id = ?', [id]);
    await get().loadHistory();
  },
}));

export default useHistoryStore;