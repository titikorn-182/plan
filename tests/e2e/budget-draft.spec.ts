import { expect, test, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { signedInLocalClient, TEST_PASSWORD } from "./local-api";

async function readVisibleFormValues(form: Locator) {
  return form
    .locator('select, textarea, input:not([type="hidden"]):not([type="file"])')
    .evaluateAll((controls) =>
      controls.map((control, index) => {
        if (
          !(control instanceof HTMLInputElement) &&
          !(control instanceof HTMLSelectElement) &&
          !(control instanceof HTMLTextAreaElement)
        ) {
          throw new Error("Expected a form control");
        }
        return {
          field: control.id || control.name || String(index),
          value: control.value,
          checked: control instanceof HTMLInputElement ? control.checked : undefined,
        };
      }),
    );
}

test("budget draft retains entered values after errors and repeated saves without creating duplicates", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  // The local staff fixture only owns TEST-A, which is not a workbook organization.
  // Use the ordinary admin login and RLS API for the seeded SEC-ADMIN organization.
  const client = await signedInLocalClient("admin");
  const owner = `Budget draft E2E ${crypto.randomUUID()}`;
  const activityName = "โครงการผลิตบัณฑิตระดับปริญญาตรี คณะรัฐศาสตร์";
  const subOrganizationName = "สำนักงานเลขานุการ-งานสารบรรณและธุรการ";
  const subActivityName = `กิจกรรมย่อย ${crypto.randomUUID()}`;
  const expenseSubActivityName = `กิจกรรมค่าใช้จ่าย ${crypto.randomUUID()}`;
  try {
    await page.goto("/login");
    await page.getByLabel("อีเมลสถาบัน").fill("admin@example.test");
    await page.locator("#login-password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/budget-requests/new");

    const form = page.locator("form.budget-request-form");
    const save = form.getByRole("button", { name: "บันทึกฉบับร่าง", exact: true });
    const status = form.getByRole("status").first();
    const requestId = form.locator('input[name="budgetRequestId"]');
    const version = form.locator('input[name="version"]');

    await form.getByLabel("ชื่อหน่วยงานย่อย").selectOption(subOrganizationName);
    await expect(form.getByLabel("รหัสหน่วยงานย่อย")).toHaveValue("2301");
    await form.getByLabel("ประเภทโครงการ").selectOption("2 โครงการประจำตามภารกิจ");
    await form.getByLabel("รหัสโครงการ/กิจกรรม = กิจกรรม (12 หลัก)").selectOption("100210230001");
    await expect(form.getByLabel("รหัสผลผลิต/โครงการ =งาน/โครงการ (4 หลัก)")).toHaveValue("1002");
    await expect(form.getByLabel("ชื่อผลผลิต = งาน/โครงการ (4 หลัก)")).toHaveValue(
      "ผู้สำเร็จการศึกษาด้านสังคมศาสตร์",
    );
    await expect(form.getByLabel("รหัสแผนปฏิบัติการ = โครงการย่อย (8 หลัก)")).toHaveValue(
      "10021023",
    );
    await expect(form.getByLabel("ชื่อแผนปฏิบัติการ = โครงการย่อย (8 หลัก)")).toHaveValue(
      "แผนการผลิตบัณฑิตสาขาวิชารัฐประศาสนศาสตร์",
    );
    await expect(form.getByLabel("ชื่อโครงการกิจกรรม = กิจกรรม/โครงการ (12 หลัก)")).toHaveValue(
      activityName,
    );
    // Labels wrap their select options, so match the field heading rather than
    // another field's placeholder (e.g. "เลือกงบรายจ่ายก่อน").
    await form.getByLabel(/^งบรายจ่าย\s*\*/).selectOption("งบดำเนินงาน");
    await form.getByLabel(/^หมวดรายจ่าย\s*\*/).selectOption("ค่าตอบแทน");
    await form.getByLabel(/^หมวดรายจ่ายย่อย\s*\*/).selectOption("ค่าตอบแทนวิทยากร");
    await form.getByLabel("รายละเอียดรายการค่าใช้จ่าย").fill("ค่าตอบแทนวิทยากรทดสอบ");
    await form
      .getByLabel("ชื่อกิจกรรมย่อยภายใต้โครงการ 12 หลัก", { exact: true })
      .fill(subActivityName);
    await form.getByLabel("ชื่อกิจกรรมย่อย", { exact: true }).fill(expenseSubActivityName);
    await form.getByLabel("จำนวนเงิน (บาท)").fill("1000");
    await form.getByLabel("หลักการและเหตุผล").fill("เหตุผลประกอบการบันทึกฉบับร่างครั้งแรก");

    // One character satisfies native required validation but fails server min-length.
    // No DOM tampering or mocked Server Action is needed to exercise the real error path.
    await form.getByLabel(/^หัวหน้าโครงการ\s*\*/).fill("x");
    const invalidValues = await readVisibleFormValues(form);
    await save.click();
    await expect(status).toHaveText("กรุณาตรวจสอบข้อมูลที่ระบุ");
    await expect(form.getByText("กรุณาระบุหัวหน้าโครงการ", { exact: true })).toBeVisible();
    await expect(requestId).toHaveValue("");
    await expect.poll(() => readVisibleFormValues(form)).toEqual(invalidValues);
    await page.evaluate(() => window.scrollTo(0, 0));
    await testInfo.attach("budget-draft-validation-desktop", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await form.getByLabel(/^หัวหน้าโครงการ\s*\*/).fill(owner);
    const initialValues = await readVisibleFormValues(form);
    await save.click();
    await expect(status).toContainText("บันทึกฉบับร่าง");
    await expect(requestId).toHaveValue(/^[0-9a-f-]{36}$/i);
    const savedId = await requestId.inputValue();
    const firstVersion = Number(await version.inputValue());
    await expect.poll(() => readVisibleFormValues(form)).toEqual(initialValues);

    const revisedRationale = "เหตุผลฉบับแก้ไขสำหรับคำขอเดิม ไม่สร้างรายการใหม่";
    await form.getByLabel("หลักการและเหตุผล").fill(revisedRationale);
    const revisedValues = await readVisibleFormValues(form);
    await save.click();
    await expect(version).toHaveValue(String(firstVersion + 1));
    await expect(requestId).toHaveValue(savedId);
    await expect.poll(() => readVisibleFormValues(form)).toEqual(revisedValues);

    const { data: requests, error } = await client
      .from("budget_requests")
      .select("id,status,title_th,owner_name,rationale,requested_amount,proposal_details")
      .eq("owner_name", owner);
    expect(error).toBeNull();
    expect(requests).toHaveLength(1);
    expect(requests?.[0]).toMatchObject({
      id: savedId,
      status: "draft",
      title_th: activityName,
      owner_name: owner,
      rationale: revisedRationale,
      requested_amount: 1000,
      proposal_details: {
        organizationCode: "2301",
        organizationName: subOrganizationName,
        outputCode: "1002",
        operationalPlanCode: "10021023",
        activityCode: "100210230001",
      },
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(status).toContainText("บันทึกฉบับร่าง");
    await expect.poll(() => readVisibleFormValues(form)).toEqual(revisedValues);
    await testInfo.attach("budget-draft-saved-mobile", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/budget-requests");
    await expect(page.getByRole("columnheader").nth(1)).toHaveText("ชื่อหน่วยงานย่อย");
    await expect(page.getByRole("columnheader").nth(3)).toHaveText(
      "ชื่อกิจกรรมย่อยภายใต้โครงการ 12 หลัก",
    );
    const requestRow = page.locator("tbody tr").filter({
      has: page.locator(`a[href="/budget-requests/${savedId}/edit"]`),
    });
    await expect(requestRow.getByRole("cell").nth(1)).toHaveText(subOrganizationName);
    await expect(requestRow.getByRole("cell").nth(3)).toContainText(subActivityName);
    await expect(requestRow.getByRole("cell").nth(3)).toContainText(expenseSubActivityName);
    await page.getByRole("textbox", { name: "ค้นหาคำของบประมาณ" }).fill(subOrganizationName);
    await expect(requestRow).toBeVisible();
    await page.getByRole("textbox", { name: "ค้นหาคำของบประมาณ" }).fill(expenseSubActivityName);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(requestRow).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "ส่งออก CSV", exact: true }).click();
    const downloadPath = await (await downloadPromise).path();
    if (!downloadPath) throw new Error("Expected a local CSV download");
    const csv = await readFile(downloadPath, "utf8");
    expect(csv).toContain('"รหัสคำขอ","ชื่อหน่วยงานย่อย","ชื่อกิจกรรม/โครงการ"');
    expect(csv).toContain(`"${subOrganizationName}","${activityName}"`);
    expect(csv).toContain('"หน่วยงาน","ชื่อกิจกรรมย่อยภายใต้โครงการ 12 หลัก","หมวดงบ"');
    expect(csv).toContain(`${subActivityName}\n${expenseSubActivityName}`);
    await testInfo.attach("budget-register-subactivities-desktop", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const tableRegion = page.getByRole("region", { name: "ตารางคำของบประมาณ" });
    await expect(tableRegion).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await tableRegion.evaluate((element) => {
      const subActivityHeading = element.querySelector("th:nth-child(4)");
      if (subActivityHeading instanceof HTMLElement) {
        element.scrollLeft = subActivityHeading.offsetLeft;
      }
    });
    await testInfo.attach("budget-register-subactivities-mobile", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  } finally {
    await client.auth.signOut();
  }
});
