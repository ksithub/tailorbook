"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderDto = {
  id: string; tokenNo: string; customerName: string; orderDate: string;
  deliveryDate: string; status: string; priority: string;
  totalAmount: number; balanceAmount: number;
};

const STATUSES = ["All", "Booked", "Cutting", "Stitching", "Trial", "Alteration", "Ready", "Delivered", "Cancelled"];
const STATUS_COLORS: Record<string, string> = {
  Booked: "var(--color-blue)", Cutting: "var(--color-purple)", Stitching: "var(--color-teal)",
  Trial: "var(--gold)", Alteration: "var(--color-red)", Ready: "var(--color-green)",
  Delivered: "var(--text3)", Cancelled: "var(--text3)",
};
const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "var(--color-red)", Express: "var(--gold)", Normal: "var(--text3)",
};

export default function OrdersPage() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["orders", activeStatus],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: 1, pageSize: 60 };
      if (activeStatus !== "All") params.status = activeStatus;
      return (await api.get("/api/orders", { params })).data as { items: OrderDto[]; total: number };
    },
  });

  const orders = data?.items ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const isActive = s === activeStatus;
          const color = STATUS_COLORS[s];
          return (
            <button key={s} type="button" onClick={() => setActiveStatus(s)}
              className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
              style={{
                background: isActive ? (color ? `${color}22` : "var(--gold-dim)") : "var(--surface)",
                color: isActive ? (color ?? "var(--gold)") : "var(--text2)",
                border: `1px solid ${isActive ? (color ?? "var(--gold)") : "var(--border)"}`,
              }}>
              {s}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {isLoading ? (
          <p className="px-5 py-8 text-[12px]" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <Package size={28} style={{ color: "var(--text3)" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
              No {activeStatus !== "All" ? activeStatus.toLowerCase() : ""} orders
            </p>
            <Link href="/orders/new" className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold"
              style={{ background: "var(--gold)", color: "var(--on-gold)" }}>
              <Plus size={12} /> Book first order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Token", "Customer", "Order date", "Due date", "Priority", "Status", "Total", "Balance", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text3)", fontSize: "9px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const isOverdue = o.deliveryDate.slice(0, 10) < today && !["Delivered", "Cancelled"].includes(o.status);
                  const statusColor = STATUS_COLORS[o.status] ?? "var(--text3)";
                  return (
                    <tr key={o.id}
                      onClick={() => router.push(`/orders/${o.id}`)}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom: i < orders.length - 1 ? "1px solid var(--border)" : undefined,
                        background: isOverdue ? "rgba(224,85,85,0.04)" : undefined,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isOverdue ? "rgba(224,85,85,0.04)" : "transparent"; }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold" style={{ color: "var(--gold)" }}>#{o.tokenNo}</span>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{o.customerName}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text2)" }}>
                        {new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: isOverdue ? "var(--color-red)" : "var(--text2)" }}>
                          {new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          {isOverdue && " ⚠"}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: PRIORITY_COLORS[o.priority] ?? "var(--text3)", fontSize: "10px" }}>
                        {o.priority}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ background: `${statusColor}22`, color: statusColor }}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text)" }}>{formatInr(o.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span style={{ color: o.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)", fontWeight: 500 }}>
                          {o.balanceAmount > 0 ? formatInr(o.balanceAmount) : "Paid"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={13} style={{ color: "var(--text3)" }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data && (
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          {data.total} order{data.total !== 1 ? "s" : ""}{activeStatus !== "All" ? ` · ${activeStatus}` : ""}
        </p>
      )}
    </div>
  );
}
