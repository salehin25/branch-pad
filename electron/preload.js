const { contextBridge, ipcRenderer } = require('electron');

// Expose a clean, minimal API surface to the renderer.
contextBridge.exposeInMainWorld('api', {
  // Database operations (SQLite via better-sqlite3 in the main process)
  db: {
    getAll: (query, params) => ipcRenderer.invoke('db:getAll', query, params),
    getOne: (query, params) => ipcRenderer.invoke('db:getOne', query, params),
    run: (query, params) => ipcRenderer.invoke('db:run', query, params),
  },

  // GitHub CLI operations (gh in the main process)
  gh: {
    prList: (opts) => ipcRenderer.invoke('gh:prList', opts),
    prView: (opts) => ipcRenderer.invoke('gh:prView', opts),
    checkAuth: () => ipcRenderer.invoke('gh:checkAuth'),
    prComments: (opts) => ipcRenderer.invoke('gh:prComments', opts),
    prCommentReply: (opts) => ipcRenderer.invoke('gh:prCommentReply', opts),
  },

  // Clipboard
  clipboard: {
    write: (text) => ipcRenderer.invoke('clipboard:write', text),
  },

  // Bridge sanity check (used by App on boot)
  ping: () => ipcRenderer.invoke('app:ping'),
});
