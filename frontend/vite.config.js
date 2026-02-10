import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    host: '0.0.0.0',  // 1. 모든 IP에서의 접속 허용 (중요!)
    port: 5173,       // 2. 포트 고정
    watch: {
      usePolling: true, // 3. (선택사항) 도커에서 파일 변경 감지가 잘 안될 때 필수
    },
    hmr: {
      clientPort: 5173, // [핵심] 브라우저에게 "무조건 내 PC의 5173 포트로 연결해"라고 강제함
    },
  },
})
