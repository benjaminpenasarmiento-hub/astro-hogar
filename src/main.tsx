import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent HMR WebSocket connection errors from triggering browser error overlays
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason ? String(event.reason) : "";
    if (reason.includes("WebSocket") || reason.includes("vite")) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener("error", (event) => {
    const message = event.message ? String(event.message) : "";
    if (message.includes("WebSocket") || message.includes("vite")) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

// Register Service Worker for PWA features and push notification support
if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        console.log('[Service Worker] Registration successful with scope: ', reg.scope);
      },
      (err) => {
        console.warn('[Service Worker] Registration failed: ', err);
      }
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
