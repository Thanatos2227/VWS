import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'firebase-functions/v2/https': path.resolve(__dirname, './functions/node_modules/firebase-functions/lib/v2/providers/https.js'),
      'firebase-functions': path.resolve(__dirname, './functions/node_modules/firebase-functions/lib/index.js'),
      'firebase-admin/app': path.resolve(__dirname, './functions/node_modules/firebase-admin/lib/app/index.js'),
      'firebase-admin/auth': path.resolve(__dirname, './functions/node_modules/firebase-admin/lib/auth/index.js'),
      'firebase-admin/firestore': path.resolve(__dirname, './functions/node_modules/firebase-admin/lib/firestore/index.js'),
      'firebase-admin': path.resolve(__dirname, './functions/node_modules/firebase-admin/lib/index.js'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
});
