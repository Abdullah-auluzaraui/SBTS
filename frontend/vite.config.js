import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        'import.meta.env.VITE_DEMO_MODE': JSON.stringify(process.env.VITE_DEMO_MODE || 'false'),
    },
    server: {
        proxy: {
            // All /api/* requests are proxied to the backend — no CORS preflight
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
})
