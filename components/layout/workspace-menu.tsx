"use client";

import { useRef } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { getCurrentNavigationHref, getVisibleNavigation } from "@/components/layout/navigation";
import type { AppRole } from "@/features/auth/types";

export function WorkspaceMenu({
  pathname,
  roles,
}: {
  pathname: string;
  roles: readonly AppRole[];
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const items = getVisibleNavigation(roles);
  const currentHref = getCurrentNavigationHref(pathname, items);

  function closeMenu() {
    const details = detailsRef.current;
    if (!details) return;
    details.open = false;
    details.querySelector("summary")?.focus();
  }

  return (
    <details
      className="workspace-menu"
      ref={detailsRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeMenu();
        }
      }}
    >
      <summary>
        <Menu size={17} aria-hidden="true" />
        <span>เมนูทั้งหมด</span>
      </summary>
      <nav className="workspace-menu-panel" aria-label="เมนูทั้งหมด">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            onClick={closeMenu}
            aria-current={href === currentHref ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </details>
  );
}
