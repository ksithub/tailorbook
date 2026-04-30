"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { createKanbanConnection } from "@/lib/signalr";
import { useAuthStore } from "@/stores/auth-store";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MessageCircle, Phone, RefreshCw, Zap } from "lucide-react";
import { StyledSelect } from "@/components/layout/FormField";
import { useRouter } from "next/navigation";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type OrderDto = {
  id: string;
  tokenNo: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  itemCount: number;
  itemLines: string[];
  priority: string;
  status: string;
  totalAmount: number;
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
  Trial: "Alteration",
  Alteration: "Ready",
  /* Ready: "Delivered", */
};
const PREV_STATUS: Record<string, string> = {
  Cutting: "Booked",
  Stitching: "Cutting",
  Trial: "Stitching",
  Alteration: "Trial",
  Ready: "Alteration",
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
  const shopName = useAuthStore((s) => s.user?.companyName) ?? "Shop";
  const shopPhone = null;
  const [movingId, setMovingId] = useState<string | null>(null);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["kanban"],
    queryFn: async () => (await api.get("/api/orders/kanban")).data as KanbanColumn[],
    refetchInterval: 60_000,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/api/orders/${id}/status`, { status, notes: null, force: true });
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
    let disposed = false;
    let started = false;
    (async () => {
      try {
        await conn.start();
        started = true;
        if (disposed) return;
        await conn.invoke("JoinCompanyGroup", companyId);
      } catch (e) {
        // In dev this can happen during fast refresh, or when API/hub is down or URL is misconfigured.
        // We keep the page usable without realtime updates.
        console.warn("Kanban realtime connection failed (ignored).", e);
      }
    })();
    return () => {
      disposed = true;
      if (started) void conn.stop();
    };
  }, [companyId, qc]);

  const columns = COLUMNS.map((status) => ({
    status,
    orders: (data ?? []).find((c) => c.status === status)?.orders ?? [],
  }));

  const today = new Date().toISOString().slice(0, 10);
  const totalActive = columns.reduce((s, c) => s + c.orders.length, 0);
  const cardsMaxH = "calc(100vh - 230px)";

  function telDigits(phone: string) {
    return String(phone ?? "").replace(/\D/g, "");
  }

  function waUrlFor(o: OrderDto, fromStatus?: string, toStatus?: string) {
    const msg = buildWhatsAppMessage({
      tokenNo: o.tokenNo,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      itemLines: o.itemLines ?? [],
      fromStatus,
      toStatus,
      shopName,
      shopPhone,
      totalAmount: o.totalAmount,
      dueAmount: o.balanceAmount,
    });
    return buildWhatsAppUrl(o.customerPhone, msg);
  }

  function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
    month: "2-digit",
    year: "numeric",
    /* hour: "2-digit", */
    /* minute: "2-digit", */
    /* hour12: true, */
    });
  }

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
            
            <div  key={col.status} className="flex w-[210px] flex-shrink-0 flex-col">
              {/* Column header */}
              <div
                className="mb-2 flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: `var(--gold-soft)`, marginRight: "0.25rem" }}
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
              <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: cardsMaxH }}>
                {col.orders.length === 0 && (
                  <div
                    className="rounded-lg border border-dashed px-3 py-4 text-center text-[10px]"
                    style={{ borderColor: "var(--border)", color: "var(--text3)" }}
                  >
                    No orders
                  </div>
                )}
                {col.orders.map((o) => {
                  const isUrgent = o.priority === "Urgent" || o.priority === "Express";
                  const isOverdue = o.deliveryDate.slice(0, 10) < today;
                  const nextStatus = NEXT_STATUS[col.status];
                  const prevStatus = PREV_STATUS[col.status];
                  const isMoving = movingId === o.id;
                  const callDigits = telDigits(o.customerPhone);
                  const wa = waUrlFor(o, undefined, o.status);

                  return (
                    <div
                      key={o.id}
                      onClick={() => router.push(`/orders/${o.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/orders/${o.id}`);
                        }
                      }}
                      className="cursor-pointer rounded-xl border-l-2 px-3 py-2 text-left transition-shadow focus:outline-none focus:ring-2"
                      style={{
                        background: isUrgent ? "var(--gold-soft)" : "var(--surface)",
                        borderLeftColor: isUrgent ? "var(--gold)" : color,
                        outline: `1px solid var(--border)`,
                        border: isUrgent ? `1px solid var(--gold)` : `1px solid ${color}`,
                      }}
                    >
                      {/* Order + date */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-[10px] font-semibold leading-none" style={{ color: "var(--gold)" }}>
                            #{o.tokenNo} · {fmtDateTime(o.orderDate)}
                          </p>
                          <p className="mt-1 text-[11px] font-medium leading-tight" style={{ color: "var(--text)" }}>
                            {o.customerName} - {o.customerPhone}
                          </p>
                        {/*   <p className="mt-0.5 text-[9px]" style={{ color: "var(--text3)" }}>
                            
                          </p> */}
                        </div>
                        <div className="flex items-center gap-1">
                          {isUrgent && <Zap size={10} style={{ color: "var(--gold)" }} />}                          
                        </div>
                      </div>

                      {/* Due date */}
                     {/*  <div className="mt-1.5 flex items-center gap-1">
                        <CalendarDays size={9} style={{ color: isOverdue ? "var(--color-red)" : "var(--text3)" }} />
                        <p className="text-[9px]" style={{ color: isOverdue ? "var(--color-red)" : "var(--text3)" }}>
                          {new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          {isOverdue && " (overdue)"}
                        </p>
                      </div> */}

                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-[9px]" style={{ color: "var(--text3)" }}>
                          Items: <span style={{ color: "var(--text2)", fontWeight: 600 }}>{o.itemCount ?? 0}</span>
                        </p>
                        {o.balanceAmount > 0 
                        ? (
                          <p className="text-[9px]" style={{ color: "var(--color-red)" }}>
                            Due {formatInr(o.balanceAmount)}
                          </p>
                        ) : (
                          <p className="text-[9px]" style={{ color: "var(--color-green)" }}>
                            Paid 
                          </p>
                        )}

                      </div>

                      {/* Move buttons */}
                      <div className="mt-1 border-t pt-1" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!prevStatus || isMoving}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!prevStatus) return;
                            setMovingId(o.id);
                            moveMutation.mutate({ id: o.id, status: prevStatus });
                            // Notify template for the target status
                            const url = waUrlFor(o, col.status, prevStatus);
                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                          }}
                           className="rounded-md mt-1 py-1 text-[9px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                          style={{ background: `${color}22`, color, border: `1px solid ${color}33` }}
                        >
                          {isMoving ? "…" : (<span className="inline-flex items-center justify-center gap-1"><ChevronLeft size={12} /> Prev</span>)}
                        </button>
                        <button
                          type="button"
                          disabled={!nextStatus || isMoving}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!nextStatus) return;
                            setMovingId(o.id);
                            moveMutation.mutate({ id: o.id, status: nextStatus });
                            const url = waUrlFor(o, col.status, nextStatus);
                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          className="rounded-md py-1 text-[9px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                          style={{ background: `${color}22`, color, border: `1px solid ${color}33` }}
                        >
                          {isMoving ? "…" : (<span className="inline-flex items-center justify-center gap-1">Next <ChevronRight size={12} /></span>)}
                        </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {callDigits && (
                              <a
                                href={`tel:${callDigits}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex h-6 w-6 items-center justify-center rounded-md border"
                                style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text2)" }}
                                title="Call"
                                aria-label="Call"
                              >
                                <Phone size={13} />
                              </a>
                            )}
                            {wa && (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex h-6 w-6 items-center justify-center rounded-md border"
                                style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text2)" }}
                                title="WhatsApp"
                                aria-label="WhatsApp"
                              >
                                <MessageCircle size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
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
