"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, Package, ShoppingBag, CreditCard, BookOpen } from "lucide-react";

type DashboardDto = {
  todayOrders: number;
  pendingDelivery: number;
  todayRevenue: number;
  udharBalanceSum: number;
};

export default function ReportsPage() {
  const { data, isLoading } = useQuery<DashboardDto>({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/api/reports/dashboard")).data,
  });

  const metrics = data
    ? [
        { label: "Today's Orders", value: data.todayOrders, icon: ShoppingBag, color: "var(--gold)" },
        { label: "Pending Delivery", value: data.pendingDelivery, icon: Package, color: "var(--color-blue)" },
        { label: "Today's Revenue", value: formatInr(data.todayRevenue), icon: CreditCard, color: "var(--color-green)" },
        { label: "Udhar Outstanding", value: formatInr(data.udharBalanceSum), icon: BookOpen, color: "var(--color-red)" },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <BarChart2 size={15} style={{ color: "var(--gold)" }} />
          <h2 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            Reports & Analytics
          </h2>
        </div>
        <p className="text-[12px]" style={{ color: "var(--text2)" }}>
          Key metrics for your shop. Advanced charts and date-range filters are coming soon.
        </p>
      </div>

      {isLoading ? (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="rounded-xl border p-4"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px]" style={{ color: "var(--text2)" }}>{m.label}</p>
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: `${m.color}1a`, color: m.color }}
                  >
                    <Icon size={13} />
                  </div>
                </div>
                <p className="text-[22px] font-semibold" style={{ color: "var(--text)" }}>{m.value}</p>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>
          Coming Soon
        </p>
        <ul className="mt-2 space-y-1">
          {[
            "Monthly revenue chart",
            "Order status distribution",
            "Top customers by revenue",
            "Tailor performance metrics",
            "GST report by period",
          ].map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text2)" }}>
              <span style={{ color: "var(--gold)" }}>·</span> {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
