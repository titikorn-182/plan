import type { ReactNode } from "react";

export function BudgetRequestFormSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="border-b border-stone-200 pb-6 last:border-b-0 last:pb-0">
      <div className="mb-4 max-w-3xl">
        <h3 className="text-sm font-bold text-stone-950">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-stone-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
