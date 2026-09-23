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

test("budget draft retains full workbook data through validation, repeated saves, edit and submission", async ({
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
    await form.getByRole("button", { name: "เพิ่มรายการค่าใช้จ่าย", exact: true }).click();
    const secondExpense = form.getByRole("group", { name: "รายการที่ 2", exact: true });
    await secondExpense.getByLabel(/^งบรายจ่าย\s*\*/).selectOption("งบดำเนินงาน");
    await secondExpense.getByLabel(/^หมวดรายจ่าย\s*\*/).selectOption("ค่าตอบแทน");
    await secondExpense.getByLabel(/^หมวดรายจ่ายย่อย\s*\*/).selectOption("ค่าตอบแทนวิทยากร");
    await secondExpense.getByLabel("รายละเอียดรายการค่าใช้จ่าย").fill("ค่าตอบแทนวิทยากรรอบที่สอง");
    await secondExpense.getByLabel("จำนวนเงิน (บาท)").fill("250");
    await form
      .getByLabel("วัตถุประสงค์", { exact: true })
      .fill("พัฒนาทักษะนักศึกษาด้วยการเรียนรู้ร่วมกัน");
    await form.getByLabel("ประโยชน์ที่คาดว่าจะได้รับ").fill("นักศึกษานำความรู้ไปประยุกต์ใช้ได้");
    await form.getByLabel("กลุ่มเป้าหมาย").fill("นักศึกษาคณะรัฐศาสตร์จำนวน 20 คน");
    await form.getByLabel("วันที่เริ่ม", { exact: true }).fill("2026-11-01");
    await form.getByLabel("วันที่สิ้นสุด", { exact: true }).fill("2026-11-30");
    await form.getByLabel("ตำแหน่งหัวหน้าโครงการ", { exact: true }).fill("อาจารย์ผู้ประสานงาน");
    await form.getByRole("checkbox", { name: "SDG 4 การศึกษาที่มีคุณภาพ", exact: true }).check();
    await form.getByRole("checkbox", { name: "SDG 17 หุ้นส่วนเพื่อการพัฒนา", exact: true }).check();
    await form.getByLabel("คำอธิบายความเชื่อมโยง").fill("สนับสนุนการศึกษาและความร่วมมือกับชุมชน");
    const firstMember = form.getByRole("group", { name: "ผู้รับผิดชอบคนที่ 1", exact: true });
    await firstMember.getByLabel("ชื่อ-นามสกุล").fill("ผู้รับผิดชอบคนแรก");
    await firstMember.getByLabel("ตำแหน่ง", { exact: true }).fill("ผู้ประสานงาน");
    await form.getByRole("button", { name: "เพิ่มผู้รับผิดชอบโครงการ", exact: true }).click();
    const secondMember = form.getByRole("group", { name: "ผู้รับผิดชอบคนที่ 2", exact: true });
    await secondMember.getByLabel("ชื่อ-นามสกุล").fill("ผู้รับผิดชอบคนที่สอง");
    await secondMember.getByLabel("ตำแหน่ง", { exact: true }).fill("ผู้จัดกิจกรรม");
    const fiscalYearId = await form.locator('select[name="fiscalYearId"]').inputValue();
    const budgetCycleId = await form.locator('input[name="budgetCycleId"]').inputValue();

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
      .select(
        "id,code,version,status,title_th,owner_name,rationale,requested_amount,proposal_details,fiscal_year_id,budget_cycle_id,organization_id,created_at,created_by",
      )
      .eq("owner_name", owner);
    expect(error).toBeNull();
    expect(requests).toHaveLength(1);
    expect(requests?.[0]).toMatchObject({
      id: savedId,
      status: "draft",
      title_th: activityName,
      owner_name: owner,
      rationale: revisedRationale,
      requested_amount: 1250,
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

    // Open the real register link: edit must hydrate the same complete workbook,
    // not the old reduced form, and must update the original request in place.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await requestRow.locator(`a[href="/budget-requests/${savedId}/edit"]`).click();
    await expect(page).toHaveURL(`/budget-requests/${savedId}/edit`);
    await expect(
      form.getByRole("heading", { name: "แก้ไขคำของบประมาณจากข้อมูลโครงการ", exact: true }),
    ).toBeVisible();
    for (const heading of [
      "หน่วยงานและแหล่งงบประมาณ",
      "โครงสร้างแผนและกิจกรรม",
      "งบประมาณและรายละเอียดค่าใช้จ่าย",
      "เป้าหมาย เหตุผล และระยะเวลา",
      "ความเชื่อมโยงกับการพัฒนาที่ยั่งยืน (SDGs)",
      "หัวหน้าโครงการและผู้รับผิดชอบโครงการ",
    ]) {
      await expect(form.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    await expect(form.locator('input[type="file"]')).toHaveCount(0);
    await expect(requestId).toHaveValue(savedId);
    await expect(version).toHaveValue(String(firstVersion + 1));
    await expect(form.locator('select[name="fiscalYearId"]')).toHaveValue(fiscalYearId);
    await expect(form.locator('input[name="budgetCycleId"]')).toHaveValue(budgetCycleId);
    await expect.poll(() => readVisibleFormValues(form)).toEqual(revisedValues);
    await expect(form.getByText("1,250.00 บาท", { exact: true })).toBeVisible();
    await testInfo.attach("budget-edit-complete-workbook-desktop", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await form.getByLabel(/^หัวหน้าโครงการ\s*\*/).fill("x");
    const invalidEditValues = await readVisibleFormValues(form);
    await save.click();
    await expect(status).toHaveText("กรุณาตรวจสอบข้อมูลที่ระบุ");
    await expect(requestId).toHaveValue(savedId);
    await expect(version).toHaveValue(String(firstVersion + 1));
    await expect.poll(() => readVisibleFormValues(form)).toEqual(invalidEditValues);

    await form.getByLabel(/^หัวหน้าโครงการ\s*\*/).fill(owner);
    const editedRationale = "แก้ไขหลักการและเหตุผลจากทะเบียนโดยคงรายละเอียดเดิมทั้งหมด";
    await form.getByLabel("หลักการและเหตุผล").fill(editedRationale);
    const editedValues = await readVisibleFormValues(form);
    await save.click();
    await expect(status).toContainText("บันทึกฉบับร่าง");
    await expect(version).toHaveValue(String(firstVersion + 2));
    await expect(requestId).toHaveValue(savedId);
    await expect.poll(() => readVisibleFormValues(form)).toEqual(editedValues);

    const { data: editedRequests, error: editError } = await client
      .from("budget_requests")
      .select(
        "id,code,version,status,title_th,owner_name,rationale,requested_amount,proposal_details,fiscal_year_id,budget_cycle_id,organization_id,created_at,created_by",
      )
      .eq("owner_name", owner);
    expect(editError).toBeNull();
    expect(editedRequests).toEqual([
      { ...requests?.[0], version: firstVersion + 2, rationale: editedRationale },
    ]);

    await page.reload();
    await expect(requestId).toHaveValue(savedId);
    await expect(version).toHaveValue(String(firstVersion + 2));
    await expect.poll(() => readVisibleFormValues(form)).toEqual(editedValues);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await testInfo.attach("budget-edit-persisted-mobile", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await form.getByRole("button", { name: "ส่งคำขอ", exact: true }).click();
    // Revalidation may immediately replace the edit form with its read-only guard.
    await expect(
      page
        .getByText(/เข้าสู่กระบวนการตรวจสอบแล้ว|คำของบประมาณนี้ไม่อยู่ในสถานะที่แก้ไขได้/)
        .first(),
    ).toBeVisible();
    const { data: submittedRequests, error: submitError } = await client
      .from("budget_requests")
      .select("id,status,rationale,requested_amount,proposal_details")
      .eq("owner_name", owner);
    expect(submitError).toBeNull();
    expect(submittedRequests).toEqual([
      {
        id: savedId,
        status: "submitted",
        rationale: editedRationale,
        requested_amount: 1250,
        proposal_details: requests?.[0]?.proposal_details,
      },
    ]);
    await page.reload();
    await expect(
      page.getByText("คำของบประมาณนี้ไม่อยู่ในสถานะที่แก้ไขได้", { exact: true }),
    ).toBeVisible();
    await expect(form).toHaveCount(0);

    // Submitted requests must remain readable from the workflow even though
    // editing is forbidden. Resolve this request by its code, not a task UUID.
    const code = requests?.[0]?.code;
    if (!code) throw new Error("Expected the saved budget request code");
    await page.goto("/approvals");
    const approvalCard = page.getByRole("article").filter({ hasText: code });
    const detailsLink = approvalCard.getByRole("link", {
      name: /เปิดข้อมูลประกอบ|ตรวจรายละเอียดคำขอและวงเงิน/,
    });
    await expect(detailsLink).toHaveAttribute("href", `/budget-requests/${savedId}`);
    await detailsLink.click();
    await expect(page).toHaveURL(`/budget-requests/${savedId}`);
    const details = page.getByRole("region", { name: "รายละเอียดคำของบประมาณ", exact: true });
    await expect(details).toBeVisible();
    await expect(details).toContainText(code);
    await expect(details).toContainText(activityName);
    await expect(details).toContainText(subActivityName);
    await expect(details).toContainText(editedRationale);
    await expect(details).toContainText("1,250.00");
    await expect(details.locator("form, input, select, textarea")).toHaveCount(0);
    await expect(details.getByRole("button", { name: "อนุมัติ", exact: true })).toHaveCount(0);
    await testInfo.attach("workflow-budget-detail-mobile", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(details).toBeVisible();
    await testInfo.attach("workflow-budget-detail-desktop", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    await page.getByRole("link", { name: "กลับไป Workflow อนุมัติ", exact: true }).click();
    await expect(page).toHaveURL("/approvals");
    await expect(approvalCard).toBeVisible();
    const { data: inspectedRequest, error: inspectionError } = await client
      .from("budget_requests")
      .select("status,requested_amount")
      .eq("id", savedId)
      .single();
    expect(inspectionError).toBeNull();
    expect(inspectedRequest).toEqual({ status: "submitted", requested_amount: 1250 });
  } finally {
    await client.auth.signOut();
  }
});
