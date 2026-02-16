
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Declare process to avoid TS errors
declare const process: any;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Function to aggregate API keys from various env names
  const getApiKeyPool = () => {
    const keys = [];
    
    // 1. Check standard API_KEY
    if (env.API_KEY) keys.push(env.API_KEY);
    
    // 2. Check indexed keys: API_KEY_1, API_KEY_2 ... API_KEY_50
    for (let i = 1; i <= 50; i++) {
       const k = `API_KEY_${i}`;
       if (env[k]) keys.push(env[k]);
    }

    return keys.join(',');
  };

  const API_KEY_POOL = getApiKeyPool();

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'logo.svg'],
        manifest: {
          name: 'Oceep AI',
          short_name: 'Oceep',
          description: 'A minimalist, modern AI chat interface with real-time web search capabilities.',
          theme_color: '#0f0f12',
          background_color: '#0f0f12',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'logo.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'logo.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'logo.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cdn-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        }
      })
    ],
    define: {
      // Define process.env to ensure it exists as an object, preventing crash on access
      'process.env': {
        // Pass the aggregated string of keys
        API_KEY: JSON.stringify(API_KEY_POOL), 
        SMART_KEY: JSON.stringify(env.SMART_KEY || ''),
        MEGALLM_API_KEY: JSON.stringify(env.MEGALLM_API_KEY || ''),
        SERPAPI_API_KEY: JSON.stringify(env.SERPAPI_API_KEY || ''),
        
        // Supabase Keys: Load from .env file
        VITE_SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL || ''),
        VITE_SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
        
        // Map Keys
        VITE_GEOAPIFY_KEY: JSON.stringify(env.VITE_GEOAPIFY_KEY || '')
      }
    }
  }
})
