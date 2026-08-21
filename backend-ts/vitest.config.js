import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/utils/pagination.ts",
        "src/libs/token.ts",
        "src/response/**",
        "src/constant/message.ts",
        "src/middleware/endpointLogger.ts",
        "src/routers/**/validator.ts",
        "src/routers/**/validate.ts",
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
