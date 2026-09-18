import { expect, test } from "@playwright/test";

/**
 * Products E2E — unauthenticated guard + list-page contract.
 *
 * Authenticated flows (search / create / delete) need a seeded backend +
 * session cookie. They are stubbed below as skipped placeholders so the
 * file owns the products E2E surface without conflicting with Vitest's
 * `app/routes/_index+/products+/__tests__/index.test.ts` (source-wiring checks).
 *
 * To enable authenticated runs later:
 * 1. Seed backend (`backend-ts`: `npm run db:setup`).
 * 2. Save a session via the login spec (`storageState`), then
 *    `test.use({ storageState: "e2e/.auth.json" })` for this file.
 */
test.describe("products / route guard", () => {
  test("unauthenticated /products redirects to /auth/login", async ({ page }) => {
    await page.goto("/products", { timeout: 5000 });
    await page.waitForURL("**/auth/login", { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("unauthenticated /products/add redirects to /auth/login", async ({ page }) => {
    await page.goto("/products/add", { timeout: 5000 });
    await page.waitForURL("**/auth/login", { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe.skip("products / authenticated list (needs seeded backend + session)", () => {
  test("searches by name and shows the admin unified-search input", async ({ page }) => {
    await page.goto("/products", { timeout: 5000 });
    await expect(page.getByPlaceholder("Lọc theo mã, tên hàng hóa")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("columnheader", { name: /tên sản phẩm/i })).toBeVisible();
  });
});

// This suite is opt-in because it needs the local MySQL/Redis backend. It
// exercises the fixture installed by 20260918000001-seed-multi-unit-product.
test.describe("products / multi-unit fixture", () => {
  test.skip(!process.env.E2E_API, "set E2E_API=1 after backend db:setup")

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login", { timeout: 5000 });
    await page.getByLabel(/email/i).fill("seed-staff@example.com");
    await page.getByLabel(/mật khẩu/i).fill("password123");
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    await page.waitForURL("**/", { timeout: 5000 });
  });

  test("opens the pricing drawer and locks its base conversion rate", async ({ page }) => {
    await page.goto("/products", { timeout: 5000 });
    await page.getByText("DEMO Multi-unit product").click();
    await page.getByRole("button", { name: /chỉnh sửa|edit/i }).click();
    await page.getByRole("button", { name: /cấu hình giá & đơn vị/i }).first().click();
    await expect(page.getByText(/đơn vị gốc/i)).toBeVisible();
    await expect(page.locator('input[inputmode="numeric"]').first()).toBeDisabled();
    await page.getByRole("button", { name: /thêm quy cách/i }).click();
    await expect(page.locator('input[inputmode="numeric"]')).toHaveCount(8);
  });
});
