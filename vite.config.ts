import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 배포를 위한 base URL 설정
  // 커스텀 도메인 사용 시 '/'로 변경
  base: process.env.GITHUB_ACTIONS ? '/Blog-Or-Death/' : '/',
})
