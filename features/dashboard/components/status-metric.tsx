import type { CommandCenterStatus } from "@/features/dashboard/types";
import { COMMAND_CENTER_STATUS_META } from "@/features/dashboard/presentation";
import { formatPercent } from "@/features/shared/formatters";

export function StatusDot({ status }: { status: CommandCenterStatus }) {
  const meta = COMMAND_CENTER_STATUS_META[status];
  return (
    <span
      className={`cc-status-dot ${meta.className}`}
      title={meta.label}
      aria-label={meta.label}
    />
  );
}

export function ProgressMetric({
  value,
  target,
  status,
}: {
  value: number;
  target: number;
  status: CommandCenterStatus;
}) {
  const variance = value - target;
  return (
    <div className="cc-metric-cell">
      <div>
        <strong>{formatPercent(value)}</strong>
        <StatusDot status={status} />
      </div>
      <small className={variance >= 0 ? "positive" : "negative"}>
        {variance >= 0 ? "ตามแผน" : "ต่ำกว่าแผน"} ({variance >= 0 ? "+" : ""}
        {formatPercent(variance)})
      </small>
    </div>
  );
}
