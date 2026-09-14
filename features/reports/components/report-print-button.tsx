"use client";

import { Printer } from "lucide-react";

export function ReportPrintButton() {
  return (
    <button
      className="print:hidden inline-flex min-h-10 items-center gap-2 bg-[#cf430c] px-4 text-sm font-semibold text-white"
      type="button"
      onClick={() => window.print()}
    >
      <Printer size={17} /> พิมพ์ / บันทึกเป็น PDF
    </button>
  );
}
