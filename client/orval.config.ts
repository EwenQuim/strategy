import { defineConfig } from 'orval'

export default defineConfig({
  hexmate: {
    input: '../server/openapi.json',
    output: {
      target: './src/api/sdk.gen.ts',
      client: 'fetch',
    },
  },
})
