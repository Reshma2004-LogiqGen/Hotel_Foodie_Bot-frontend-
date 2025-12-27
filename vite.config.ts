import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

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
    cors: true
  }
})