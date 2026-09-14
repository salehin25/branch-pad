import React from 'react';

export default function Sidebar({ repos, activeKey, onSelect, onRemoveRepo }) {
  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-wide">🌿 BranchPad</h2>
          <p className="text-xs text-gray-400 mt-0.5">PR Tracker</p>
        </div>
        <button
          title="Add repository"
          onClick={() => onSelect('add')}
          className={`w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center transition-colors
            ${activeKey === 'add' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-blue-600 hover:text-white'}`}
        >
          +
        </button>
      </div>

      {/* Repo names */}
      <div className="flex-1 overflow-y-auto py-2">
        <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
          Repos · {repos.length}
        </p>
        {repos.length === 0 ? (
          <p className="px-4 py-2 text-xs text-gray-500 italic">
            No repos yet. Click + to add one.
          </p>
        ) : (
          repos.map((repo) => (
            <div
              key={repo.id}
              className={`group flex items-center gap-2 px-2 mx-1 rounded-lg transition-colors cursor-pointer
                ${activeKey === `repo-${repo.id}`
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-200 hover:bg-gray-800'}`}
              onClick={() => onSelect(`repo-${repo.id}`)}
            >
              <span className="text-sm">🌿</span>
              <span className="flex-1 min-w-0 py-2">
                <span className="block text-sm font-medium truncate">{repo.name}</span>
                <span className={`block text-[11px] truncate leading-none mt-0.5
                  ${activeKey === `repo-${repo.id}` ? 'text-blue-200' : 'text-gray-500'}`}>
                  {repo.owner}
                </span>
              </span>
              <button
                title="Remove repo"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove ${repo.name} and all its branches?`)) onRemoveRepo(repo.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-500 px-1 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <nav className="border-t border-gray-700 py-2">
        {[
          { key: 'notes', label: 'Notes', icon: '🗒️' },
          { key: 'saved', label: 'Saved PRs', icon: '📌' },
          { key: 'history', label: 'History', icon: '📜' },
          { key: 'settings', label: 'Settings', icon: '⚙️' },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors
              ${activeKey === key ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
