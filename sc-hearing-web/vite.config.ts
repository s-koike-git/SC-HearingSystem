import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/sc-hearing' : '/',
  plugins: [react()],

  // ✅ 開発時のみ API をバックエンドへ中継
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5176', // バックエンドのポート
        changeOrigin: true,
      },
    },
  },
})
