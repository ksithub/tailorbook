"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  CreditCard,
  Loader2,
  Package,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type DashboardDto = {
  todayOrders: number;
  pendingDelivery: number;
  todayRevenue: number;
  udharBalanceSum: number;
  overdueDeliveryCount?: number;
};

type OrderListDto = {
  id: string;
  tokenNo: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  status: string;
  balanceAmount: number;
  priority: string;
};

type KanbanColumnDto = {
  status: string;
  orders: OrderListDto[];
};

type CustomerDto = {
  id: string;
  name: string;
  phone: string;
  udharBalance: number;
};

type TailorDto = {
  id: string;
  name: string;
  skills: string;
  isActive: boolean;
};

type TailorWorkloadDto = {
  tailorId: string;
  activeOrderCount: number;
  activeItemQty: number;
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const STAT_LINKS: Record<string, string> = {
  "Today's Orders": "/orders",
  "Pending Delivery": "/delivery",
};

function isoDate(d: Date) {
  // yyyy-mm-dd for query params and <input type="date">
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStartIso(d: Date) {
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

const STATUS_LABELS: Record<string, string> = {
  Booked: "Booked",
  Cutting: "Cutting",
  Stitching: "Stitching",
  Trial: "Trial",
  Alteration: "Alteration",
  Ready: "Ready",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  Booked: "var(--color-blue)",
  Cutting: "var(--color-purple)",
  Stitching: "var(--color-teal)",
  Trial: "var(--gold)",
  Alteration: "var(--color-red)",
  Ready: "var(--color-green)",
  Delivered: "var(--text3)",
  Cancelled: "var(--text3)",
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "var(--text3)";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: `${color}22`, color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function BalancePill({ balance }: { balance: number }) {
  if (balance <= 0) {
    return (
      <span className="text-[10px]" style={{ color: "var(--color-green)" }}>
        Paid
      </span>
    );
  }
  return (
    <span className="text-[10px]" style={{ color: "var(--color-red)" }}>
      {formatInr(balance)}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
      {children}
    </h2>
  );
}

function Widget({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-4 ${className ?? ""}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardDto>({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/api/reports/dashboard")).data,
  });

  const { data: kanban } = useQuery<KanbanColumnDto[]>({
    queryKey: ["kanban-preview"],
    queryFn: async () => (await api.get("/api/orders/kanban")).data,
    staleTime: 30_000,
  });

  const { data: recentOrdersData } = useQuery({
    queryKey: ["orders-recent"],
    queryFn: async () => (await api.get("/api/orders?pageSize=5")).data as { items: OrderListDto[] },
    staleTime: 30_000,
  });

  const { data: tailors } = useQuery<TailorDto[]>({
    queryKey: ["tailors"],
    queryFn: async () => (await api.get("/api/tailors")).data,
    staleTime: 60_000,
  });

  const { data: tailorWorkload } = useQuery<TailorWorkloadDto[]>({
    queryKey: ["tailor-workload"],
    queryFn: async () => (await api.get("/api/tailors/workload")).data,
    staleTime: 30_000,
  });

  const { data: udharList } = useQuery<CustomerDto[]>({
    queryKey: ["udhar-list"],
    queryFn: async () => (await api.get("/api/udhar")).data,
    staleTime: 30_000,
  });

  const recentOrders = (recentOrdersData?.items ?? []).slice(0, 5);

  /* Kanban column order */
  const kanbanOrder = ["Booked", "Cutting", "Stitching", "Trial", "Alteration", "Ready"];
  const kanbanCols = kanbanOrder.map((status) => ({
    status,
    orders: (kanban ?? []).find((c) => c.status === status)?.orders ?? [],
  }));

  /* Tailor workload: compute rough pending from kanban */
  const activeTailors = (tailors ?? []).filter((t) => t.isActive).slice(0, 5);
  const workloadMap = useMemo(() => {
    const m = new Map<string, TailorWorkloadDto>();
    for (const w of tailorWorkload ?? []) m.set(w.tailorId, w);
    return m;
  }, [tailorWorkload]);
  const maxOrders = useMemo(() => {
    let max = 0;
    for (const t of activeTailors) {
      const w = workloadMap.get(t.id);
      max = Math.max(max, w?.activeOrderCount ?? 0);
    }
    return Math.max(1, max);
  }, [activeTailors, workloadMap]);

  /* Udhar top 5 */
  const top5Udhar = (udharList ?? []).slice(0, 5);

  /* ── Stat card data ── */
  const statCards = statsLoading || !stats
    ? null
    : [
        {
          label: "Today's Orders",
          value: stats.todayOrders,
          icon: ShoppingBag,
          sub: "New bookings today",
          color: "var(--gold)",
        },
        {
          label: "Pending Delivery",
          value: stats.pendingDelivery,
          icon: Package,
          sub: stats.overdueDeliveryCount != null
            ? `${stats.overdueDeliveryCount} overdue`
            : "Active orders",
          color: "var(--color-blue)",
          subColor: stats.overdueDeliveryCount ? "var(--color-red)" : undefined,
        },
        {
          label: "Today's Revenue",
          value: formatInr(stats.todayRevenue),
          icon: CreditCard,
          sub: "Payments collected",
          color: "var(--color-green)",
        },
        {
          label: "Orders Outstanding",
          value: formatInr(stats.udharBalanceSum),
          icon: BookOpen,
          sub: "Total outstanding orders",
          color: "var(--color-red)",
        },
      ];

  const statHref = (label: string) => {
    const now = new Date();
    const today = isoDate(now);
    if (label === "Today's Revenue") {
      return `/accounts/transaction-book?type=cash&from=${today}&to=${today}`;
    }
    if (label === "Orders Outstanding") {
      const from = monthStartIso(now);
      return `/orders?status=All&from=${from}&to=${today}`;
    }
    return STAT_LINKS[label];
  };

  return (
    <div className="space-y-4">

       {/* Kanban Preview */}
       <div>
        <div className="mb-0 flex items-center justify-between">
          <SectionTitle>Production Pipeline</SectionTitle>
          <Link href="/kanban" className="text-[11px] transition-colors" style={{ color: "var(--gold)" }}>
            View board →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {kanbanCols.map((col) => {
            const colColor = STATUS_COLORS[col.status] ?? "var(--text3)";
            return (
              <Widget key={col.status} className="px-2 py-2 min-h-[80px]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colColor }}>
                    {col.status}
                  </p>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: `${colColor}22`, color: colColor }}
                  >
                    {col.orders.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {col.orders.slice(0, 3).map((o) => {
                    const isUrgent = o.priority === "Urgent" || o.priority === "Express";
                    const orderDate = new Date(o.orderDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                    });
                    return (
                      <Link
                        key={o.id}
                        href={`/orders/${o.id}`}
                        className="block rounded-md border-l-2 px-2 py-1 transition-colors"
                        style={{
                          background: "var(--surface2)",
                          borderLeftColor: isUrgent ? "var(--color-red)" : "var(--border)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
                        }}
                        aria-label={`Open order #${o.tokenNo}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-semibold leading-tight" style={{ color: "var(--text)" }}>
                              #{o.tokenNo} <span style={{ color: "var(--text3)", fontWeight: 500 }}>· {orderDate}</span>
                            </p>
                            <p className="truncate text-[10px] font-medium leading-tight" style={{ color: "var(--text2)" }}>
                              {o.customerName} - {o.customerPhone}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[9px] font-semibold" style={{ color: o.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                              {o.balanceAmount > 0 ? formatInr(o.balanceAmount) : "Paid"}
                            </p>
                           {/*  <p className="text-[8px] leading-none" style={{ color: "var(--text3)" }}>
                              Balance
                            </p> */}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {col.orders.length > 3 && (
                    <p className="text-[9px]" style={{ color: "var(--text3)" }}>
                      +{col.orders.length - 3} more
                    </p>
                  )}
                </div>
              </Widget>
            );
          })}
        </div>
      </div>

{/* Stat Cards */}
<div>
        <SectionTitle>Overview</SectionTitle>
        {statsLoading ? (
          <div className="flex items-center gap-2 py-4" style={{ color: "var(--text3)" }}>
            <Loader2 size={14} className="animate-spin" />
            <span className="text-sm">Loading stats…</span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards?.map((s) => {
              const Icon = s.icon;
              const href = statHref(s.label);
              const CardInner = (
                <Widget
                  key={s.label}
                  className={`flex flex-col gap-1 px-4 py-2 ${href ? "cursor-pointer transition-colors" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-[11px]" style={{ color: "var(--text2)" }}>
                      {s.label}
                    </p>
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ background: `${s.color}1a`, color: s.color }}
                    >
                      <Icon size={13} />
                    </div>
                  </div>
                  <p className="text-[22px] font-semibold leading-none" style={{ color: "var(--text)" }}>
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-[10px]" style={{ color: s.subColor ?? "var(--text3)" }}>
                    {s.sub}
                  </p>
                </Widget>
              );
              return (
                href ? (
                  <Link
                    key={s.label}
                    href={href}
                    className="block rounded-xl focus:outline-none focus:ring-2"
                    style={{ outlineColor: "var(--gold)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget.firstChild as HTMLElement).style.borderColor = "var(--gold)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget.firstChild as HTMLElement).style.borderColor = "var(--border)";
                    }}
                    aria-label={`Open ${s.label}`}
                  >
                    {CardInner}
                  </Link>
                ) : (
                  CardInner
                )
              );
            })}
          </div>
        )}
      </div>

{/* Bottom grid: Recent Orders + right column */}
<div className="grid gap-4 xl:grid-cols-3">
        {/* Recent Orders */}
        <div className="xl:col-span-2">
          <div className="mb-0 px-2 flex items-center justify-between">
            <SectionTitle>Recent Orders</SectionTitle>
            <Link href="/orders" className="text-[11px]" style={{ color: "var(--gold)" }}>
              View all →
            </Link>
          </div>
          <Widget className="overflow-hidden px-2 py-2">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Token", "Customer", "Due", "Status", "Balance"].map((h) => (
                      <th
                        key={h}
                        className="px-2 py-2.5 text-left font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text3)", fontSize: "9px" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-[11px]" style={{ color: "var(--text3)" }}>
                        No orders yet
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o, i) => (
                      <tr
                        key={o.id}
                        style={{
                          borderBottom: i < recentOrders.length - 1 ? "1px solid var(--border)" : undefined,
                        }}
                      >
                        <td className="px-2 py-2.5">
                          <Link
                            href={`/orders/${o.id}`}
                            className="font-mono font-semibold underline-offset-2 hover:underline"
                            style={{ color: "var(--gold)" }}
                            aria-label={`Open order #${o.tokenNo}`}
                          >
                            #{o.tokenNo}
                          </Link>
                        </td>
                        <td className="px-2 py-2.5" style={{ color: "var(--text)" }}>
                          {o.customerName}
                        </td>
                        <td className="px-2 py-2.5" style={{ color: "var(--text2)" }}>
                          {new Date(o.deliveryDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </td>
                        <td className="px-2 py-2.5">
                          <StatusPill status={o.status} />
                        </td>
                        <td className="px-2 py-2.5">
                          <BalancePill balance={o.balanceAmount} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Widget>
        </div>

        {/* Right column: Tailors + Udhar */}
        <div className="space-y-4">
          

          {/* Udhar Top 5 */}
          {/* <div>
            <div className="mb-0 flex items-center justify-between">
              <SectionTitle>Ledger Book</SectionTitle>
              <Link href="/udhar" className="text-[11px]" style={{ color: "var(--gold)" }}>
                Full ledger →
              </Link>
            </div>
            <Widget>
              {top5Udhar.length === 0 ? (
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-green)" }}>
                  <CheckCircle size={13} />
                  All customers are clear!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {top5Udhar.map((c) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={11} style={{ color: "var(--color-red)", flexShrink: 0 }} />
                        <div>
                          <p className="text-[11px] font-medium leading-none" style={{ color: "var(--text)" }}>
                            {c.name}
                          </p>
                          <p className="mt-0.5 text-[9px] leading-none" style={{ color: "var(--text3)" }}>
                            {c.phone}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] font-semibold" style={{ color: "var(--color-red)" }}>
                        {formatInr(c.udharBalance)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {udharList && udharList.length > 5 && (
                <Link
                  href="/udhar"
                  className="mt-3 block text-center text-[10px]"
                  style={{ color: "var(--text3)" }}
                >
                  + {udharList.length - 5} more customers
                </Link>
              )}
            </Widget>
          </div> */}
          {/* Tailor Workload */}
          <div>
            <div className="mb-0 px-2 flex items-center justify-between">
              <SectionTitle>Tailor Workload</SectionTitle>
              <Link href="/jobs-card" className="text-[11px]" style={{ color: "var(--gold)" }}>
                Manage →
              </Link>
            </div>
            <Widget>
              {activeTailors.length === 0 ? (
                <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                  No tailors yet
                </p>
              ) : (
                <div className="space-y-3">
                  {activeTailors.map((t) => {
                    
                    const w = workloadMap.get(t.id);
                    const pending = w?.activeOrderCount ?? 0;
                    const itemsQty = w?.activeItemQty ?? 0;
                    const pct = Math.round((pending / maxOrders) * 100);
                    const barColor = pct >= 75 ? "var(--color-red)" : pct >= 50 ? "var(--gold)" : "var(--color-green)";
                    return (
                      <div key={t.id}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold"
                              style={{ background: "var(--gold-dim)", color: "var(--gold)" }}
                            >
                              {t.name[0]}
                            </div>
                            <p className="text-[11px] font-medium" style={{ color: "var(--text)" }}>
                              {t.name}
                            </p>
                          </div>
                          <p className="text-[9px]" style={{ color: "var(--text3)" }}>
                            {pending} orders · {itemsQty} pcs
                          </p>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}             
            </Widget>
          </div>
        </div>
      </div>

      {/* Quick Actions removed (header already provides primary actions) */}
    </div>
  );
}
