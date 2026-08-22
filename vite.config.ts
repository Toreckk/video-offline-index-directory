import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('.', import.meta.url))
const webRoot = fileURLToPath(new URL('./apps/web', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root: webRoot,
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    fs: { allow: [workspaceRoot] },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist/web', import.meta.url)),
    emptyOutDir: true,
  },
})
