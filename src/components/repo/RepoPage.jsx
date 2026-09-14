import React, { useEffect, useState, useRef, useCallback } from 'react';
import useRepoStore from '../../stores/repoStore';
import useBranchStore from '../../stores/branchStore';
import BranchRow from '../branches/BranchRow';

export default function RepoPage({ repo }) {
  const { removeRepo } = useRepoStore();
  const { branches, loading, loadBranches, addBranches, removeBranch, refreshPRs } = useBranchStore();
  const [newBranches, setNewBranches] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  // Load branches + immediate refresh + start auto-refresh interval
  useEffect(() => {
    if (!repo) return;

    loadBranches(repo.id);

    // Immediate refresh on mount
    refreshPRs(repo.id).then(() => setLastUpdated(new Date()));

    // Set up auto-refresh interval
    const setupInterval = async () => {
      try {
        const row = await window.api.db.getOne(
          "SELECT value FROM settings WHERE key = 'refresh_interval'"
        );
        const minutes = parseInt(row?.value || '5', 10);
        if (minutes > 0) {
          intervalRef.current = setInterval(() => {
            refreshPRs(repo.id).then(() => setLastUpdated(new Date()));
          }, minutes * 60 * 1000);
        }
      } catch {
        // Default 5 minutes if setting not found
        intervalRef.current = setInterval(() => {
          refreshPRs(repo.id).then(() => setLastUpdated(new Date()));
        }, 5 * 60 * 1000);
      }
    };

    setupInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [repo?.id]);

  const handleAdd = async () => {
    if (!newBranches.trim() || !repo) return;
    const names = newBranches
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    await addBranches(repo.id, names);
    setNewBranches('');
    refreshPRs(repo.id).then(() => setLastUpdated(new Date()));
  };

  const handleRefresh = () => {
    if (repo) refreshPRs(repo.id).then(() => setLastUpdated(new Date()));
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-5">
      {/* Repo header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{repo.name}</h2>
          <p className="text-sm text-gray-500">
            {repo.owner} · {branches.length} branch{branches.length === 1 ? '' : 'es'}
            {lastUpdated && (
              <span className="ml-2 text-gray-400">· Updated {formatTime(lastUpdated)}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50"
          >
            {loading ? '⏳ Refreshing…' : '🔄 Refresh PRs'}
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove ${repo.name}?`)) removeRepo(repo.id);
            }}
            className="px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium"
          >
            Remove repo
          </button>
        </div>
      </div>

      {/* Add branches */}
      <div className="flex gap-3">
        <textarea
          value={newBranches}
          onChange={(e) => setNewBranches(e.target.value)}
          placeholder={'Paste branch names (one per line)\nfeature/xyz\nfix/bug-123'}
          rows={3}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
        />
        <button
          onClick={handleAdd}
          disabled={!newBranches.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-40 self-start"
        >
          + Add Branches
        </button>
      </div>

      {/* Branch + PR list */}
      {branches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🌿</p>
          <p>No branches tracked in {repo.name} yet. Paste some above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <BranchRow
              key={b.id}
              branch={b}
              repo={{ id: repo.id, owner: repo.owner, name: repo.name }}
              onRemove={() => removeBranch(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
