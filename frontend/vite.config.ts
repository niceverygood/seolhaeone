import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Vite 8 기본값(rolldown + oxc)이 현대 브라우저 대상 · 최소 번들을 처리.
  // 명시 target을 주면 esbuild transpile 경로를 타 오류 나므로 생략.
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // 무거운 라이브러리를 별도 청크로 — 라우트 전환 시 재다운로드 방지
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'charts'
          }
          if (id.includes('react-router')) return 'router'
          if (id.includes('react-dom') || id.includes('scheduler') || /node_modules\/react\//.test(id)) {
            return 'react'
          }
          if (id.includes('lucide-react')) return 'icons'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
