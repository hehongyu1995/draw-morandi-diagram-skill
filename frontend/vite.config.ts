import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/list': 'http://localhost:8000',
      '/save': 'http://localhost:8000',
      // Proxy JSON requests (diagram files) to Python backend
      '^/.*\\.json': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
