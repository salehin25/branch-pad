import React, { useEffect, useState, useRef } from 'react';

export default function StickyNote({ targetType, targetId }) {
  const [content, setContent] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    load();
  }, [targetType, targetId]);

  const load = async () => {
    const rows = await window.api.db.getAll(
      `SELECT * FROM sticky_notes WHERE target_type = ? AND target_id = ?`,
      [targetType, targetId]
    );
    if (rows.length > 0) setContent(rows[0].content || '');
  };

  const scheduleSave = (val) => {
    setContent(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const existing = await window.api.db.getAll(
        `SELECT id FROM sticky_notes WHERE target_type = ? AND target_id = ?`,
        [targetType, targetId]
      );
      if (existing.length > 0) {
        await window.api.db.run(
          `UPDATE sticky_notes SET content = ?, updated_at = datetime('now') WHERE id = ?`,
          [val, existing[0].id]
        );
      } else {
        await window.api.db.run(
          `INSERT INTO sticky_notes (target_type, target_id, content) VALUES (?, ?, ?)`,
          [targetType, targetId, val]
        );
      }
    }, 800);
  };

  return (
    <textarea
      value={content}
      onChange={(e) => scheduleSave(e.target.value)}
      placeholder="Sticky note (autosaves)..."
      rows={3}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-yellow-50/60 resize-y focus:ring-2 focus:ring-yellow-300 outline-none"
    />
  );
}