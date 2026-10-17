import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base works for both user pages and project pages (/<repo>/)
export default defineConfig({
  plugins: [react()],
  base: './',
})
