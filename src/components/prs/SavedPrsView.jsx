import React, { useEffect, useState } from 'react';
import useSavedPrStore from '../../stores/savedPrStore';
import StickyNote from '../shared/StickyNote';

export default function SavedPrsView() {
  const { savedPrs, loadSavedPrs, addSavedPr, removeSavedPr } = useSavedPrStore();
  const [input, setInput] = useState('');
  const [showNoteId, setShowNoteId] = useState(null);

  useEffect(() => {
    loadSavedPrs();
  }, []);

  const handleAdd = async () => {
    const text = input.trim();
    if (!text) return;

    // Try to parse owner/repo/pull/number from URL or accept "owner/repo#number"
    let owner, name, number;
    const urlMatch = text.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    const shortMatch = text.match(/^([^/]+)\/([^/#]+)#(\d+)$/);
    const numOnly = text.match(/^(\d+)$/);

    if (urlMatch) {
      [, owner, name, number] = urlMatch;
    } else if (shortMatch) {
      [, owner, name, number] = shortMatch;
    } else if (numOnly) {
      number = numOnly[1];
      // Use last added repo as context
      const { data: repo } = await window.api.db.getAll('SELECT * FROM repositories ORDER BY id DESC LIMIT 1');
      if (repo) { owner = repo.owner; name = repo.name; }
      else { alert('Add a repo first, or paste a full PR URL.'); return; }
    } else {
      alert('Enter a PR URL, owner/repo#123, or just a number (requires at least one repo)');
      return;
    }

    await addSavedPr(owner, name, parseInt(number));
    setInput('');
  };

  const handleRefresh = async (pr) => {
    try {
      const detail = await window.api.gh.prView({ repo: `${pr.repo_owner}/${pr.repo_name}`, prNumber: pr.number });
      await window.api.db.run(
        `UPDATE saved_prs SET title = ?, state = ? WHERE id = ?`,
        [detail.title, detail.state, pr.id]
      );
      loadSavedPrs();
    } catch (e) {
      console.error('Failed to refresh PR:', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="PR URL, owner/repo#123, or just the PR number"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          + Save PR
        </button>
      </div>

      {savedPrs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📌</p>
          <p>No saved PRs yet. Bookmark one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedPrs.map((pr) => (
            <div key={pr.id} className="border border-gray-200 bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {pr.repo_owner}/{pr.repo_name}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">#{pr.number}</span>
                    <span className="text-xs text-gray-500 capitalize">{pr.state || 'open'}</span>
                  </div>
                  {pr.title && (
                    <p className="mt-1 text-sm text-gray-700 truncate">{pr.title}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    title="Refresh"
                    onClick={() => handleRefresh(pr)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 text-sm"
                  >
                    🔄
                  </button>
                  <button
                    title="Copy PR URL"
                    onClick={() => window.api.clipboard.write(pr.html_url)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 text-sm"
                  >
                    🔗
                  </button>
                  <button
                    title="Open in browser"
                    onClick={() => window.open(pr.html_url, '_blank')}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 text-sm"
                  >
                    🌐
                  </button>
                  <button
                    title="Sticky note"
                    onClick={() => setShowNoteId(showNoteId === pr.id ? null : pr.id)}
                    className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 text-sm"
                  >
                    📝
                  </button>
                  <button
                    title="Remove"
                    onClick={() => { if (confirm('Remove this saved PR?')) removeSavedPr(pr.id); }}
                    className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {showNoteId === pr.id && (
                <div className="mt-3 border-t pt-3">
                  <StickyNote targetType="saved_pr" targetId={pr.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}