import React, { useEffect, useState } from 'react';
import useRepoStore from '../../stores/repoStore';
import useBranchStore from '../../stores/branchStore';
import BranchRow from './BranchRow';

export default function BranchesView() {
  const { repos, loadRepos } = useRepoStore();
  const { branches, loadBranches, addBranches, removeBranch, refreshPRs } = useBranchStore();
  const [selectedRepo, setSelectedRepo] = useState('');
  const [newBranches, setNewBranches] = useState('');

  useEffect(() => {
    loadRepos();
  }, []);

  useEffect(() => {
    if (selectedRepo) loadBranches(selectedRepo);
  }, [selectedRepo]);

  useEffect(() => {
    if (repos.length > 0 && !selectedRepo) {
      setSelectedRepo(String(repos[0].id));
    }
  }, [repos]);

  const handleAdd = async () => {
    if (!newBranches.trim() || !selectedRepo) return;
    const names = newBranches
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    await addBranches(selectedRepo, names);
    setNewBranches('');
    refreshPRs(selectedRepo);
  };

  const handleRefresh = () => {
    if (selectedRepo) refreshPRs(selectedRepo);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {repos.length === 0 && <option value="">— add a repo first —</option>}
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.owner}/{r.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleRefresh}
          disabled={!selectedRepo}
          className="px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-40"
        >
          🔄 Refresh PRs
        </button>
      </div>

      <div className="flex gap-3">
        <textarea
          value={newBranches}
          onChange={(e) => setNewBranches(e.target.value)}
          placeholder="Paste branch names (one per line)&#10;feature/xyz&#10;fix/bug-123"
          rows={4}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={handleAdd}
            disabled={!selectedRepo}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-40"
          >
            + Add Branches
          </button>
        </div>
      </div>

      {branches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🌿</p>
          <p>No branches tracked yet. Paste branch names above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <BranchRow key={b.id} branch={b} onRemove={() => removeBranch(b.id)} />
          ))}
        </div>
      )}
    </div>
  );
}