import { INPUT_LIMITS } from "@/lib/config/limits";

export const MAX_BUDGET_REQUEST_PROJECT_MEMBERS = 50;

export type BudgetRequestProjectMember = {
  name: string;
  position: string;
};

export type BudgetRequestProjectMemberDraft = BudgetRequestProjectMember & {
  id: number;
};

type ProjectMembersParseResult =
  | { success: true; data: BudgetRequestProjectMember[] }
  | { success: false; errors: Record<string, string[]> };

export function createEmptyBudgetRequestProjectMember(id: number): BudgetRequestProjectMemberDraft {
  return { id, name: "", position: "" };
}

export function toBudgetRequestProjectMembers(
  members: readonly BudgetRequestProjectMemberDraft[],
): BudgetRequestProjectMember[] {
  return members
    .map((member) => ({ name: member.name.trim(), position: member.position.trim() }))
    .filter((member) => member.name || member.position);
}

export function parseBudgetRequestProjectMembers(input: unknown): ProjectMembersParseResult {
  if (input === undefined || input === null) return { success: true, data: [] };
  if (!Array.isArray(input) || input.length > MAX_BUDGET_REQUEST_PROJECT_MEMBERS) {
    return {
      success: false,
      errors: {
        "proposalDetails.projectMembers": [
          `ผู้รับผิดชอบโครงการต้องมีไม่เกิน ${MAX_BUDGET_REQUEST_PROJECT_MEMBERS} รายการ`,
        ],
      },
    };
  }

  const data: BudgetRequestProjectMember[] = [];
  const errors: Record<string, string[]> = {};
  input.forEach((raw, index) => {
    const prefix = `proposalDetails.projectMembers.${index}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors[prefix] = ["ข้อมูลผู้รับผิดชอบโครงการไม่ถูกต้อง"];
      return;
    }
    const source = raw as Record<string, unknown>;
    if (typeof source.name !== "string" || typeof source.position !== "string") {
      errors[prefix] = ["ชื่อและตำแหน่งผู้รับผิดชอบโครงการต้องเป็นข้อความ"];
      return;
    }
    const member = { name: source.name.trim(), position: source.position.trim() };
    if (member.name.length > INPUT_LIMITS.personName) {
      errors[`${prefix}.name`] = [
        `ชื่อผู้รับผิดชอบโครงการต้องไม่เกิน ${INPUT_LIMITS.personName.toLocaleString("th-TH")} ตัวอักษร`,
      ];
    }
    if (member.position.length > INPUT_LIMITS.title) {
      errors[`${prefix}.position`] = [
        `ตำแหน่งผู้รับผิดชอบโครงการต้องไม่เกิน ${INPUT_LIMITS.title.toLocaleString("th-TH")} ตัวอักษร`,
      ];
    }
    data.push(member);
  });
  return Object.keys(errors).length > 0 ? { success: false, errors } : { success: true, data };
}

export function validateBudgetRequestProjectMembersForSubmission(
  members: readonly BudgetRequestProjectMember[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  members.forEach((member, index) => {
    if (member.name.length < 2) {
      errors[`proposalDetails.projectMembers.${index}.name`] = [
        "กรุณาระบุชื่อ-นามสกุลผู้รับผิดชอบโครงการ",
      ];
    }
  });
  return errors;
}
