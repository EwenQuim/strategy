import { execFileSync } from 'node:child_process'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { pwa } from './pwa/plugin.ts'

function gitCommit(): string {
  if (process.env.VITE_GIT_COMMIT) return process.env.VITE_GIT_COMMIT.slice(0, 7)
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      cwd: new URL('.', import.meta.url),
      encoding: 'utf8',
      timeout: 5_000,
    }).trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  base: '/strategy/',
  server: { proxy: { '/api': 'http://localhost:8080' } },
  define: {
    'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(gitCommit()),
    // Compile the HexTile render counter out of production builds; the perf
    // gate builds its own bundle with this flag set.
    'import.meta.env.VITE_TILE_RENDER_COUNTER': JSON.stringify(
      !!process.env.VITE_TILE_RENDER_COUNTER,
    ),
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      generatedRouteTree: './generated/routeTree.gen.ts',
    }),
    react({
      compiler: true,
      exclude: [/generated\//],
    }),
    pwa(),
  ],
})
