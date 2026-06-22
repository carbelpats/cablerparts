import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        // Honor a harness/host-injected PORT (e.g. preview tooling, Vercel
        // previews) so the dev server binds where it's told; falls back to the
        // Vite default for a plain `npm run dev`.
        port: Number(process.env.PORT) || 5173,
        watch: {
            ignored: ['**/node_modules/**', '**/dist/**', '**/.vs/**']
        }
    },
    build: {
        // Slightly higher than the 500 kB default so the vendor split below
        // (intentionally grouping React/router) does not spam warnings while
        // still flagging genuinely oversized chunks.
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            output: {
                // Split long-lived vendor code into stable, cache-friendly
                // chunks so app updates don't bust the framework cache.
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'router-vendor': ['react-router-dom'],
                    'supabase-vendor': ['@supabase/supabase-js'],
                },
            },
        },
    },
})
