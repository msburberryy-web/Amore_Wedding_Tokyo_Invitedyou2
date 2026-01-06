
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base path so assets load correctly regardless of the repo name
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
