import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Port 3001 : celui attendu par CORS_ORIGINS dans le .env du back.
export default defineConfig({
  plugins: [react()],
  server: { port: 3001, strictPort: true },
  preview: { port: 3001, strictPort: true },
})
