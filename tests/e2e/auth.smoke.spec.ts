import { expect, test } from "@playwright/test";

test("login renders branding and both required fields without a server error", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบเพื่อดำเนินงาน" })).toBeVisible();
  await expect(page.getByLabel("อีเมลสถาบัน")).toBeVisible();
  await expect(page.locator("#login-password")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "ตรามหาวิทยาลัยอุบลราชธานี", exact: true }),
  ).toBeVisible();
});

for (const path of ["/", "/projects", "/approvals", "/admin", "/api/evidence"]) {
  test(`anonymous visitor cannot open ${path}`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const location = new URL(response.headers().location, "http://127.0.0.1:3206");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe(path);
  });
}

test("login sanitizes an external redirect before rendering its hidden field", async ({ page }) => {
  await page.goto(`/login?next=${encodeURIComponent("/\\outside.example.test")}`);
  await expect(page.locator('input[name="next"]')).toHaveValue("/");
});

test("required fields stop an empty login submission", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByLabel("อีเมลสถาบัน")).toBeFocused();
  expect(
    await page
      .getByLabel("อีเมลสถาบัน")
      .evaluate((element: HTMLInputElement) => element.validity.valueMissing),
  ).toBe(true);
});
