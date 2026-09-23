import { expect, test, type Page } from "@playwright/test";
import { detailedRequest, escapedText, legacyRequest, longToken } from "./fixtures";

const detail = (page: Page) =>
  page.getByRole("region", { name: "รายละเอียดคำของบประมาณ", exact: true });
let browserErrors: string[] = [];

async function expectContained(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" || url.port !== "3218") {
      browserErrors.push(`Component test attempted an external request: ${url.origin}`);
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.goto("/");
  await expect(detail(page)).toBeVisible();
});

test.afterEach(() => {
  expect(browserErrors).toEqual([]);
});

test("shows full saved details and expense metadata without editing controls", async ({
  page,
}, testInfo) => {
  const content = detail(page);
  for (const expected of [
    detailedRequest.code,
    detailedRequest.title,
    detailedRequest.ownerName,
    detailedRequest.submittedAt,
    detailedRequest.updatedAt,
    detailedRequest.proposalDetails.organizationName,
    detailedRequest.proposalDetails.subActivityName,
    detailedRequest.proposalDetails.expectedBenefits,
    ...detailedRequest.proposalDetails.sdgs,
    ...detailedRequest.proposalDetails.projectMembers.map((member) => member.name),
    "88,399.94",
    "58,399.94",
    "30,000.00",
    "เงินรายได้กิจกรรม",
    "เงินสนับสนุนการพัฒนานักศึกษา",
    "การอบรมเชิงปฏิบัติการผู้นำนักศึกษา",
  ]) {
    await expect(content).toContainText(expected);
  }
  await expect(content.locator("form, input, select, textarea, button")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await expectContained(page);
  await page.screenshot({
    path: `.impeccable/review/budget-detail-${testInfo.project.name}.png`,
    scale: "css",
  });
  await page.getByRole("heading", { name: "รายการค่าใช้จ่ายที่ 1" }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `.impeccable/review/budget-detail-${testInfo.project.name}-expenses.png`,
    scale: "css",
  });
});

test("provides safe return links and treats long HTML-like content as text", async ({ page }) => {
  const content = detail(page);
  await expect(content.getByRole("link", { name: "กลับไป Workflow อนุมัติ" })).toHaveAttribute(
    "href",
    "/approvals",
  );
  await expect(content.getByRole("link", { name: "ทะเบียนคำของบประมาณ" })).toHaveAttribute(
    "href",
    "/budget-requests",
  );
  await expect(content).toContainText(escapedText);
  await expect(content).toContainText(longToken);
  await expect(content.locator("img, script")).toHaveCount(0);
  expect(await page.locator("body").getAttribute("data-injected")).toBeNull();
  await expectContained(page);
});

test("shows legacy expense lines with their original quantities and unit prices", async ({
  page,
}) => {
  await page.goto("/?legacy");
  await expect(detail(page)).toContainText(legacyRequest.title);
  await expect(detail(page)).toContainText("กระดาษสำหรับกิจกรรมรูปแบบเดิม");
  await expect(detail(page)).toContainText("วัสดุสำนักงาน");
  await expect(detail(page)).toContainText("จำนวน 3 × อัตรา 300.00 บาท");
  await expect(detail(page)).toContainText("900.00 บาท");
  await expect(detail(page).getByText("เงินรายได้กิจกรรม", { exact: true })).toHaveCount(0);
  await expectContained(page);
});

test("explains missing expense lines without inventing data", async ({ page }) => {
  await page.goto("/?empty");
  await expect(detail(page)).toContainText("คำขอที่ยังไม่มีรายละเอียดค่าใช้จ่าย");
  await expect(detail(page)).toContainText(
    "คำขอนี้บันทึกวงเงินรวมไว้ โดยไม่มีรายการค่าใช้จ่ายแยกบรรทัด",
  );
  await expect(detail(page)).toContainText("0.00 บาท");
  await expect(detail(page)).toContainText("ไม่ได้ระบุเป้าหมาย SDG");
  await expect(detail(page)).toContainText("ไม่ได้ระบุผู้ร่วมรับผิดชอบเพิ่มเติม");
  await expect(detail(page).getByRole("heading", { name: /รายการค่าใช้จ่ายที่/ })).toHaveCount(0);
  await expectContained(page);
});
