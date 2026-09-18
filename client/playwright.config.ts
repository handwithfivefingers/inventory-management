import { defineConfig, devices } from "@playwright/test";

// Playwright E2E configuration - owns e2e specs only (see testDir/testMatch below).
//
// Isolation contract (do not break):
// - Vitest: app unit/component tests, files ending with .test.ts(x) (jsdom).
// - Playwright: e2e browser tests, files ending with .spec.ts (this config).
//
// Conventions (see client/AGENTS.md):
// - Always run headless in WSL2 unless explicitly requested (--headed).
// - Prefer accessibility locators: page.getByRole(), page.getByText().
// - Use a 5000ms timeout for page navigation (WSL network/timing flakiness).
export default defineConfig({
  // Playwright owns this directory exclusively. Never point Vitest at it.
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",

  /* Run tests in parallel inside a file, files in parallel across workers. */
  fullyParallel: true,
  /* Fail the build on CI if `test.only` slipped in. */
  forbidOnly: !!process.env.CI,
  /* Retry flaky E2E once on CI, never locally (fast feedback). */
  retries: process.env.CI ? 1 : 0,
  /* Cap workers on CI to keep WSL/CI runners stable. */
  workers: process.env.CI ? 1 : undefined,

  /* Per-test timeout; navigation/assert timeouts stay at 5s (see `use` + specs). */
  timeout: 30_000,
  expect: {
    timeout: 5000,
  },

  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "./test-results/playwright",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3333",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // WSL2 has no display server: stay headless unless `--headed` is passed.
    headless: true,
    actionTimeout: 5000,
    navigationTimeout: 5000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Boot the Remix dev server automatically; reuse it when already running. */
  webServer: {
    command: "yarn dev",
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3333",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
