import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Aperçu local branché sur l'API de production (même origine via proxy). Non utilisé en build.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3011,
    strictPort: true,
    proxy: {
      '/api': { target: 'https://www.hello-world.ci', changeOrigin: true, secure: true, cookieDomainRewrite: '', ws: true },
      '/socket.io': { target: 'https://www.hello-world.ci', changeOrigin: true, ws: true },
    },
  },
})
