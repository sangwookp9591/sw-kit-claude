import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      scripts: resolve(__dirname, "scripts"),
    },
  },
  test: {
    include: ["tests/e2e/harness-integration.test.ts"],
  },
});
