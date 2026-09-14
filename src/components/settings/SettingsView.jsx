import React, { useEffect, useState } from 'react';

export default function SettingsView() {
  const [settings, setSettings] = useState({ refresh_interval: '5' });
  const [ghStatus, setGhStatus] = useState({ checked: false, ok: null, user: null });

  useEffect(() => {
    loadSettings();
    checkGh();
  }, []);

  const loadSettings = async () => {
    const rows = await window.api.db.getAll('SELECT * FROM settings');
    const map = {};
    rows.forEach((r) => (map[r.key] = r.value));
    setSettings({ refresh_interval: map.refresh_interval || '5', ...map });
  };

  const saveSetting = async (key, value) => {
    await window.api.db.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const checkGh = async () => {
    try {
      const res = await window.api.gh.checkAuth();
      setGhStatus({ checked: true, ok: res.ok, user: res.user, message: res.message });
    } catch (e) {
      setGhStatus({ checked: true, ok: false, message: e.message });
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* GitHub CLI status */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">GitHub CLI (gh)</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!ghStatus.checked ? (
              <span className="text-gray-400">Checking…</span>
            ) : ghStatus.ok ? (
              <>
                <span className="text-green-500 font-bold">●</span>
                <span className="text-sm text-gray-700">
                  Authenticated as <b>{ghStatus.user}</b>
                </span>
              </>
            ) : (
              <>
                <span className="text-red-500 font-bold">●</span>
                <span className="text-sm text-red-600">
                  {ghStatus.message || 'Not authenticated. Run `gh auth login` in a terminal.'}
                </span>
              </>
            )}
          </div>
          <button
            onClick={checkGh}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-sm"
          >
            Re-check
          </button>
        </div>
      </section>

      {/* Refresh interval */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Auto-refresh</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Refresh interval (minutes):</label>
            <input
              type="number"
              min="1"
              value={settings.refresh_interval}
              onChange={(e) => saveSetting('refresh_interval', e.target.value)}
              className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <p className="text-xs text-gray-400">
            BranchPad will re-fetch all PR statuses on this interval while the app is open.
            Set to 0 to disable auto-refresh.
          </p>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Data</h3>
        <div className="bg-white border border-red-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Erase all repositories, branches, and PR history.
          </p>
          <button
            onClick={async () => {
              if (confirm('This wipes ALL BranchPad data. Continue?')) {
                await window.api.db.run('DELETE FROM pr_history');
                await window.api.db.run('DELETE FROM pull_requests');
                await window.api.db.run('DELETE FROM sticky_notes');
                await window.api.db.run('DELETE FROM branches');
                await window.api.db.run('DELETE FROM repositories');
                alert('All data cleared.');
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
          >
            Wipe all data
          </button>
        </div>
      </section>

      {/* About */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">About</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-sm text-gray-600 space-y-1">
          <p>BranchPad v1.0.0 — lightweight PR tracker for developers.</p>
          <p className="text-xs text-gray-400">
            Data is stored in a local SQLite file beside the app (portable mode).
          </p>
        </div>
      </section>
    </div>
  );
}