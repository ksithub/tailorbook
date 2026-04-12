"use client";

import { navSections } from "@/config/nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  onNavigate?: () => void;
  ordersBadge?: number;
};

export function SidebarNav({ onNavigate, ordersBadge }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navSections.map((group) => (
        <div key={group.section} className="mb-2">
          <p
            className="px-3 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[1.8px]"
            style={{ color: "var(--text3)" }}
          >
            {group.section}
          </p>
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const badge = item.label === "Orders" && ordersBadge ? ordersBadge : undefined;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-md border border-transparent px-3 py-[7px] text-[12.5px] font-normal transition-all duration-150"
                style={{
                  color: isActive ? "var(--gold)" : "var(--text2)",
                  background: isActive ? "var(--gold-dim)" : "transparent",
                  borderColor: isActive ? "rgba(232,168,74,0.2)" : "transparent",
                  fontWeight: isActive ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--text2)";
                  }
                }}
              >
                <Icon size={13} strokeWidth={1.8} className="flex-shrink-0 opacity-70" />
                <span className="flex-1 leading-none">{item.label}</span>
                {badge != null && (
                  <span
                    className="rounded-full px-[5px] py-[1px] text-[9px] font-semibold leading-none text-white"
                    style={{ background: "var(--color-red)" }}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
