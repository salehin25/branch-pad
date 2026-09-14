import React, { useEffect, useState, useCallback, useRef } from 'react';
import useNotesStore from '../../stores/notesStore';

const ROTATIONS = [-1.5, 1, -0.8, 1.5, -1, 0.6];

export default function StickyNotesView() {
  const { notes, loading, loadNotes, addNote, updateNote, deleteNote } = useNotesStore();
  const [editingId, setEditingId] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const editorRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const handleNewNote = async () => {
    const id = await addNote();
    if (id) {
      setEditingId(id);
      setEditorContent('');
    }
  };

  const handleOpenNote = (note) => {
    setEditingId(note.id);
    setEditorContent(note.content || '');
  };

  const handleCloseEditor = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Final save on close
    if (editingId && editorContent !== undefined) {
      updateNote(editingId, editorContent);
    }
    setEditingId(null);
    setEditorContent('');
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setEditorContent(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (editingId) updateNote(editingId, val);
    }, 800);
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (confirm('Delete this note?')) {
      await deleteNote(editingId);
      setEditingId(null);
      setEditorContent('');
    }
  };

  const getPreview = (content) => {
    if (!content) return { title: 'Empty note', body: '' };
    const lines = content.split('\n');
    const title = lines[0] || 'Empty note';
    const body = lines.slice(1).join('\n').trim();
    return { title, body };
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const editingNote = notes.find((n) => n.id === editingId);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleNewNote}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm"
        >
          + New Note
        </button>
        <span className="text-sm text-gray-400">{notes.length} note{notes.length === 1 ? '' : 's'}</span>
      </div>

      {/* Corkboard */}
      {notes.length === 0 && !loading ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">🗒️</p>
          <p>No notes yet. Click "+ New Note" to create one!</p>
        </div>
      ) : (
        <div className="corkboard">
          <div className="flex flex-wrap gap-6 p-2">
            {notes.map((note, i) => {
              const { title, body } = getPreview(note.content);
              const rot = ROTATIONS[i % ROTATIONS.length];
              return (
                <div
                  key={note.id}
                  className="sticky-card"
                  style={{ transform: `rotate(${rot}deg)` }}
                  onClick={() => handleOpenNote(note)}
                >
                  <div className="tape" />
                  <div className="sticky-card-title">{title}</div>
                  {body && <div className="sticky-card-body">{body}</div>}
                  <div className="sticky-card-time">{formatTime(note.updated_at)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor modal */}
      {editingNote && (
        <div className="modal-overlay" onClick={handleCloseEditor}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Edit Note</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-xs font-medium"
                >
                  🗑 Delete
                </button>
                <button
                  onClick={handleCloseEditor}
                  className="px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded text-xs font-medium"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="note-editor">
              <textarea
                ref={editorRef}
                value={editorContent}
                onChange={handleContentChange}
                placeholder="Start typing your note..."
                autoFocus
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-right">Auto-saves as you type</p>
          </div>
        </div>
      )}
    </div>
  );
}
