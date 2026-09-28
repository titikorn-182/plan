import { expect, test } from "@playwright/test";
import { sourceA } from "./fixtures";
import { parseProjectProposalDetails } from "../../features/projects/proposal-details";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:3217") throw new Error("Unexpected external request");
    await route.continue();
  });
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "ชื่อกิจกรรมย่อยภายใต้โครงการ 12 หลัก" })
    .selectOption(sourceA.budgetRequestId);
  await page.getByRole("textbox", { name: /^หัวหน้าโครงการ/ }).fill("ชื่อที่กรอกเพิ่มต้องไม่หาย");
  await page
    .getByRole("textbox", { name: /^หลักการและเหตุผล/ })
    .fill("เหตุผลที่กรอกเพิ่มหลังเลือกคำของบ");
});

for (const category of ["ค่าครุภัณฑ์", "ค่าสาธารณูปโภค"]) {
  test(`selects and serializes ${category} when saving a draft`, async ({ page }, info) => {
    const select = page.getByRole("combobox", { name: "หมวดค่าใช้จ่ายรายการที่ 1", exact: true });
    await expect(select.locator("option")).toHaveText([
      "ค่าตอบแทน",
      "ค่าใช้สอย",
      "ค่าวัสดุ",
      "ค่าครุภัณฑ์",
      "ค่าสาธารณูปโภค",
    ]);
    await select.selectOption(category);
    await expect(select).toHaveValue(category);
    await select.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `.impeccable/review/project-expense-${category}-${info.project.name}.png`,
    });
    // Only isolate category serialization here; the fixture does not fill every required field.
    await page.locator("form").evaluate((form) => {
      if (form instanceof HTMLFormElement) form.noValidate = true;
    });
    await page.getByRole("button", { name: "บันทึกฉบับร่าง" }).click();
    await expect(
      page.getByRole("link", { name: "เปิดฉบับร่างที่บันทึกไว้เพื่อทำงานต่อ" }),
    ).toBeVisible();
    const saved = await page.evaluate(() => window.approvedBudgetTest.saves[0]);
    const parsed = parseProjectProposalDetails(saved.proposalDetails);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("Expected saved proposal details");
    expect(parsed.data.expenseItems[0].category).toBe(category);
    await expect(select).toHaveValue(category);
  });
}

for (const failure of ["returned", "thrown"] as const) {
  test(`${failure} save failure retains the complete proposal and allows retry`, async ({
    page,
  }, info) => {
    const before = await page.locator('[name="proposalDetails"]').inputValue();
    await page.evaluate((mode) => {
      window.approvedBudgetTest.saveFailure = mode;
    }, failure);
    // Isolate server-error handling; required-field validation is covered separately.
    await page.locator("form").evaluate((form) => {
      if (form instanceof HTMLFormElement) form.noValidate = true;
    });
    await page.getByRole("button", { name: "บันทึกฉบับร่าง" }).click();
    await expect(page.locator('form > p[role="status"]')).toContainText(
      failure === "returned" ? "บันทึกไม่สำเร็จ" : "ยังยืนยันผลการบันทึกไม่ได้",
    );
    await expect(page.locator('[name="proposalDetails"]')).toHaveValue(before);
    await expect(page.locator('[name="ownerName"]')).toHaveValue("ชื่อที่กรอกเพิ่มต้องไม่หาย");
    await expect(page.locator('[name="budgetRequestId"]')).toHaveValue(sourceA.budgetRequestId);
    expect(await page.evaluate(() => window.approvedBudgetTest.loads)).toEqual([
      sourceA.budgetRequestId,
    ]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `.impeccable/review/project-save-${failure}-${info.project.name}.png`,
    });
    await page.evaluate(() => {
      window.approvedBudgetTest.saveFailure = "none";
    });
    await page.getByRole("button", { name: "บันทึกฉบับร่าง" }).click();
    await expect(
      page.getByRole("link", { name: "เปิดฉบับร่างที่บันทึกไว้เพื่อทำงานต่อ" }),
    ).toHaveAttribute("href", "/projects/93bb7a9a-40e8-4bb1-b3fd-f604146609af/edit");
    await expect(page.locator('[name="proposalDetails"]')).toHaveValue(before);
    const saves = await page.evaluate(() => window.approvedBudgetTest.saves);
    expect(saves).toHaveLength(2);
    expect(saves[1].proposalDetails).toBe(before);
    expect(saves[1].intent).toBe("save");
    expect(saves[1].fiscalYearId).toBe(sourceA.fiscalYearId);
  });
}

test("native reset cannot erase edits and successful submit locks the form", async ({ page }) => {
  const before = await page.locator('[name="proposalDetails"]').inputValue();
  await page.locator("form").evaluate((form) => {
    if (form instanceof HTMLFormElement) {
      form.reset();
      form.noValidate = true;
    }
  });
  await expect(page.locator('[name="proposalDetails"]')).toHaveValue(before);
  await expect(page.locator('[name="ownerName"]')).toHaveValue("ชื่อที่กรอกเพิ่มต้องไม่หาย");
  await page.getByRole("button", { name: "ส่งอนุมัติ", exact: true }).click();
  await expect(page.getByRole("link", { name: "เปิดข้อเสนอโครงการที่ส่งแล้ว" })).toBeVisible();
  await expect(page.locator('[name="ownerName"]')).toBeDisabled();
  await expect(page.getByRole("button", { name: "ส่งอนุมัติ", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.approvedBudgetTest.saves[0].intent)).toBe("submit");
});
