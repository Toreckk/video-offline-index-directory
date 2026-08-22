import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/app/src/**/*.test.{ts,tsx}'],
    setupFiles: ['./packages/app/src/test/setup.ts'],
  },
})
