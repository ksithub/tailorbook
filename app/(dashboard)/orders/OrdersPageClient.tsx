"use client";

import { FormField, StyledButton, StyledInput } from "@/components/layout/FormField";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Package, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OrderDto = {
  id: string;
  tokenNo: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  status: string;
  priority: string;
  totalAmount: number;
  balanceAmount: number;
};

type OrdersPageResponse = {
  items: OrderDto[];
  totalCount: number;
};

const STATUSES = ["Booked", "Cutting", "Stitching", "Trial", "Alteration", "Ready", "Delivered", "Cancelled", "All"];

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

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "var(--color-red)",
  Express: "var(--gold)",
  Normal: "var(--text3)",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDayLocal(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function endOfDayLocal(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function defaultMonthStartToToday() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: toYmd(start), to: toYmd(today) };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function customerDisplay(o: OrderDto) {
  const phone = (o.customerPhone ?? "").trim();
  if (!phone) return o.customerName;
  return `${o.customerName} - ${phone}`;
}

export default function OrdersPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [{ from: initialFrom, to: initialTo }] = useState(defaultMonthStartToToday);

  const [activeStatus, setActiveStatus] = useState("Booked");
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);

  const [orderSearch, setOrderSearch] = useState("");
  const [debouncedOrderSearch, setDebouncedOrderSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedOrderSearch(orderSearch), 350);
    return () => clearTimeout(t);
  }, [orderSearch]);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [activeStatus, dateFrom, dateTo, debouncedOrderSearch]);

  // Hydrate filters from URL (so browser back keeps filters)
  useEffect(() => {
    const spStatus = searchParams.get("status");
    const spFrom = searchParams.get("from");
    const spTo = searchParams.get("to");
    const spQ = searchParams.get("q");
    const spPage = searchParams.get("page");

    if (spStatus && STATUSES.includes(spStatus) && spStatus !== activeStatus) setActiveStatus(spStatus);
    if (spFrom && spFrom !== dateFrom) setDateFrom(spFrom);
    if (spTo && spTo !== dateTo) setDateTo(spTo);
    if (spQ != null && spQ !== orderSearch) setOrderSearch(spQ);
    if (spPage) {
      const n = Number(spPage);
      if (Number.isFinite(n) && n >= 1 && n !== page) setPage(Math.floor(n));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Persist filters to URL (so navigation back restores them)
  useEffect(() => {
    const qp = new URLSearchParams();
    if (activeStatus !== "Booked") qp.set("status", activeStatus);
    if (dateFrom) qp.set("from", dateFrom);
    if (dateTo) qp.set("to", dateTo);
    const q = debouncedOrderSearch.trim();
    if (q) qp.set("q", q);
    if (page !== 1) qp.set("page", String(page));

    const next = qp.toString();
    const cur = searchParams.toString();
    if (next !== cur) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [activeStatus, dateFrom, dateTo, debouncedOrderSearch, page, pathname, router, searchParams]);

  const { fromInstant, toInstant } = useMemo(() => {
    const a = startOfDayLocal(dateFrom);
    const b = endOfDayLocal(dateTo);
    if (a.getTime() <= b.getTime()) return { fromInstant: a, toInstant: b };
    return { fromInstant: startOfDayLocal(dateTo), toInstant: endOfDayLocal(dateFrom) };
  }, [dateFrom, dateTo]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", activeStatus, fromInstant.toISOString(), toInstant.toISOString(), debouncedOrderSearch, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        pageSize,
        from: fromInstant.toISOString(),
        to: toInstant.toISOString(),
      };
      if (activeStatus !== "All") params.status = activeStatus;
      const s = debouncedOrderSearch.trim();
      if (s) params.search = s;

      const res = await api.get("/api/orders", { params });
      return res.data as OrdersPageResponse;
    },
    staleTime: 20_000,
    retry: 1,
  });

  const orders = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { pageTotalSum, pageBalanceSum } = useMemo(() => {
    let t = 0;
    let b = 0;
    for (const o of orders) {
      t += Number(o.totalAmount) || 0;
      b += Number(o.balanceAmount) || 0;
    }
    return { pageTotalSum: t, pageBalanceSum: b };
  }, [orders]);

  const todayYmd = useMemo(() => toYmd(new Date()), []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="From date">
          <StyledInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </FormField>
        <FormField label="To date">
          <StyledInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </FormField>
        <div className="relative min-w-[240px] flex-1">
          <Search size={13} className="absolute left-3 top-1/2 z-[1] -translate-y-1/2" style={{ color: "var(--text3)" }} />
          <StyledInput
            placeholder="Search order number, customer name, or phone…"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <StyledButton
          type="button"
          variant="ghost"
          onClick={() => {
            const d = defaultMonthStartToToday();
            setDateFrom(d.from);
            setDateTo(d.to);
            setOrderSearch("");
            setDebouncedOrderSearch("");
            setActiveStatus("Booked");
            setPage(1);
          }}
        >
          Reset filters
        </StyledButton>
      </div>

      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-[12px]"
          style={{ background: "rgba(224,85,85,0.08)", borderColor: "rgba(224,85,85,0.25)", color: "var(--color-red)" }}
        >
          {(error as Error).message || "Failed to load orders."}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const isActive = s === activeStatus;
          const color = STATUS_COLORS[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setActiveStatus(s)}
              className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
              style={{
                background: isActive ? (color ? `${color}22` : "var(--gold-dim)") : "var(--surface)",
                color: isActive ? (color ?? "var(--gold)") : "var(--text2)",
                border: `1px solid ${isActive ? (color ?? "var(--gold)") : "var(--border)"}`,
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {isLoading ? (
          <p className="px-5 py-8 text-[12px]" style={{ color: "var(--text3)" }}>
            Loading…
          </p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <Package size={28} style={{ color: "var(--text3)" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
              No {activeStatus !== "All" ? activeStatus.toLowerCase() : ""} orders in this range
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Order #", "Customer", "Order date", "Delivery date", "Priority", "Status", "Total", "Balance", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-semibold uppercase tracking-wide ${h === "Balance" || h === "Total" ? "text-right" : "text-left"}`}
                      style={{ color: "var(--text3)", fontSize: "9px" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const isOverdue = o.deliveryDate.slice(0, 10) < todayYmd && !["Delivered", "Cancelled"].includes(o.status);
                  const statusColor = STATUS_COLORS[o.status] ?? "var(--text3)";
                  return (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/orders/${o.id}`)}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom: i < orders.length - 1 ? "1px solid var(--border)" : undefined,
                        background: isOverdue ? "rgba(224,85,85,0.04)" : undefined,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = isOverdue ? "rgba(224,85,85,0.04)" : "transparent";
                      }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold" style={{ color: "var(--gold)" }}>
                          #{o.tokenNo}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                        <span className="line-clamp-2">{customerDisplay(o)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3" style={{ color: "var(--text2)" }}>
                        {formatDateTime(o.orderDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span style={{ color: isOverdue ? "var(--color-red)" : "var(--text2)" }}>
                          {formatDateTime(o.deliveryDate)}
                          {isOverdue && " ⚠"}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: PRIORITY_COLORS[o.priority] ?? "var(--text3)", fontSize: "10px" }}>
                        {o.priority}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${statusColor}22`, color: statusColor }}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "var(--text)" }}>
                        {formatInr(o.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
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
              <tfoot>
                <tr style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <td colSpan={6} className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }} />
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text)" }}>
                    {formatInr(pageTotalSum)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span style={{ color: pageBalanceSum > 0 ? "var(--color-red)" : "var(--color-green)" }}>{formatInr(pageBalanceSum)}</span>
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          {isLoading ? "Loading…" : `${total} order${total !== 1 ? "s" : ""}`}
          {activeStatus !== "All" ? ` · ${activeStatus}` : ""}
          {` · page ${page} / ${totalPages}`}
        </p>
        <div className="flex items-center gap-2">
          <StyledButton type="button" variant="ghost" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </StyledButton>
          <StyledButton type="button" variant="ghost" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
            Next
          </StyledButton>
        </div>
      </div>
    </div>
  );
}

