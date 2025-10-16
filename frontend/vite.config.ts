import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8084', // tu backend
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:8084', // sirve archivos estáticos externos
        changeOrigin: true,
      },
      // Si en algún momento usas /uploads en vez de /static:
       '/uploads': {
         target: 'http://localhost:8084',
         changeOrigin: true,
       },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
