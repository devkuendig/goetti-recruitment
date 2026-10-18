import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base works for both user pages and project pages (/<repo>/)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        film: fileURLToPath(new URL('./film.html', import.meta.url)),
      },
    },
  },
})
