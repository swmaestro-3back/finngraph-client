import path from 'node:path'
import { defineConfig } from 'vitest/config'

// vite.config.ts를 그대로 쓰지 않는다 — react/tailwind 플러그인은 순수 함수 테스트에 필요 없고 기동만 늦춘다
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
