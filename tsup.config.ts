import { defineConfig } from 'tsup';

const requireBanner =
  "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);";

export default defineConfig({
  entry: { index: 'src/index.ts', 'ai-monitor': 'src/ai-monitor.ts', 'heari-cli-login': 'src/core/heari-cli-login.ts' },
  // ExcelJS is CommonJS and dynamically loads Node built-ins after it is bundled into ESM.
  banner: {
    js: requireBanner,
  },
});
