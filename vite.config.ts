import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': { target: process.env.BACKEND_PROXY_TARGET ?? 'http://localhost:8080', changeOrigin: true },
      // kg-api는 CORS가 없고 메인 백엔드와 /api/v1 경로가 겹쳐서 별도 프리픽스로 우회한다
      '/kg': {
        target: process.env.KG_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kg/, ''),
      },
    },
  },
})
