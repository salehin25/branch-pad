import { create } from 'zustand';

const useNotesStore = create((set, get) => ({
  notes: [],
  loading: false,

  loadNotes: async () => {
    set({ loading: true });
    try {
      const rows = await window.api.db.getAll(
        "SELECT * FROM sticky_notes WHERE target_type = 'note' ORDER BY updated_at DESC"
      );
      set({ notes: rows || [] });
    } catch (e) {
      console.error('Failed to load notes:', e);
    } finally {
      set({ loading: false });
    }
  },

  addNote: async () => {
    try {
      const result = await window.api.db.run(
        "INSERT INTO sticky_notes (target_type, target_id, content) VALUES ('note', NULL, '')"
      );
      // SQLite returns { lastInsertRowid }
      const newId = result?.lastInsertRowid || result?.lastID || null;
      await get().loadNotes();
      return newId;
    } catch (e) {
      console.error('Failed to add note:', e);
      return null;
    }
  },

  updateNote: async (id, content) => {
    try {
      await window.api.db.run(
        'UPDATE sticky_notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [content, id]
      );
      // Update locally without full reload for speed
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === id ? { ...n, content, updated_at: new Date().toISOString() } : n
        ),
      }));
    } catch (e) {
      console.error('Failed to update note:', e);
    }
  },

  deleteNote: async (id) => {
    try {
      await window.api.db.run('DELETE FROM sticky_notes WHERE id = ?', [id]);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  },
}));

export default useNotesStore;
