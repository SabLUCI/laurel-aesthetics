import { defineConfig } from 'vite';

// Two pages: the installable studio app, and the client booking page (no install prompt).
export default defineConfig({
  build: { rollupOptions: { input: { main: 'index.html', book: 'book.html' } } },
});
