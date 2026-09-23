import { execFileSync } from 'node:child_process'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { pwa } from './pwa/plugin.ts'

export default defineConfig({
  base: '/strategy/',
  define: {
    'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(
      execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
        cwd: new URL('.', import.meta.url),
        encoding: 'utf8',
        timeout: 5_000,
      }).trim(),
    ),
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react({ compiler: { panicThreshold: 'all_errors' } }),
    pwa(),
  ],
})
