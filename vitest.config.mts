import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
    coverage: {
      include: ['src/lib/**'],
      exclude: ['src/lib/supabase/**'],
    },
  },
  resolve: {
    // import.meta.dirname en vez de __dirname (ESM) y en vez de new URL().pathname,
    // que codifica los espacios de la ruta y rompe el alias.
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
})
