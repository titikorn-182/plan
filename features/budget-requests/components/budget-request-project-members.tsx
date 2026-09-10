import { Plus, Trash2, Users } from "lucide-react";
import { FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import type { BudgetRequestState } from "@/features/budget-requests/actions";
import {
  MAX_BUDGET_REQUEST_PROJECT_MEMBERS,
  type BudgetRequestProjectMemberDraft,
} from "@/features/budget-requests/project-members";
import { INPUT_LIMITS } from "@/lib/config/limits";

export function BudgetRequestProjectMembers({
  errors,
  members,
  onAdd,
  onChange,
  onRemove,
}: {
  errors: BudgetRequestState["errors"];
  members: readonly BudgetRequestProjectMemberDraft[];
  onAdd: () => void;
  onChange: (id: number, changes: Partial<BudgetRequestProjectMemberDraft>) => void;
  onRemove: (id: number) => void;
}) {
  const completedMembers = members.filter((member) => member.name.trim()).length;

  return (
    <div className="mt-2 border-t border-stone-200 pt-5 md:col-span-2">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-orange-100 text-orange-800">
            <Users size={18} aria-hidden="true" />
          </span>
          <span>
            <h3 className="text-sm font-bold text-stone-950">ผู้รับผิดชอบโครงการ</h3>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              เพิ่มรายชื่อผู้ร่วมรับผิดชอบโครงการได้หลายคน
            </p>
          </span>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 border border-orange-300 bg-white px-4 py-2 text-sm font-bold text-orange-800 hover:border-[#ee4f16] hover:bg-[#fff3ea] disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
          type="button"
          onClick={onAdd}
          disabled={members.length >= MAX_BUDGET_REQUEST_PROJECT_MEMBERS}
        >
          <Plus size={17} aria-hidden="true" /> เพิ่มผู้รับผิดชอบโครงการ
        </button>
      </div>

      <p className="mb-3 text-xs font-semibold tabular-nums text-stone-600" aria-live="polite">
        ระบุแล้ว {completedMembers} คน
      </p>
      <FieldError errors={errors?.["proposalDetails.projectMembers"]} />

      <div className="space-y-3">
        {members.map((member, index) => {
          const prefix = `proposalDetails.projectMembers.${index}`;
          const nameErrorId = `project-member-${index}-name-error`;
          const positionErrorId = `project-member-${index}-position-error`;
          return (
            <fieldset className="border border-stone-200 bg-stone-50/60 p-4" key={member.id}>
              <legend className="px-2 text-xs font-bold text-stone-700">
                ผู้รับผิดชอบคนที่ {index + 1}
              </legend>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]">
                <label>
                  <FieldLabel required>ชื่อ-นามสกุล</FieldLabel>
                  <input
                    className={fieldClass}
                    value={member.name}
                    onChange={(event) => onChange(member.id, { name: event.target.value })}
                    maxLength={INPUT_LIMITS.personName}
                    placeholder="กรอกชื่อ-นามสกุล"
                    aria-invalid={Boolean(errors?.[`${prefix}.name`]?.length)}
                    aria-describedby={errors?.[`${prefix}.name`]?.length ? nameErrorId : undefined}
                  />
                  <FieldError errors={errors?.[`${prefix}.name`]} id={nameErrorId} />
                </label>
                <label>
                  <FieldLabel>ตำแหน่ง</FieldLabel>
                  <input
                    className={fieldClass}
                    value={member.position}
                    onChange={(event) => onChange(member.id, { position: event.target.value })}
                    maxLength={INPUT_LIMITS.title}
                    placeholder="ระบุตำแหน่งหรือหน้าที่ในโครงการ"
                    aria-invalid={Boolean(errors?.[`${prefix}.position`]?.length)}
                    aria-describedby={
                      errors?.[`${prefix}.position`]?.length ? positionErrorId : undefined
                    }
                  />
                  <FieldError errors={errors?.[`${prefix}.position`]} id={positionErrorId} />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    className="inline-flex h-11 w-11 items-center justify-center border border-stone-300 bg-white text-stone-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    onClick={() => onRemove(member.id)}
                    disabled={members.length === 1}
                    aria-label={`ลบผู้รับผิดชอบโครงการคนที่ ${index + 1}`}
                    title={
                      members.length === 1 ? "ต้องมีช่องผู้รับผิดชอบอย่างน้อย 1 รายการ" : "ลบรายการ"
                    }
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
