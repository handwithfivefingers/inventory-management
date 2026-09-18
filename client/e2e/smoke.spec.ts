import { expect, test } from "@playwright/test";

/**
 * Smoke flow — proves the app boots and the auth guard works.
 * No backend / credentials required: unauthenticated visits must land on /auth/login.
 */
test.describe("smoke", () => {
  test("unauthenticated / redirects to /auth/login", async ({ page }) => {
    await page.goto("/", { timeout: 5000 });
    await page.waitForURL("**/auth/login", { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("login page renders its heading and primary actions", async ({ page }) => {
    await page.goto("/auth/login", { timeout: 5000 });

    // Accessibility locators only — no brittle CSS classes.
    await expect(page.getByText("Đăng nhập", { exact: false }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /đăng nhập/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("link", { name: /đăng kí ngay/i })).toBeVisible({ timeout: 5000 });
  });
});
