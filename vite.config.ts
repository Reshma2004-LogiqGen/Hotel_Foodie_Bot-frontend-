import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// 127.0.0.1 instead of localhost: on Windows, localhost tries IPv6 first and each request stalls ~2s
const BACKEND_URL = 'http://127.0.0.1:5000'

// HTTPS is REQUIRED for camera access on mobile browsers
export default defineConfig({
  plugins: [
    react(),
    basicSsl()  // Enables HTTPS with self-signed certificate
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',  // Listen on all network interfaces for mobile access
    https: true,      // Enable HTTPS - required for camera on mobile
    strictPort: true,
    cors: true,
    // Cloudflare quick tunnel (cloudflared tunnel --url https://localhost:5173 --no-tls-verify)
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': BACKEND_URL,
      '/uploads': BACKEND_URL
    }
  }
})