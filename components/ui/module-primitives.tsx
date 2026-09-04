import type { ReactNode } from "react";

export function StatusPill({ tone, children }: { tone: "orange" | "red" | "green" | "gray" | "blue"; children: ReactNode }) {
  const tones = {
    orange: "border-orange-300 bg-orange-50 text-orange-800",
    red: "border-red-300 bg-red-50 text-red-700",
    green: "border-emerald-300 bg-emerald-50 text-emerald-800",
    gray: "border-stone-300 bg-stone-50 text-stone-700",
    blue: "border-sky-300 bg-sky-50 text-sky-800",
  };
  return <span className={`inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-semibold whitespace-nowrap ${tones[tone]}`}><span className="size-1.5 rounded-full bg-current" />{children}</span>;
}

export function RegisterSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border border-stone-200 bg-white">
      <header className="flex min-h-14 items-center justify-between gap-4 border-b border-stone-200 px-4 py-3 sm:px-5">
        <h2 className="text-base font-bold tracking-[-0.01em] sm:text-lg">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function ProgressBar({ value, tone = "orange" }: { value: number; tone?: "orange" | "green" | "red" }) {
  const tones = { orange: "bg-[#e84d0e]", green: "bg-emerald-600", red: "bg-red-600" };
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-stone-200" aria-label={`ความก้าวหน้า ${value} เปอร์เซ็นต์`}>
      <span className={`block h-full ${tones[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

