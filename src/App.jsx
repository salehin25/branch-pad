import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import ReposView from './components/repos/ReposView';
import RepoPage from './components/repo/RepoPage';
import SavedPrsView from './components/prs/SavedPrsView';
import HistoryView from './components/history/HistoryView';
import SettingsView from './components/settings/SettingsView';
import StickyNotesView from './components/notes/StickyNotesView';
import useRepoStore from './stores/repoStore';

const VIEW_TITLES = {
  add: { icon: '📁', title: 'Add Repository' },
  notes: { icon: '🗒️', title: 'Sticky Notes' },
  saved: { icon: '📌', title: 'Saved PRs' },
  history: { icon: '📜', title: 'History' },
  settings: { icon: '⚙️', title: 'Settings' },
};

export default function App() {
  const { repos, loadRepos, removeRepo } = useRepoStore();
  const [view, setView] = useState({ key: 'add' });
  const initializedRef = useRef(false);

  useEffect(() => {
    loadRepos();
  }, []);

  // Auto-select the first repo ONLY on initial load.
  // Never hijack the user's current view after that.
  useEffect(() => {
    if (initializedRef.current) return;
    if (repos.length > 0) {
      initializedRef.current = true;
      setView({ key: `repo-${repos[0].id}` });
    }
  }, [repos]);

  const selectedRepo = view.key.startsWith('repo-')
    ? repos.find((r) => r.id === Number(view.key.replace('repo-', '')))
    : null;

  const renderView = () => {
    if (selectedRepo) return <RepoPage repo={selectedRepo} />;
    switch (view.key) {
      case 'add': return <ReposView />;
      case 'notes': return <StickyNotesView />;
      case 'saved': return <SavedPrsView />;
      case 'history': return <HistoryView />;
      case 'settings': return <SettingsView />;
      default:
        if (repos.length > 0) return <RepoPage repo={repos[0]} />;
        return <ReposView />;
    }
  };

  const meta = selectedRepo
    ? { icon: '🌿', title: `${selectedRepo.name}` }
    : (VIEW_TITLES[view.key] || { icon: '📁', title: '' });

  const handleRemoveRepo = async (repoId) => {
    await removeRepo(repoId);
    if (repos.length <= 1) setView({ key: 'add' });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        repos={repos}
        activeKey={selectedRepo ? `repo-${selectedRepo.id}` : view.key}
        onSelect={(key) => setView(key.startsWith('repo-') ? { key } : { key })}
        onRemoveRepo={handleRemoveRepo}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-none">{meta.title}</h1>
            {selectedRepo && (
              <p className="text-sm text-gray-400 mt-1">
                {selectedRepo.owner}/{selectedRepo.name}
              </p>
            )}
          </div>
        </div>
        {renderView()}
      </main>
    </div>
  );
}
