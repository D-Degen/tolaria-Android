import { defineConfig } from 'vitest/config'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export default defineConfig({
  define: {
    __DEV__: 'false',
  },
  resolve: { alias: [
    { find: /^react-native$/, replacement: require.resolve('react-native-web') },
    { find: /^react-dom$/, replacement: require.resolve('react-dom') },
    { find: /^react$/, replacement: require.resolve('react') },
    { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
  ] },
  test: {
    server: { deps: { inline: [/tentap-editor/] } },
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', 'src/qa/playwrightStartup.test.ts'],
  },
})
