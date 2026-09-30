import { expect, test } from "@playwright/test";

test("project actions follow health and preserve selection; confirm/cancel are safe", async ({
  page,
}, testInfo) => {
  await page.goto("/?projects");
  await expect(page.getByRole("region", { name: "ตารางทะเบียนโครงการ" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  const headers = await page.getByRole("columnheader").allTextContents();
  expect(headers.indexOf("จัดการ")).toBe(headers.indexOf("สุขภาพโครงการ") + 1);
  const menu = page.getByLabel("จัดการโครงการ PR-TEST-001");
  await menu.click();
  const actions = page.locator("details").filter({ has: menu });
  await expect(actions.getByRole("link", { name: "แก้ไข", exact: true })).toHaveAttribute(
    "href",
    "/projects/00000000-0000-4000-8000-000000000001/edit",
  );
  await page.screenshot({
    path: `.impeccable/review/projects-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await menu.press("Escape");
  await expect(actions).not.toHaveAttribute("open", "");
  await menu.press("Enter");
  await actions.getByRole("button", { name: "ลบ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "ยกเลิก" })).toBeFocused();
  await expect(dialog).toContainText("ไม่ลบข้อมูลถาวร");
  await page.screenshot({
    path: `.impeccable/review/projects-dialog-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => window.archiveCalls)).toHaveLength(0);
  await actions.getByRole("button", { name: "ลบ", exact: true }).click();
  await dialog.getByRole("button", { name: "ยืนยันลบ" }).click();
  await expect(dialog.getByRole("button", { name: "กำลังย้ายไปถังขยะ…" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("ย้ายโครงการ PR-TEST-001 ไปถังขยะแล้ว");
  expect(await page.evaluate(() => window.archiveCalls)).toHaveLength(1);
});

test("project permission and approval guards disable unavailable actions", async ({ page }) => {
  await page.goto("/?projects&staff");
  await page.getByLabel("จัดการโครงการ PR-TEST-001").click();
  const first = page
    .locator("details")
    .filter({ has: page.getByLabel("จัดการโครงการ PR-TEST-001") });
  await expect(first.getByRole("button", { name: "ลบ", exact: true })).toBeDisabled();
  for (const id of ["PR-TEST-002", "PR-TEST-003"]) {
    const menu = page.getByLabel(`จัดการโครงการ ${id}`);
    await menu.click();
    const actions = page.locator("details").filter({ has: menu });
    await expect(actions.getByRole("button", { name: "แก้ไข", exact: true })).toBeDisabled();
    await expect(actions.getByRole("button", { name: "ลบ", exact: true })).toBeDisabled();
  }
  expect(await page.evaluate(() => window.archiveCalls)).toHaveLength(0);
});

test("project deletion failure retains dialog and never retries automatically", async ({
  page,
}) => {
  await page.goto("/?projects&network");
  await page.getByLabel("จัดการโครงการ PR-TEST-001").click();
  await page
    .locator("details")
    .filter({ has: page.getByLabel("จัดการโครงการ PR-TEST-001") })
    .getByRole("button", { name: "ลบ", exact: true })
    .click();
  await page.getByRole("button", { name: "ยืนยันลบ" }).click();
  await expect(page.getByRole("alert")).toContainText("ยังยืนยันผลการลบไม่ได้");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => window.archiveCalls)).toHaveLength(1);
});
