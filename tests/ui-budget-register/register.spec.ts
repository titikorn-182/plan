import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort(),
  );
});

test("status actions, safe confirmation, pending and confirmed success", async ({ page }, info) => {
  await page.goto("/");
  const menu = page.getByLabel("สถานะและเมนู BR-TEST-001");
  await menu.focus();
  await page.keyboard.press("Enter");
  const row = page.locator("tr").filter({ hasText: "BR-TEST-001" });
  await expect(row.getByRole("link", { name: "แก้ไข", exact: true })).toHaveAttribute(
    "href",
    /\/00000000-0000-4000-8000-000000000001\/edit$/,
  );
  await page.screenshot({
    path: `test-results/ui-budget-register-${info.project.name}-menu.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await row.getByRole("button", { name: "ลบ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "ยกเลิก", exact: true })).toBeFocused();
  await expect(dialog).toContainText("BR-TEST-001");
  await page.screenshot({
    path: `test-results/ui-budget-register-${info.project.name}-confirm.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => window.archiveCalls)).toEqual([]);
  await row.getByRole("button", { name: "ลบ", exact: true }).click();
  await dialog.getByRole("button", { name: "ยืนยันลบ", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "กำลังย้ายไปถังขยะ…" })).toBeDisabled();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText("ไปถังขยะแล้ว");
  expect(await page.evaluate(() => window.archiveCalls)).toEqual([
    { id: "00000000-0000-4000-8000-000000000001", version: 3 },
  ]);
});

test("restricts approved records and non-admin deletion", async ({ page }) => {
  await page.goto("/?staff");
  await page.getByLabel("สถานะและเมนู BR-TEST-001").click();
  const draft = page.locator("tr").filter({ hasText: "BR-TEST-001" });
  await expect(draft.getByRole("button", { name: "ลบ", exact: true })).toBeDisabled();
  await expect(draft).toContainText("ลบได้เฉพาะผู้ดูแลระบบ");
  await page.getByLabel("สถานะและเมนู BR-TEST-002").click();
  const approved = page.locator("tr").filter({ hasText: "BR-TEST-002" });
  await expect(approved.getByRole("button", { name: "แก้ไข", exact: true })).toBeDisabled();
  await expect(approved.getByRole("button", { name: "ลบ", exact: true })).toBeDisabled();
});

for (const kind of ["error", "network"]) {
  test(`keeps the dialog and record on ${kind} failure without retrying`, async ({ page }) => {
    await page.goto(`/?${kind}`);
    await page.getByLabel("สถานะและเมนู BR-TEST-001").click();
    await page
      .locator("tr")
      .filter({ hasText: "BR-TEST-001" })
      .getByRole("button", { name: "ลบ", exact: true })
      .click();
    await page.getByRole("button", { name: "ยืนยันลบ", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      kind === "error" ? "เปลี่ยนสถานะ" : "ยังยืนยันผลการลบไม่ได้",
    );
    expect(await page.evaluate(() => window.archiveCalls.length)).toBe(1);
    await expect(page.locator("tbody tr")).toHaveCount(2);
  });
}
