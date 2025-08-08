import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/japanese-vocab-trainer/',  // GitHub 仓库的名称
  plugins: [react()],
})
