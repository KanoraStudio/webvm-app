import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ★ GitHub Pages用: あなたのリポジトリ名に合わせて変更
// 例: https://kanorastudio.github.io/webvm-app/ → '/webvm-app/'
const GITHUB_REPO_NAME = '/webvm-app/'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? GITHUB_REPO_NAME : '/',
  server: {
    headers: {
      'Cross-Origin-Opener-Policy':  'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    port: 5173,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // v86はscriptタグ経由なので分割しない
      },
    },
  },
  assetsInclude: ['**/*.wasm', '**/*.bin'],
})
