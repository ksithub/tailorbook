"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuthStore } from "@/stores/auth-store";
import { LogOut, Menu, Plus, Scissors, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function getPageTitle(pathname: string): { title: string; subtitle: string } {
  const map: Record<string, { title: string; subtitle: string }> = {
    "/dashboard": { title: "Dashboard", subtitle: "Overview of shop" },
    "/orders": { title: "Orders", subtitle: "Manage bookings & status" },
    "/orders/new": { title: "New Order", subtitle: "Book a new order" },
    "/customers": { title: "Customers", subtitle: "Customer profiles & measurements" },
    "/measurements": { title: "Measurements", subtitle: "Templates & recorded sizes" },
    "/jobs-card": { title: "Jobs Card", subtitle: "Job cards & production tracking" },
    "/kanban": { title: "Production Board", subtitle: "Production workflow" },
    "/tailors": { title: "Tailors", subtitle: "Staff & workload" },
    "/alterations": { title: "Alterations", subtitle: "Alteration requests" },
    "/billing": { title: "Billing & GST", subtitle: "Invoices & tax" },
    "/payments": { title: "Payments", subtitle: "Daily collections" },
    "/udhar": { title: "Credit Ledger (Legacy)", subtitle: "Superseded by Account Ledger" },
    "/designs": { title: "Design Catalog", subtitle: "Saved design references" },
    "/fabric": { title: "Fabric Stock", subtitle: "Inventory tracking" },
    "/reports": { title: "Reports", subtitle: "Analytics & summaries" },
    "/delivery": { title: "Delivery", subtitle: "Pending & overdue deliveries" },
    "/settings": { title: "Settings", subtitle: "Company & configuration" },
    "/accounts/ledger": { title: "Account Ledger", subtitle: "Dr / Cr entries by account or customer" },
    "/accounts/receipts": { title: "Receipt Book", subtitle: "Inward receipts" },
    "/accounts/payments": { title: "Payment Book", subtitle: "Payments & refunds" },
    "/accounts/transaction-book": { title: "Transaction Book", subtitle: "Cash & bank books with running balance" },
    "/accounts/outstanding": { title: "Outstanding", subtitle: "Customer-wise receivable balances" },
  };
  const base = "/" + (pathname.split("/")[1] ?? "");
  const segment = "/" + pathname.split("/").slice(1, 3).join("/");
  return map[segment] ?? map[base] ?? { title: "Tailor Book", subtitle: "" };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, accessToken } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const t = accessToken ?? (typeof window !== "undefined" ? localStorage.getItem("tb_access") : null);
    if (!t) router.replace("/login");
  }, [accessToken, router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const { title, subtitle } = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden w-[200px] flex-shrink-0 flex-col border-r lg:flex"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div
            className="flex h-7 w-7 items-center justify-center rounded"
            style={{ background: "var(--gold-dim)" }}
          >
            <Scissors size={13} style={{ color: "var(--gold)" }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-none" style={{ color: "var(--gold)" }}>
              TailorBook
            </p>
            <p className="mt-0.5 max-w-[130px] truncate text-[9px] leading-none" style={{ color: "var(--text3)" }}>
              {user?.companyName ?? "Shop"}
            </p>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <SidebarNav />
        </div>

        {/* User + Logout */}
        <div className="px-3 pb-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          
          <div className="mb-2 flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{ background: "var(--gold-dim)", color: "var(--gold)" }}
            >
              {(user?.fullName ?? user?.email ?? "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="max-w-[130px] truncate text-[11px] font-medium leading-none" style={{ color: "var(--text)" }}>
                {user?.fullName ?? user?.email ?? "User"}
              </p>
              <p className="mt-0.5 text-[9px] capitalize leading-none" style={{ color: "var(--text3)" }}>
                {user?.role?.toLowerCase() ?? "staff"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition-colors"
            style={{ color: "var(--text3)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-red)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text3)"; }}
            onClick={() => { logout(); router.push("/login"); }}
          >
            <LogOut size={11} />
            Sign out
          </button>
          <ThemeToggle className="mt-3 mb-3" />
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[220px] flex-col border-r transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--surface)", borderColor: "var(--border)", display: "flex" }}
      >
        <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Scissors size={14} style={{ color: "var(--gold)" }} />
            <p className="text-[13px] font-semibold" style={{ color: "var(--gold)" }}>
              Tailor Book
            </p>
          </div>
          <button type="button" onClick={() => setDrawerOpen(false)} style={{ color: "var(--text3)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <SidebarNav onNavigate={() => setDrawerOpen(false)} />
        </div>
        <div className="px-3 pb-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <ThemeToggle className="mb-3" />
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px]"
            style={{ color: "var(--text3)" }}
            onClick={() => { logout(); router.push("/login"); }}
          >
            <LogOut size={11} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-5 py-3"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1 lg:hidden"
              style={{ color: "var(--text2)" }}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-[15px] font-semibold leading-none" style={{ color: "var(--text)" }}>
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 text-[11px] leading-none" style={{ color: "var(--text3)" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--gold)", color: "var(--on-gold)" }}
          >
            <Plus size={12} strokeWidth={2.5} />
            New Order
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
