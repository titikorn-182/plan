import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" && url.port === "3221" ? route.continue() : route.abort();
  });
});
async function fill(page: Page) {
  const form = page.getByRole("form", { name: "บันทึกการเบิกจ่าย" });
  await form.getByLabel("วันที่เบิกจ่าย").fill("2031-10-14");
  await form.getByLabel("ยอดเบิกจ่าย").fill("21475");
  await form.getByLabel("เลขที่เอกสาร/ใบสำคัญ").fill("อว 0604.19/07242");
  return form;
}

test("saves with a retained fiscal-year UUID and prevents another click after success", async ({
  page,
}) => {
  await page.goto("/");
  const form = await fill(page);
  await form.getByRole("button", { name: "บันทึกการเบิกจ่าย", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("บันทึกการเบิกจ่ายและปรับยอดโครงการแล้ว");
  await expect(form.getByRole("button", { name: "บันทึกแล้ว", exact: true })).toBeDisabled();
  const snapshot = await (await page.request.get("/test-snapshot")).json();
  expect(snapshot.rows).toHaveLength(1);
  expect(snapshot.rows[0]).toMatchObject({
    amount: "21475.00",
    quarter: 1,
    disbursed_on: "2031-10-14",
    reference_no: "อว 0604.19/07242",
    status: "recorded",
    fiscal_year_id: "20000000-0000-0000-0000-000000000001",
  });
  expect(snapshot.project.disbursed_amount).toBe("21475.00");
});

test("shows the hidden fiscal-year error and preserves every entered value", async ({
  page,
}, info) => {
  await page.goto("/?invalidYear=1");
  const form = await fill(page);
  await form.getByLabel("ไตรมาส").selectOption("2");
  await expect(form.getByLabel("ไตรมาส")).toHaveValue("2");
  await form.getByLabel("สถานะเอกสาร").selectOption("pending_docs");
  await expect(form.getByLabel("สถานะเอกสาร")).toHaveValue("pending_docs");
  await expect(form.getByLabel("ไตรมาส")).toHaveValue("2");
  await form.getByRole("button", { name: "บันทึกการเบิกจ่าย", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("กรุณาตรวจสอบข้อมูล");
  await expect(page.locator("#disbursement-fiscal-year-error")).toContainText(
    "ปีงบประมาณของโครงการไม่ถูกต้อง",
  );
  await expect(form.getByLabel("ยอดเบิกจ่าย")).toHaveValue("21475");
  await expect(form.getByLabel("วันที่เบิกจ่าย")).toHaveValue("2031-10-14");
  await expect(form.getByLabel("เลขที่เอกสาร/ใบสำคัญ")).toHaveValue("อว 0604.19/07242");
  await expect(form.getByLabel("ไตรมาส")).toHaveValue("2");
  await expect(form.getByLabel("สถานะเอกสาร")).toHaveValue("pending_docs");
  expect((await (await page.request.get("/test-snapshot")).json()).rows).toHaveLength(0);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `tmp/disbursement-error-${info.project.name}.png`,
    fullPage: true,
  });
});

test("preserves input after a newer spend and saves a corrected amount once", async ({ page }) => {
  await page.goto("/?staleBudget=1");
  const form = await fill(page);
  await form.getByRole("button", { name: "บันทึกการเบิกจ่าย", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("ไม่สามารถบันทึกยอดเกินวงเงินอนุมัติ");
  await expect(form.getByLabel("ยอดเบิกจ่าย")).toHaveValue("21475");
  await expect(form.getByLabel("เลขที่เอกสาร/ใบสำคัญ")).toHaveValue("อว 0604.19/07242");
  await form.getByLabel("ยอดเบิกจ่าย").fill("9000");
  await form.getByRole("button", { name: "บันทึกการเบิกจ่าย", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("บันทึกการเบิกจ่ายและปรับยอดโครงการแล้ว");
  const snapshot = await (await page.request.get("/test-snapshot")).json();
  expect(snapshot.rows).toHaveLength(2);
  expect(snapshot.project.disbursed_amount).toBe("99000.00");
});

test("keeps the entered document when the session expires", async ({ page }) => {
  await page.goto("/?expired=1");
  const form = await fill(page);
  await form.getByRole("button", { name: "บันทึกการเบิกจ่าย", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("เซสชันหมดอายุ");
  await expect(form.getByLabel("ยอดเบิกจ่าย")).toHaveValue("21475");
  await expect(form.getByLabel("วันที่เบิกจ่าย")).toHaveValue("2031-10-14");
  await expect(form.getByLabel("เลขที่เอกสาร/ใบสำคัญ")).toHaveValue("อว 0604.19/07242");
  expect((await (await page.request.get("/test-snapshot")).json()).rows).toHaveLength(0);
});
