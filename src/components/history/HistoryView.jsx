import React, { useEffect, useState } from 'react';
import useHistoryStore from '../../stores/historyStore';

export default function HistoryView() {
  const { history, loadHistory, clearHistory, removeHistory } = useHistoryStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | per-repo later

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = history.filter((row) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (row.title || '').toLowerCase().includes(q) ||
      (row.branch_name || '').toLowerCase().includes(q) ||
      String(row.number).includes(q) ||
      (row.owner && row.repo_name && `${row.owner}/${row.repo_name}`.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PR title, branch, repo, or number..."
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
        <button
          onClick={() => { if (confirm('Clear entire history?')) clearHistory(); }}
          className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium text-sm"
        >
          🗑 Clear
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📜</p>
          <p>{search ? 'No matching records.' : 'Merged PRs will appear here over time.'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white text-left text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5">PR</th>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Branch</th>
                <th className="px-4 py-2.5">Repo</th>
                <th className="px-4 py-2.5">Merged</th>
                <th className="px-2 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <button
                      title="Copy PR URL"
                      onClick={() => window.api.clipboard.write(row.html_url)}
                      className="font-mono font-semibold text-blue-600 hover:underline"
                    >
                      #{row.number}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate">{row.title}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600 truncate max-w-[160px]">
                    {row.branch_name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                    {row.owner}/{row.repo_name}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {row.merged_at ? new Date(row.merged_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      title="Remove from history"
                      onClick={() => removeHistory(row.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > 0 && (
        <p className="text-xs text-gray-400">{filtered.length} record{filtered.length === 1 ? '' : 's'}</p>
      )}
    </div>
  );
}