import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    watch: {
      usePolling: true,
      interval: 1000, // Increase interval to reduce CPU/IO load in Docker
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/.vite/**',
      ],
    },
    hmr: {
      overlay: true, // Show errors in browser
    },
    host: true, // needed for the Docker Container port mapping to work
    strictPort: true,
    port: 5173, 
  },
  optimizeDeps: {
    // Force pre-bundling of problematic UI libraries to improve HMR
    include: ['lucide-react', 'recharts', 'clsx', 'tailwind-merge'],
  }
})
