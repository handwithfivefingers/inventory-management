import { expect, test } from "@playwright/test";

/**
 * Login E2E — `auth.login.spec.ts` (Playwright) is intentionally separate from
 * `app/routes/auth+/login/__tests__/login.test.ts` (Vitest):
 * - Vitest covers the route `action()` unit logic (session seeding, error mapping).
 * - Playwright covers the rendered form + validation a real user sees.
 */
test.describe("auth / login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login", { timeout: 5000 });
  });

  test("renders email + password fields with default values", async ({ page }) => {
    const email = page.getByLabel(/email/i);
    const password = page.getByLabel(/mật khẩu/i);

    await expect(email).toBeVisible({ timeout: 5000 });
    await expect(password).toBeVisible({ timeout: 5000 });

    // Defaults seeded in the route component for local development.
    await expect(email).toHaveValue("handgod1995@gmail.com");
    await expect(password).toHaveValue("123456");

    await expect(page.getByRole("button", { name: /đăng nhập/i })).toBeEnabled();
  });

  test("shows validation errors when submitting empty credentials", async ({ page }) => {
    await page.getByLabel(/email/i).fill("");
    await page.getByLabel(/mật khẩu/i).fill("");
    await page.getByRole("button", { name: /đăng nhập/i }).click();

    // zod messages from app login schema, rendered by FormControl.
    // Note: the email field checks .email() before .min(1), so an empty
    // string reports "Email không hợp lệ", not "Email là bắt buộc".
    await expect(page.getByText("Email không hợp lệ")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Mật khẩu là bắt buộc")).toBeVisible({ timeout: 5000 });
  });

  test("shows invalid-email error for a malformed address", async ({ page }) => {
    await page.getByLabel(/email/i).fill("not-an-email");
    await page.getByLabel(/mật khẩu/i).fill("123456");
    await page.getByRole("button", { name: /đăng nhập/i }).click();

    await expect(page.getByText("Email không hợp lệ")).toBeVisible({ timeout: 5000 });
  });

  test("links to the register page", async ({ page }) => {
    const register = page.getByRole("link", { name: /đăng kí ngay/i });
    await expect(register).toBeVisible({ timeout: 5000 });
    await expect(register).toHaveAttribute("href", "/auth/register");
  });
});
