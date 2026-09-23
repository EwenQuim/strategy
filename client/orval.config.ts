import { defineConfig } from 'orval'

export default defineConfig({
  hexmate: {
    input: '../server/generated/openapi.json',
    output: {
      target: './generated/sdk.gen.ts',
      client: 'fetch',
    },
  },
})
