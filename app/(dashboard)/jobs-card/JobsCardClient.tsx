"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Package, Printer } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TailorDto = { id: string; name: string; isActive: boolean };

type JobCardRowDto = {
  orderId: string;
  tokenNo: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  status: string;
  totalAmount: number;
  balanceAmount: number;
  itemCount: number;
  itemsSummary: string;
};

type JobCardStatusCountDto = { status: string; count: number };
type JobCardItemCountDto = { garmentType: string; quantity: number };
type JobCardsResponse = {
  items: JobCardRowDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  statusCounts: JobCardStatusCountDto[];
  itemCounts: JobCardItemCountDto[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function defaultMonthStartToToday() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const plus10 = new Date(today);
  plus10.setDate(plus10.getDate() + 10);
  return { from: toYmd(start), to: toYmd(plus10) };
}
function startOfDayLocal(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
function endOfDayLocal(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
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

async function openOrderJobCardPdf(orderId: string, tailorId?: string) {
  const urlPath = tailorId ? `/api/orders/${orderId}/jobcard/pdf?tailorId=${encodeURIComponent(tailorId)}` : `/api/orders/${orderId}/jobcard/pdf`;
  const res = await api.get(urlPath, { responseType: "blob" });
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const ALL_STATUSES = ["Booked", "Cutting", "Stitching", "Trial", "Alteration", "Ready", "Delivered", "Cancelled"] as const;
type Status = (typeof ALL_STATUSES)[number];

const DEFAULT_STATUSES: Status[] = ["Booked", "Cutting", "Stitching", "Trial", "Alteration", "Ready"];

export default function JobsCardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [{ from: initialFrom, to: initialTo }] = useState(defaultMonthStartToToday);

  const [tailorId, setTailorId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>(DEFAULT_STATUSES);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Hydrate filters from URL (so browser back keeps filters)
  useEffect(() => {
    const spTailorId = searchParams.get("tailorId");
    const spFrom = searchParams.get("from");
    const spTo = searchParams.get("to");
    const spStatuses = searchParams.get("statuses");
    const spPage = searchParams.get("page");

    if (spTailorId && spTailorId !== tailorId) setTailorId(spTailorId);
    if (spFrom && spFrom !== dateFrom) setDateFrom(spFrom);
    if (spTo && spTo !== dateTo) setDateTo(spTo);
    if (spStatuses) {
      const parsed = spStatuses
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s): s is Status => (ALL_STATUSES as readonly string[]).includes(s));
      if (parsed.length > 0) setSelectedStatuses(parsed);
    }
    if (spPage) {
      const n = Number(spPage);
      if (Number.isFinite(n) && n >= 1 && n !== page) setPage(Math.floor(n));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Persist filters to URL (so navigation back restores them)
  useEffect(() => {
    const qp = new URLSearchParams();
    if (tailorId !== "all") qp.set("tailorId", tailorId);
    if (dateFrom) qp.set("from", dateFrom);
    if (dateTo) qp.set("to", dateTo);
    qp.set("statuses", selectedStatuses.join(","));
    if (page !== 1) qp.set("page", String(page));

    const next = qp.toString();
    const cur = searchParams.toString();
    if (next !== cur) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [tailorId, dateFrom, dateTo, selectedStatuses, page, pathname, router, searchParams]);

  const { data: tailors } = useQuery({
    queryKey: ["tailors"],
    queryFn: async () => (await api.get("/api/tailors")).data as TailorDto[],
    staleTime: 60_000,
  });

  const activeTailors = (tailors ?? []).filter((t) => t.isActive);

  const { fromInstant, toInstant } = useMemo(() => {
    const a = startOfDayLocal(dateFrom);
    const b = endOfDayLocal(dateTo);
    if (a.getTime() <= b.getTime()) return { fromInstant: a, toInstant: b };
    return { fromInstant: startOfDayLocal(dateTo), toInstant: endOfDayLocal(dateFrom) };
  }, [dateFrom, dateTo]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["jobcards", tailorId, fromInstant.toISOString(), toInstant.toISOString(), selectedStatuses.join(","), page, pageSize],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        from: fromInstant.toISOString(),
        to: toInstant.toISOString(),
        page,
        pageSize,
      };
      if (tailorId !== "all") params.tailorId = tailororIdToGuidOrThrow(tailorId);
      params.statuses = selectedStatuses.join(",");
      const res = await api.get("/api/orders/jobcards", { params });
      return res.data as JobCardsResponse;
    },
    staleTime: 15_000,
    retry: 1,
  });

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const statusCounts = data?.statusCounts ?? [];
  const itemCounts = data?.itemCounts ?? [];

  const selectedSet = useMemo(() => new Set<string>(selectedStatuses), [selectedStatuses]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Tailor">
          <StyledSelect
            value={tailorId}
            onChange={(e) => {
              setTailorId(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All</option>
            {activeTailors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </StyledSelect>
        </FormField>

        <FormField label="Delivery From">
          <StyledInput
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
        </FormField>
        <FormField label="Delivery To">
          <StyledInput
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </FormField>

        <FormField label="Status">
          <div className="relative">
            <button
              type="button"
              className="h-[40px] min-w-[220px] rounded-lg border px-3 text-left text-[12px]"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
              onClick={() => setStatusMenuOpen((v) => !v)}
            >
              {selectedStatuses.length === ALL_STATUSES.length ? "All statuses" : `${selectedStatuses.length} selected`}
            </button>
            {statusMenuOpen && (
              <div
                className="absolute right-0 top-[44px] z-20 w-[260px] rounded-xl border p-2 shadow-lg"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <button
                    type="button"
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text2)" }}
                    onClick={() => {
                      setSelectedStatuses(DEFAULT_STATUSES);
                      setPage(1);
                    }}
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text2)" }}
                    onClick={() => {
                      setSelectedStatuses([...ALL_STATUSES]);
                      setPage(1);
                    }}
                  >
                    Select all
                  </button>
                </div>
                <div className="my-2 border-t" style={{ borderColor: "var(--border)" }} />
                <div className="max-h-[260px] overflow-y-auto">
                  {ALL_STATUSES.map((s) => {
                    const checked = selectedSet.has(s);
                    return (
                      <label key={s} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]" style={{ color: "var(--text)" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? Array.from(new Set([...selectedStatuses, s]))
                              : selectedStatuses.filter((x) => x !== s);
                            setSelectedStatuses(next.length > 0 ? next : DEFAULT_STATUSES);
                            setPage(1);
                          }}
                        />
                        {s}
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-end px-1">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                    onClick={() => setStatusMenuOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </FormField>

        <StyledButton
          type="button"
          variant="ghost"
          onClick={() => {
            const d = defaultMonthStartToToday();
            setTailorId("all");
            setDateFrom(d.from);
            setDateTo(d.to);
            setSelectedStatuses(DEFAULT_STATUSES);
            setPage(1);
          }}
        >
          Reset
        </StyledButton>
      </div>

      {/* Status info chips */}
      <div className="flex flex-wrap gap-1">
        {ALL_STATUSES.map((s) => {
          const n = statusCounts.find((x) => x.status === s)?.count ?? 0;
          return (
            <span
              key={s}
              className="rounded-full border px-3 py-1 text-[11px] font-semibold"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                color: n > 0 ? "var(--text2)" : "var(--text3)",
              }}
            >
              {s} - {n}
            </span>
          );
        })}
      </div>

      {/* Item info chips */}
      <div className="flex flex-wrap gap-1" style={{ marginTop: "0.5rem" }}>
        {itemCounts.slice(0, 18).map((x) => (
          <span
            key={x.garmentType}
            className="rounded-full border px-3 py-1 text-[11px] font-semibold"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text2)" }}
          >
            {x.garmentType} - {x.quantity}
          </span>
        ))}
        {itemCounts.length === 0 && (
          <span className="text-[11px]" style={{ color: "var(--text3)" }}>
            No items for selected filters.
          </span>
        )}
      </div>

      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-[12px]"
          style={{ background: "rgba(224,85,85,0.08)", borderColor: "rgba(224,85,85,0.25)", color: "var(--color-red)" }}
        >
          {(error as Error).message || "Failed to load job cards."}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {isLoading ? (
          <p className="px-5 py-8 text-[12px]" style={{ color: "var(--text3)" }}>
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <Package size={28} style={{ color: "var(--text3)" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
              No jobs found for these filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Order #", "Customer", "Order date", "Delivery date", "Status", "Items", "Qty", "Total", "Due", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-semibold uppercase tracking-wide ${["Qty", "Total", "Due"].includes(h) ? "text-right" : "text-left"}`}
                      style={{ color: "var(--text3)", fontSize: "9px" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.orderId}
                    onClick={() => router.push(`/orders/${r.orderId}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : undefined }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <td className="px-4 py-2">
                      <span className="font-mono font-semibold" style={{ color: "var(--gold)" }}>
                        #{r.tokenNo}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-2 font-medium" style={{ color: "var(--text)" }}>
                      <span className="line-clamp-2">
                        {r.customerName}
                        {r.customerPhone ? ` - ${r.customerPhone}` : ""}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2" style={{ color: "var(--text2)" }}>
                      {formatDateTime(r.orderDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2" style={{ color: "var(--text2)" }}>
                      {formatDateTime(r.deliveryDate)}
                    </td>
                    <td className="px-4 py-2" style={{ color: "var(--text2)" }}>
                      {r.status}
                    </td>
                    <td className="max-w-[260px] px-4 py-2" style={{ color: "var(--text2)" }}>
                      <span className="line-clamp-2">{r.itemsSummary || "—"}</span>
                    </td>
                    <td className="px-4 py-2 text-right" style={{ color: "var(--text)" }}>
                      {r.itemCount}
                    </td>
                    <td className="px-4 py-2 text-right" style={{ color: "var(--text)" }}>
                      {formatInr(r.totalAmount)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span style={{ color: r.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)", fontWeight: 500 }}>
                        {r.balanceAmount > 0 ? formatInr(r.balanceAmount) : "Paid"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          void openOrderJobCardPdf(r.orderId, tailorId !== "all" ? tailorId : undefined);
                        }}
                      >
                        <Printer size={14} /> Print Job Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          {isLoading ? "Loading…" : `${total} order${total !== 1 ? "s" : ""}`} · page {page} / {totalPages}
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

function tailororIdToGuidOrThrow(v: string) {
  // Tailor select returns actual guid string from API; keep as-is.
  return v;
}

