import { expect, test } from "@playwright/test";

test("approval status is separate from health and unavailable requests explain next steps", async ({
  page,
}, testInfo) => {
  await page.goto("/?projects&staff&approval-states");
  const region = page.getByRole("region", { name: "ตารางทะเบียนโครงการ" });
  const pendingRow = region.getByRole("row").filter({ hasText: "PR-TEST-002" });
  const approvedRow = region.getByRole("row").filter({ hasText: "PR-TEST-003" });
  await expect(pendingRow).toContainText("สถานะการอนุมัติ:");
  await expect(pendingRow).toContainText("รอตรวจระดับหน่วยงาน");
  await expect(pendingRow).toContainText("ปกติ");
  await expect(approvedRow).toContainText("อนุมัติแล้ว");
  await expect(approvedRow).toContainText("ปกติ");
  await expect(region.getByRole("row").filter({ hasText: "PR-TEST-005" })).toContainText(
    "รอผู้บริหารอนุมัติ",
  );
  await pendingRow.getByText("โครงการที่อยู่ระหว่างอนุมัติ (ข้อมูลทดสอบ)", { exact: true }).click();
  await expect(page.getByRole("complementary")).toContainText("รอตรวจระดับหน่วยงาน");
  await pendingRow.getByLabel("จัดการโครงการ PR-TEST-002").click();
  await expect(
    pendingRow.getByRole("button", { name: "ขอแก้ไขหลังอนุมัติ", exact: true }),
  ).toBeDisabled();
  await expect(pendingRow).toContainText("ติดต่อผู้ตรวจเพื่อส่งกลับแก้ไข");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: `.impeccable/review/project-approval-status-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await pendingRow.getByLabel("จัดการโครงการ PR-TEST-002").press("Escape");
  await approvedRow.getByLabel("จัดการโครงการ PR-TEST-003").click();
  await expect(
    approvedRow.getByRole("button", { name: "ขอแก้ไขหลังอนุมัติ", exact: true }),
  ).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  expect(await page.evaluate(() => window.revisionCalls ?? [])).toHaveLength(0);
});

test("staff requests revision with reason; admin reviews it in a protected dialog", async ({
  page,
}, testInfo) => {
  for (const review of [false, true]) {
    await page.goto(review ? "/?projects&review" : "/?projects&staff");
    await page.getByLabel("จัดการโครงการ PR-TEST-003").click();
    await page
      .getByRole("button", { name: review ? "ส่งกลับแก้ไข" : "ขอแก้ไขหลังอนุมัติ", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "ยกเลิก" })).toBeFocused();
    await dialog
      .getByRole("button", { name: review ? "ยืนยันส่งกลับแก้ไข" : "ส่งคำขอแก้ไข", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("กรุณาระบุเหตุผล");
    expect(await page.evaluate(() => window.revisionCalls ?? [])).toHaveLength(0);
    await dialog
      .getByRole("textbox")
      .fill(
        review
          ? "อนุญาตให้ปรับรายละเอียดตามคำขอ กรุณาส่งอนุมัติใหม่"
          : "ขอปรับรายละเอียดกิจกรรมและวันที่ดำเนินการ",
      );
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.screenshot({
      path: `.impeccable/review/project-revision-${review ? "admin" : "staff"}-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await dialog
      .getByRole("button", { name: review ? "ยืนยันส่งกลับแก้ไข" : "ส่งคำขอแก้ไข", exact: true })
      .click();
    await expect(dialog.getByRole("button", { name: "กำลังบันทึก…" })).toBeDisabled();
    await expect(page.getByRole("status")).toContainText(
      review ? "ส่งกลับแก้ไขแล้ว" : "ส่งคำขอแก้ไขแล้ว",
    );
    expect(await page.evaluate(() => window.revisionCalls)).toHaveLength(1);
  }
});

test("pending owner cannot self-return; network failure does not discard reason or retry", async ({
  page,
}) => {
  await page.goto("/?projects&staff&review");
  await page.getByLabel("จัดการโครงการ PR-TEST-003").click();
  await expect(page.getByRole("button", { name: "ส่งกลับแก้ไข", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "ดูผลคำขอแก้ไข" }).click();
  await expect(page.getByRole("dialog")).toContainText("รอผู้ดูแลระบบพิจารณา");
  await page.keyboard.press("Escape");
  await page.goto("/?projects&staff&network");
  await page.getByLabel("จัดการโครงการ PR-TEST-003").click();
  await page.getByRole("button", { name: "ขอแก้ไขหลังอนุมัติ" }).click();
  await page.getByRole("textbox").fill("เหตุผลที่ต้องเก็บไว้เมื่อเครือข่ายขัดข้อง");
  await page.getByRole("button", { name: "ส่งคำขอแก้ไข", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("ยังยืนยันผลไม่ได้");
  await expect(page.getByRole("textbox")).toHaveValue("เหตุผลที่ต้องเก็บไว้เมื่อเครือข่ายขัดข้อง");
  expect(await page.evaluate(() => window.revisionCalls)).toHaveLength(1);
});

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
