# Project Instructions

## Tech Stack
- Frontend Framework: React (Vite)
- Testing Framework: Playwright (End-to-End & Component testing)

## Environment
- Runtime: WSL2 (Ubuntu)
- Browser Testing: Always run tests with `--headed` disabled (headless mode) unless explicitly requested, due to the WSL2 environment.

## Automation Commands
- To run unit/component tests: `npm run test`
- To run UI/E2E tests: `npx playwright test`

## Rules for Code and Test Generation
1. When creating UI tests, prefer using Accessibility locators like `page.getByRole()` or `page.getByText()`. Do not use brittle CSS classes.
2. After editing any React component, automatically run `npx playwright test` to verify no UI regression.
3. If a test fails due to WSL network or timing issues, use a reasonable `timeout` (e.g., 5000ms) for page navigation.
