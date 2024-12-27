// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    sourcemap: true
  },
  plugins: [react()],
  base: '/vtt/' 
})
