import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" || url.port !== "3220") return route.abort();
    return route.continue();
  });
});
test("executive adjusts with a reason, preserves input on error and saves original request", async ({
  page,
}, info) => {
  await page.goto("/");
  const form = page.getByRole("form", { name: "พิจารณาคำของบประมาณ" });
  await form.getByLabel("วงเงินที่พิจารณาอนุมัติ (บาท)").fill("750.25");
  await form.getByRole("button", { name: "อนุมัติวงเงิน", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("ระบุเหตุผล");
  await expect(form.getByLabel("วงเงินที่พิจารณาอนุมัติ (บาท)")).toHaveValue("750.25");
  await form.getByLabel("เหตุผล / ความเห็นประกอบ").fill("ปรับลดตามมติที่ประชุม");
  await expect(form).toContainText("ลดจากวงเงินที่ขอ 249.75 บาท");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole("region", { name: "พิจารณาอนุมัติวงเงิน", exact: true })
    .screenshot({ path: `tmp/budget-decision-${info.project.name}.png` });
  await form.getByRole("button", { name: "อนุมัติวงเงิน", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("อนุมัติรายการ");
  const snapshot = await (await page.request.get("/test-snapshot")).json();
  expect(snapshot).toMatchObject({
    status: "approved",
    requested_amount: "1000.00",
    approved_amount: "750.25",
  });
});
test("reviewer forwards without an amount input", async ({ page }) => {
  await page.goto("/?role=user");
  const form = page.getByRole("form", { name: "พิจารณาคำของบประมาณ" });
  await expect(form.locator('[name="approvedAmount"]')).toHaveCount(0);
  await form.getByRole("button", { name: "ผ่านการตรวจสอบและส่งต่อ", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("อนุมัติรายการ");
  expect(await (await page.request.get("/test-snapshot")).json()).toMatchObject({
    status: "pending_approval",
    approved_amount: null,
  });
});
test("return ignores an invalid amount but requires a reason", async ({ page }) => {
  await page.goto("/");
  const form = page.getByRole("form", { name: "พิจารณาคำของบประมาณ" });
  await form.getByLabel("วงเงินที่พิจารณาอนุมัติ (บาท)").fill("unfinished");
  await form.getByRole("button", { name: "ส่งกลับแก้ไข", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("ระบุเหตุผล");
  await form.getByLabel("เหตุผล / ความเห็นประกอบ").fill("โปรดตรวจรายการค่าใช้จ่ายอีกครั้ง");
  await form.getByRole("button", { name: "ส่งกลับแก้ไข", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("บันทึกคำตัดสิน");
  expect(await (await page.request.get("/test-snapshot")).json()).toMatchObject({
    status: "revision_required",
    approved_amount: null,
  });
});
test("stale decision keeps input and does not change the allocation", async ({ page }) => {
  await page.goto("/?stale=1");
  const form = page.getByRole("form", { name: "พิจารณาคำของบประมาณ" });
  await form.getByLabel("วงเงินที่พิจารณาอนุมัติ (บาท)").fill("1500");
  await form.getByLabel("เหตุผล / ความเห็นประกอบ").fill("ปรับเพิ่มตามความจำเป็น");
  await form.getByRole("button", { name: "อนุมัติวงเงิน", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("ข้อมูลถูกแก้ไข");
  await expect(form.getByLabel("วงเงินที่พิจารณาอนุมัติ (บาท)")).toHaveValue("1500");
  expect(await (await page.request.get("/test-snapshot")).json()).toMatchObject({
    status: "pending_approval",
    approved_amount: null,
  });
});
