import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'shared': resolve(__dirname, '../../shared'),
      'axios': resolve(__dirname, './node_modules/axios')
    },
    modules: [
      resolve(__dirname, 'node_modules'),
      resolve(__dirname, '../../node_modules'),
      'node_modules'
    ]
  },
  optimizeDeps: {
    include: ['axios']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})