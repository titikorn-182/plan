"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileCheck2 } from "lucide-react";

export const evidenceLinks = [
  { href: "/evidence", label: "ทะเบียนหลักฐานและเอกสาร" },
  { href: "/evidence/budget-adjustment", label: "ขออนุมัติปรับงบประมาณ" },
];

export function EvidenceNavigation({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const active = pathname === "/evidence" || pathname.startsWith("/evidence/");
  return (
    <div
      className="evidence-navigation"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        className={active ? "active" : ""}
        aria-expanded={open}
        aria-controls="evidence-submenu"
        onClick={() => setOpen(!open)}
        title="หลักฐานและเอกสาร"
      >
        <FileCheck2 size={18} aria-hidden="true" />
        <span>หลักฐานและเอกสาร</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div id="evidence-submenu" className="evidence-submenu">
          {evidenceLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
