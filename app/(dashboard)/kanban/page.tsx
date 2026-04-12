"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { createKanbanConnection } from "@/lib/signalr";
import { useAuthStore } from "@/stores/auth-store";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarDays, RefreshCw, Zap } from "lucide-react";
import { StyledSelect } from "@/components/layout/FormField";

type OrderDto = {
  id: string;
  tokenNo: string;
  customerName: string;
  deliveryDate: string;
  priority: string;
  status: string;
  balanceAmount: number;
};

type KanbanColumn = {
  status: string;
  orders: OrderDto[];
};

const COLUMNS = ["Booked", "Cutting", "Stitching", "Trial", "Alteration", "Ready"];
const NEXT_STATUS: Record<string, string> = {
  Booked: "Cutting",
  Cutting: "Stitching",
  Stitching: "Trial",
  Trial: "Ready",
  Alteration: "Stitching",
  Ready: "Delivered",
};

const COL_COLORS: Record<string, string> = {
  Booked: "var(--color-blue)",
  Cutting: "var(--color-purple)",
  Stitching: "var(--color-teal)",
  Trial: "var(--gold)",
  Alteration: "var(--color-red)",
  Ready: "var(--color-green)",
};

export default function KanbanPage() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.user?.companyId);
  const [movingId, setMovingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kanban"],
    queryFn: async () => (await api.get("/api/orders/kanban")).data as KanbanColumn[],
    refetchInterval: 60_000,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/api/orders/${id}/status`, { status, notes: null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kanban"] });
      setMovingId(null);
    },
    onError: () => setMovingId(null),
  });

  useEffect(() => {
    if (!companyId) return;
    const conn = createKanbanConnection();
    conn.on("OrderStatusChanged", () => qc.invalidateQueries({ queryKey: ["kanban"] }));
    conn.on("NewOrderBooked", () => qc.invalidateQueries({ queryKey: ["kanban"] }));
    void conn.start().then(() => conn.invoke("JoinCompanyGroup", companyId));
    return () => { void conn.stop(); };
  }, [companyId, qc]);

  const columns = COLUMNS.map((status) => ({
    status,
    orders: (data ?? []).find((c) => c.status === status)?.orders ?? [],
  }));

  const today = new Date().toISOString().slice(0, 10);
  const totalActive = columns.reduce((s, c) => s + c.orders.length, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4">
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          {isLoading ? "Loading…" : `${totalActive} active order${totalActive !== 1 ? "s" : ""} in production`}
        </p>
        <button
          type="button"
          className="flex items-center gap-1 text-[11px]"
          style={{ color: "var(--text3)" }}
          onClick={() => qc.invalidateQueries({ queryKey: ["kanban"] })}
        >
          <RefreshCw size={10} /> Refresh
        </button>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => {
          const color = COL_COLORS[col.status];
          return (
            <div key={col.status} className="flex w-[210px] flex-shrink-0 flex-col">
              {/* Column header */}
              <div
                className="mb-2 flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: `${color}18`, border: `1px solid ${color}33` }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px]" style={{ color }}>
                  {col.status}
                </p>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: `${color}33`, color }}
                >
                  {col.orders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {col.orders.length === 0 && (
                  <div
                    className="rounded-lg border border-dashed px-3 py-4 text-center text-[10px]"
                    style={{ borderColor: "var(--border)", color: "var(--text3)" }}
                  >
                    Empty
                  </div>
                )}
                {col.orders.map((o) => {
                  const isUrgent = o.priority === "Urgent" || o.priority === "Express";
                  const isOverdue = o.deliveryDate.slice(0, 10) < today;
                  const nextStatus = NEXT_STATUS[col.status];
                  const isMoving = movingId === o.id;

                  return (
                    <div
                      key={o.id}
                      className="rounded-xl border-l-2 p-3 transition-shadow"
                      style={{
                        background: "var(--surface)",
                        borderLeftColor: isUrgent ? "var(--color-red)" : color,
                        outline: `1px solid var(--border)`,
                      }}
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-mono text-[10px] font-semibold" style={{ color: "var(--gold)" }}>
                          #{o.tokenNo}
                        </span>
                        {isUrgent && (
                          <Zap size={9} style={{ color: "var(--color-red)", flexShrink: 0 }} />
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium leading-tight" style={{ color: "var(--text)" }}>
                        {o.customerName}
                      </p>

                      {/* Due date */}
                      <div className="mt-1.5 flex items-center gap-1">
                        <CalendarDays size={9} style={{ color: isOverdue ? "var(--color-red)" : "var(--text3)" }} />
                        <p className="text-[9px]" style={{ color: isOverdue ? "var(--color-red)" : "var(--text3)" }}>
                          {new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          {isOverdue && " (overdue)"}
                        </p>
                      </div>

                      {o.balanceAmount > 0 && (
                        <p className="mt-0.5 text-[9px]" style={{ color: "var(--color-red)" }}>
                          Due {formatInr(o.balanceAmount)}
                        </p>
                      )}

                      {/* Move button */}
                      {nextStatus && (
                        <button
                          type="button"
                          disabled={isMoving}
                          onClick={() => { setMovingId(o.id); moveMutation.mutate({ id: o.id, status: nextStatus }); }}
                          className="mt-2 w-full rounded-md py-1 text-[9px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: `${color}22`, color }}
                        >
                          {isMoving ? "Moving…" : `→ ${nextStatus}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
