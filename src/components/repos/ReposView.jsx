import React, { useEffect, useState } from 'react';
import useRepoStore from '../../stores/repoStore';

export default function ReposView() {
  const { repos, loadRepos, addRepo, removeRepo } = useRepoStore();
  const [url, setUrl] = useState('');

  useEffect(() => {
    loadRepos();
  }, []);

  const handleAdd = async () => {
    if (!url.trim()) return;
    const match = url.trim().match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      alert('Please enter a valid GitHub URL: https://github.com/owner/repo');
      return;
    }
    await addRepo(match[1], match[2], url.trim());
    setUrl('');
  };

  const handleRemove = async (id) => {
    if (confirm('Remove this repository and all its branches?')) {
      await removeRepo(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Add Repo
        </button>
      </div>

      {repos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📁</p>
          <p>No repos tracked yet. Add one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {repo.owner}/{repo.name}
                </p>
                <p className="text-sm text-gray-500">{repo.url}</p>
              </div>
              <button
                onClick={() => handleRemove(repo.id)}
                className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}