import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Evict legacy service worker that intercepted /server-docs/*.pdf navigation requests
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const SW_FIX_KEY = 'labtech_sw_pdf_navfix_v2';
  if (localStorage.getItem(SW_FIX_KEY) !== '1') {
    localStorage.setItem(SW_FIX_KEY, '1');
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
  }
}

// Register Workbox service worker for offline precaching and runtime caching
registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('labtech-sw-ready'));
  },
  onRegisteredSW(_swUrl, r) {
    r?.update().catch(() => {});
    window.dispatchEvent(new CustomEvent('labtech-sw-ready'));
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
