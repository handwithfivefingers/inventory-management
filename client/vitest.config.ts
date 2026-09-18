import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "app"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Vitest owns unit/component tests only: `*.test.ts(x)`.
    // Playwright owns E2E tests: `e2e/**/*.spec.ts` (see playwright.config.ts).
    // Keeping these patterns disjoint prevents double-running / import errors
    // (Playwright specs import `@playwright/test`, which jsdom cannot execute).
    include: ["app/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/*.spec.{ts,tsx}", "**/build/**"],
    css: false,
    coverage: {
      provider: "v8",
      include: [
        "app/libs/**",
        "app/constants/schema/**",
        "app/i18n/**",
        "app/store/**",
        "app/hooks/use-permission.ts",
        "app/components/permission-guard.tsx",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
