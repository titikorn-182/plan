import { Check, ShieldCheck } from "lucide-react";

export function BudgetRequestReadiness() {
  return (
    <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
      <header className="border-b border-stone-200 px-4 py-3">
        <h2 className="text-sm font-bold">ความพร้อมก่อนส่ง</h2>
      </header>
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 text-emerald-600" size={19} />
          <span>
            <b className="block text-xs">ข้อมูลบังคับ</b>
            <small className="text-[11px] text-stone-500">กรอกแล้ว 18 จาก 20 จุด</small>
          </span>
        </div>
        <div className="h-1.5 bg-stone-200">
          <div className="h-full w-[90%] bg-emerald-600" />
        </div>
        <ul className="space-y-2 text-xs text-stone-600">
          <li className="flex gap-2">
            <Check size={15} className="text-emerald-600" /> ระบุหน่วยงานและผู้รับผิดชอบ
          </li>
          <li className="flex gap-2">
            <Check size={15} className="text-emerald-600" /> ผูกยุทธศาสตร์และแผนงาน
          </li>
          <li className="flex gap-2">
            <Check size={15} className="text-emerald-600" /> งบประมาณรวมสมดุล
          </li>
          <li className="flex gap-2 text-orange-700">
            <span className="font-bold">!</span> รอตรวจเอกสารแนบ 1 จุด
          </li>
        </ul>
      </div>
    </aside>
  );
}
