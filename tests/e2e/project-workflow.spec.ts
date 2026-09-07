import { expect, test, type Browser, type Page } from "@playwright/test";
import { signedInLocalClient, TEST_PASSWORD } from "./local-api";

async function login(browser: Browser, role: "staff" | "user" | "executive" | "inactive") {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3206" });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("อีเมลสถาบัน").fill(`${role}@example.test`);
  await page.locator("#login-password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  if (role !== "inactive") await expect(page).toHaveURL("/");
  return { context, page };
}
async function approve(page: Page, title: string) {
  await page.goto("/approvals");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await card.getByRole("button", { name: "อนุมัติ", exact: true }).click();
  await expect(card.getByRole("button", { name: "อนุมัติ", exact: true })).toHaveCount(0);
}

test("staff creates, edits, submits; user reviews; executive approves; staff is notified", async ({
  browser,
}) => {
  const title = `โครงการ E2E ${crypto.randomUUID()}`;
  const revisedTitle = `${title} ฉบับแก้ไข`;
  const staff = await login(browser, "staff");
  const user = await login(browser, "user");
  const executive = await login(browser, "executive");
  try {
    await staff.page.goto("/projects/new");
    await staff.page.getByLabel("ชื่อโครงการ", { exact: false }).first().fill(title);
    await staff.page.getByLabel("วงเงินอนุมัติ (บาท)").fill("1000");
    await staff.page.getByLabel("วันเริ่มต้น").fill("2026-10-01");
    await staff.page.getByLabel("วันสิ้นสุด").fill("2027-09-30");
    await staff.page.getByRole("button", { name: "บันทึกฉบับร่าง", exact: true }).click();
    await expect(staff.page.getByRole("status")).toContainText("บันทึกฉบับร่าง");
    await staff.page.getByLabel("ชื่อโครงการ", { exact: false }).first().fill(revisedTitle);
    await staff.page.getByRole("button", { name: "ส่งอนุมัติ", exact: true }).click();
    await expect(staff.page.getByRole("status")).toContainText("เข้าสู่ workflow แล้ว");
    await approve(user.page, revisedTitle);
    await approve(executive.page, revisedTitle);

    // Verify persisted state through the real API using the owner's RLS permissions,
    // not a service-role bypass. The config guard only allows the local test API.
    const client = await signedInLocalClient("staff");
    const { data: project, error } = await client
      .from("projects")
      .select("id,status,title_th")
      .eq("title_th", revisedTitle)
      .single();
    expect(error).toBeNull();
    expect(project?.status).toBe("active");
    const { data: notifications, error: notificationError } = await client
      .from("notifications")
      .select("title")
      .eq("entity_id", project!.id);
    expect(notificationError).toBeNull();
    expect(notifications?.some((item) => item.title.startsWith("อนุมัติแล้ว"))).toBe(true);
    await staff.page.goto(`/projects/${project!.id}/edit`);
    await expect(staff.page.getByLabel("ชื่อโครงการ", { exact: false }).first()).toBeDisabled();
    await client.auth.signOut();
  } finally {
    await Promise.all([staff.context.close(), user.context.close(), executive.context.close()]);
  }
});

test("inactive account cannot enter the workspace", async ({ browser }) => {
  const account = await login(browser, "inactive");
  try {
    await expect(account.page.getByRole("alert")).toContainText("ถูกระงับ");
    await account.page.goto("/projects");
    await expect(account.page).toHaveURL(/\/login/);
  } finally {
    await account.context.close();
  }
});
