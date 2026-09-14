import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootEl = document.getElementById('root');

// If the preload bridge failed to attach, show a clear panel instead of
// dozens of "Cannot read properties of undefined" errors.
if (!window.api) {
  rootEl.innerHTML = `
    <div style="font-family:system-ui,sans-serif;padding:2.5rem;background:#fef2f2;color:#991b1b;min-height:100vh">
      <h1 style="margin:0 0 0.5rem;font-size:1.25rem">⚠️ Window API bridge missing</h1>
      <p>Electron's preload script did not load. Fixes to try:</p>
      <ol style="line-height:1.8">
        <li>Exit and run <code>npm run electron:dev</code> again</li>
        <li>Look at the terminal for a <b>Preload script error</b> and paste it back</li>
      </ol>
    </div>`;
} else {
  window.api.ping().catch(() => {});
  createRoot(rootEl).render(<App />);
}