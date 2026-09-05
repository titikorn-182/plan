import {
  ChartNoAxesCombined,
  CircleCheck,
  FileText,
  FolderKanban,
  Target,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { DecisionRecord } from "@/features/dashboard/types";
import { formatThaiInteger } from "@/features/shared/formatters";

const STAGE_ICONS: Record<DecisionRecord["stage"], LucideIcon> = {
  คำของบ: FileText,
  โครงการ: FolderKanban,
  ดำเนินงาน: ChartNoAxesCombined,
  เบิกจ่าย: WalletCards,
  KPI: Target,
};

export function DecisionQueue({
  onSelect,
  records,
}: {
  onSelect: (record: DecisionRecord) => void;
  records: DecisionRecord[];
}) {
  return (
    <section className="cc-decision-strip" aria-labelledby="decision-heading">
      <div className="cc-section-heading">
        <div>
          <h1 id="decision-heading">รายการที่ต้องตัดสินใจ</h1>
          <span>{formatThaiInteger(records.length)}</span>
        </div>
        <Link href="/reports">ดูทั้งหมด</Link>
      </div>
      <div className="cc-queue">
        {records.slice(0, 6).map((record) => {
          const Icon = STAGE_ICONS[record.stage];
          return (
            <button
              type="button"
              className="cc-queue-item"
              key={`${record.uuid}-${record.stage}`}
              onClick={() => onSelect(record)}
            >
              <Icon size={21} aria-hidden="true" />
              <span>
                <strong>{record.state}</strong>
                <small>{record.unit}</small>
                <b>{record.amount}</b>
                <em>
                  {record.progress < 40
                    ? "ควรดำเนินการเร่งด่วน"
                    : `ความก้าวหน้า ${record.progress}%`}
                </em>
              </span>
            </button>
          );
        })}
        {records.length === 0 ? (
          <div className="cc-queue-empty">
            <CircleCheck size={22} />
            <span>
              <strong>ไม่มีรายการรอตัดสินใจ</strong>
              <small>รายการทั้งหมดอยู่ในสถานะปกติ</small>
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
