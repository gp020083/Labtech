import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Register Workbox service worker for offline precaching and runtime caching
registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('labtech-sw-ready'));
  },
  onRegisteredSW() {
    window.dispatchEvent(new CustomEvent('labtech-sw-ready'));
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
