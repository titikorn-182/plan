import { expect, test, type Page } from "@playwright/test";
import { sourceA, sourceB } from "./fixtures";

const titleLabel = "ชื่อกิจกรรมย่อยภายใต้โครงการ 12 หลัก";
const selector = (page: Page) => page.getByRole("combobox", { name: titleLabel });
const confirmation = (page: Page) =>
  page.getByRole("region", { name: "ยืนยันเปลี่ยนคำของบอ้างอิง" });

async function snapshot(page: Page) {
  return page.locator("form").evaluate((form) => {
    const value = (name: string) =>
      (form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement).value;
    return {
      budgetRequestId: value("budgetRequestId"),
      title: value("title"),
      organizationId: value("organizationId"),
      fiscalYearId: value("fiscalYearId"),
      ownerName: value("ownerName"),
      startsOn: value("startsOn"),
      endsOn: value("endsOn"),
      details: JSON.parse(value("proposalDetails")),
    };
  });
}

async function chooseA(page: Page) {
  await selector(page).selectOption(sourceA.budgetRequestId);
  await expect(page.locator('[name="budgetRequestId"]')).toHaveValue(sourceA.budgetRequestId);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" || url.port !== "3217") {
      throw new Error(`Component test attempted an external request: ${url.origin}`);
    }
    await route.continue();
  });
  await page.goto("/");
  await expect(selector(page)).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => window.approvedBudgetTest.saves)).toEqual([]);
});

test("starts with the approved dropdown and useful source metadata", async ({ page }, testInfo) => {
  await expect(selector(page)).toHaveValue("");
  await expect(page.getByRole("textbox", { name: titleLabel })).toHaveCount(0);
  await expect(selector(page).locator("option")).toHaveText([
    "เลือกกิจกรรมจากคำของบที่อนุมัติแล้ว",
    `${sourceA.title} · ${sourceA.code} · 2570`,
    `${sourceB.title} · ${sourceB.code} · 2571`,
  ]);
  await expect(page.getByRole("button", { name: "กรอกเองโดยไม่อ้างอิงคำของบ" })).toBeVisible();
  expect(await page.evaluate(() => window.approvedBudgetTest.loads)).toEqual([]);
  await page.locator("#project-basics").screenshot({
    path: `.impeccable/review/approved-budget-${testInfo.project.name}-basics-default.png`,
    scale: "css",
    style: ".form-action-bar { visibility: hidden !important; }",
  });
});

test("fills shared fields in the real form and preserves the linked source metadata", async ({
  page,
}, testInfo) => {
  await chooseA(page);
  expect(await snapshot(page)).toMatchObject({
    budgetRequestId: sourceA.budgetRequestId,
    title: sourceA.title,
    organizationId: sourceA.organizationId,
    fiscalYearId: sourceA.fiscalYearId,
    ownerName: sourceA.ownerName,
    startsOn: sourceA.startsOn,
    endsOn: sourceA.endsOn,
    details: {
      characteristics: sourceA.details.characteristics,
      strategies: sourceA.details.strategies,
      responsiblePeople: sourceA.details.responsiblePeople,
      rationale: sourceA.details.rationale,
      objectives: sourceA.details.objectives,
      sdgs: sourceA.details.sdgs,
      expenseItems: sourceA.details.expenseItems,
    },
  });
  await expect(page.getByRole("combobox", { name: "หน่วยงานเจ้าของโครงการ" })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: /^ปีงบประมาณ/ })).toBeDisabled();
  await expect(page.getByRole("link", { name: sourceA.code, exact: true })).toHaveAttribute(
    "href",
    `/budget-requests/${sourceA.budgetRequestId}/edit`,
  );
  await expect(page.getByText(sourceA.warnings[0])).toBeVisible();
  await expect(page.getByRole("button", { name: "บันทึกฉบับร่าง" })).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `.impeccable/review/approved-budget-${testInfo.project.name}.png`,
    scale: "css",
  });
  const basics = page.locator("#project-basics");
  const viewport = page.viewportSize();
  if (testInfo.project.name === "desktop" && viewport) {
    const bounds = await basics.boundingBox();
    await page.setViewportSize({ ...viewport, height: Math.ceil(bounds!.height) + 200 });
    await basics.evaluate((element) => element.scrollIntoView({ block: "start" }));
  }
  await basics.screenshot({
    path: `.impeccable/review/approved-budget-${testInfo.project.name}-basics-prefilled.png`,
    scale: "css",
    style: ".form-action-bar { display: none !important; }",
  });
  if (viewport) await page.setViewportSize(viewport);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("cancels replacement without losing edits or fetching the second source", async ({
  page,
}, testInfo) => {
  await chooseA(page);
  await page.getByRole("textbox", { name: /^หัวหน้าโครงการ/ }).fill("ชื่อที่ผู้ใช้แก้ไขไว้");
  const before = await snapshot(page);
  await selector(page).selectOption(sourceB.budgetRequestId);
  await expect(confirmation(page)).toContainText(sourceB.code);
  await expect(page.getByRole("button", { name: "บันทึกฉบับร่าง" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "ส่งอนุมัติ", exact: true })).toBeDisabled();
  expect(await snapshot(page)).toEqual(before);
  expect(await page.evaluate(() => window.approvedBudgetTest.loads)).toEqual([
    sourceA.budgetRequestId,
  ]);
  await confirmation(page).screenshot({
    path: `.impeccable/review/approved-budget-${testInfo.project.name}-confirmation.png`,
    scale: "css",
    style: ".form-action-bar { visibility: hidden !important; }",
  });
  await page.getByRole("button", { name: "ใช้ข้อมูลเดิม", exact: true }).click();
  await expect(confirmation(page)).toHaveCount(0);
  await expect(selector(page)).toHaveValue(sourceA.budgetRequestId);
  expect(await snapshot(page)).toEqual(before);
});

test("keeps all previous fields until a confirmed source finishes loading", async ({ page }) => {
  await chooseA(page);
  const before = await snapshot(page);
  await page.evaluate(() => {
    window.approvedBudgetTest.holdNext = true;
  });
  await selector(page).selectOption(sourceB.budgetRequestId);
  await page.getByRole("button", { name: "ยืนยันใช้ข้อมูลคำขอนี้" }).click();
  await expect(page.getByText("กำลังโหลดข้อมูลคำของบ กรุณารอสักครู่")).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
  await expect(page.getByRole("textbox", { name: /^หัวหน้าโครงการ/ })).toBeDisabled();
  await expect(page.locator('[name="startsOn"]')).toBeDisabled();
  await expect(page.getByRole("button", { name: "บันทึกฉบับร่าง" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "ยกเลิกการโหลด" })).toBeEnabled();
  await page.evaluate(() => window.approvedBudgetTest.release?.());
  await expect(selector(page)).toHaveValue(sourceB.budgetRequestId);
  expect(await snapshot(page)).toMatchObject({
    budgetRequestId: sourceB.budgetRequestId,
    title: sourceB.title,
    organizationId: sourceB.organizationId,
    fiscalYearId: sourceB.fiscalYearId,
    ownerName: sourceB.ownerName,
    startsOn: sourceB.startsOn,
    endsOn: sourceB.endsOn,
    details: { objectives: sourceB.details.objectives, expenseItems: sourceB.details.expenseItems },
  });
});

for (const failure of ["returned", "thrown"] as const) {
  test(`${failure} loading failure retains edits and the original reference`, async ({ page }) => {
    await chooseA(page);
    await page.getByRole("textbox", { name: /^หัวหน้าโครงการ/ }).fill("ชื่อที่ต้องไม่หาย");
    const before = await snapshot(page);
    await page.evaluate((mode) => {
      window.approvedBudgetTest.failNext = mode === "returned";
      window.approvedBudgetTest.throwNext = mode === "thrown";
    }, failure);
    await selector(page).selectOption(sourceB.budgetRequestId);
    await page.getByRole("button", { name: "ยืนยันใช้ข้อมูลคำขอนี้" }).click();
    await expect(page.getByRole("alert")).toContainText(
      failure === "returned" ? "ไม่สามารถโหลดคำของบตัวอย่างได้" : "โหลดคำของบไม่สำเร็จ",
    );
    expect(await snapshot(page)).toEqual(before);
    await expect(selector(page)).toHaveValue(sourceA.budgetRequestId);
    await expect(page.getByRole("button", { name: "บันทึกฉบับร่าง" })).toBeEnabled();
  });
}

test("canceling a pending load ignores its late response", async ({ page }) => {
  await chooseA(page);
  const before = await snapshot(page);
  await page.evaluate(() => {
    window.approvedBudgetTest.holdNext = true;
  });
  await selector(page).selectOption(sourceB.budgetRequestId);
  await page.getByRole("button", { name: "ยืนยันใช้ข้อมูลคำขอนี้" }).click();
  await page.getByRole("button", { name: "ยกเลิกการโหลด" }).click();
  await page.getByRole("textbox", { name: /^หัวหน้าโครงการ/ }).fill("แก้ไขหลังยกเลิก");
  await page.evaluate(async () => {
    window.approvedBudgetTest.release?.();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  expect(await snapshot(page)).toEqual({ ...before, ownerName: "แก้ไขหลังยกเลิก" });
  await expect(selector(page)).toHaveValue(sourceA.budgetRequestId);
});

test("manual fallback retains imported fields after explicit unlink confirmation", async ({
  page,
}) => {
  await chooseA(page);
  const before = await snapshot(page);
  await page.getByRole("button", { name: "กรอกเองโดยไม่อ้างอิงคำของบ" }).click();
  await expect(confirmation(page)).toContainText("ข้อมูลที่กรอกไว้จะยังอยู่ทั้งหมด");
  await page.getByRole("button", { name: "ยืนยันยกเลิกการอ้างอิง" }).click();
  await expect(page.getByRole("textbox", { name: titleLabel })).toHaveValue(sourceA.title);
  expect(await snapshot(page)).toEqual({ ...before, budgetRequestId: "" });
  await expect(page.getByRole("combobox", { name: "หน่วยงานเจ้าของโครงการ" })).toBeEnabled();
  await expect(page.getByRole("combobox", { name: /^ปีงบประมาณ/ })).toBeEnabled();
});

test("first selection confirms before replacing manually entered data", async ({ page }) => {
  await page.getByRole("textbox", { name: /^หัวหน้าโครงการ/ }).fill("ผู้รับผิดชอบที่กรอกเอง");
  const before = await snapshot(page);
  await selector(page).selectOption(sourceA.budgetRequestId);
  await expect(confirmation(page)).toBeVisible();
  expect(await page.evaluate(() => window.approvedBudgetTest.loads)).toEqual([]);
  await page.getByRole("button", { name: "ใช้ข้อมูลเดิม", exact: true }).click();
  expect(await snapshot(page)).toEqual(before);
});

test("an empty approved list offers an editable manual fallback", async ({ page }) => {
  await page.goto("/?empty");
  await expect(
    page.getByText("ยังไม่มีคำของบที่อนุมัติแล้วในสิทธิ์ของคุณ", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "กรอกเองโดยไม่อ้างอิงคำของบ" }).click();
  await page.getByRole("textbox", { name: titleLabel }).fill("กิจกรรมที่สร้างขึ้นใหม่");
  await expect(page.getByRole("textbox", { name: titleLabel })).toHaveValue(
    "กิจกรรมที่สร้างขึ้นใหม่",
  );
  await expect(page.locator('[name="budgetRequestId"]')).toHaveValue("");
});

test("opening a linked draft keeps its edited title without refetching", async ({ page }) => {
  await page.goto("/?existing");
  await expect(page.getByRole("textbox", { name: titleLabel })).toHaveValue(
    "ชื่อกิจกรรมที่แก้ไขในฉบับร่าง",
  );
  await expect(page.locator('[name="budgetRequestId"]')).toHaveValue(sourceA.budgetRequestId);
  expect(await page.evaluate(() => window.approvedBudgetTest.loads)).toEqual([]);
  await page.getByRole("button", { name: "เลือกจากคำของบที่อนุมัติแล้ว" }).click();
  await selector(page).selectOption(sourceB.budgetRequestId);
  await expect(confirmation(page)).toBeVisible();
  await page.getByRole("button", { name: "ใช้ข้อมูลเดิม", exact: true }).click();
  expect((await snapshot(page)).title).toBe("ชื่อกิจกรรมที่แก้ไขในฉบับร่าง");
});
