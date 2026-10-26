import './styles.css';
import { boot } from './app.js';

// Only the studio side is installable; clients book in the browser with no install prompt.
if (!location.pathname.replace(/\/+$/, '').endsWith('/book')) {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest.webmanifest';
  document.head.appendChild(link);
}

boot();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
