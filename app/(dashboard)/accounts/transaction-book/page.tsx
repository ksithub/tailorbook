"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { useState } from "react";

function isoDate(d: Date) {
  // yyyy-mm-dd for <input type="date">
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultFromTo() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: isoDate(from), to: isoDate(now) };
}

type TxBookEntry = {
  id: string;
  date: string;
  transactionType: string;
  narration: string;
  counterpartyAccount: string;
  drAmount: number | null;
  crAmount: number | null;
  runningBalance: number;
  customerName: string | null;
  tailorName: string | null;
};

type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type TxBookResponse = {
  page: PagedResult<TxBookEntry>;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
};

const TX_LABELS: Record<string, string> = {
  SaleInvoice: "Sale Invoice",
  SaleInvoiceReturn: "Sale Return / Cancelled",
  Receipt: "Receipt",
  Payment: "Payment",
};

const BOOK_TABS = [
  { key: "cash", label: "Cash Book" },
  { key: "upi", label: "UPI Book" },
  { key: "card", label: "Card Book" },
  { key: "transfer", label: "Transfer Book" },
  { key: "bank", label: "All Bank" },
];

export default function TransactionBookPage() {
  const [bookType, setBookType] = useState("cash");
  const defaults = defaultFromTo();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const params: Record<string, string | number> = { type: bookType, page, pageSize };
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, isLoading } = useQuery<TxBookResponse>({
    queryKey: ["transaction-book", bookType, from, to, page, pageSize],
    queryFn: async () => (await api.get("/api/accounting/transaction-book", { params })).data,
  });

  const entries = data?.page?.items ?? [];
  const totalDr = data?.totalReceipts ?? 0;
  const totalCr = data?.totalPayments ?? 0;
  const closing = data?.closingBalance ?? 0;

  const totalPages = data?.page?.totalPages ?? 1;
  const totalCount = data?.page?.totalCount ?? 0;

  return (
    <div className="space-y-4">
      {/* Filters: From/To + Book tabs together */}
      <div className=" border p-4 rounded-xl flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
              From
            </label>
            <input
              type="date"
              className="rounded border px-2 py-1 text-[11px]"
              style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text)" }}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
              To
            </label>
            <input
              type="date"
              className="rounded border px-2 py-1 text-[11px]"
              style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text)" }}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {BOOK_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setBookType(tab.key);
                setPage(1);
              }}
              className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-all"
              style={{
                background: bookType === tab.key ? "var(--gold)" : "var(--surface)",
                color: bookType === tab.key ? "var(--on-gold)" : "var(--text2)",
                border: "1px solid",
                borderColor: bookType === tab.key ? "var(--gold)" : "var(--border)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <Wallet size={14} style={{ color: "var(--gold)" }} />
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            {BOOK_TABS.find((t) => t.key === bookType)?.label ?? "Transaction Book"}
          </p>
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-[12px] text-center" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : (entries ?? []).length === 0 ? (
          <p className="px-5 py-8 text-[12px] text-center" style={{ color: "var(--text3)" }}>No transactions found for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Date", "Type", "CR/DR Account", "Narration", "Receipt (Dr)", "Payment (Cr)", "Balance (₹)"].map((h) => (
                    <th key={h} className={`px-4 py-2 ${h === "Receipt (Dr)" || h === "Payment (Cr)" || h === "Balance (₹)" ? "text-right" : "text-left"} font-semibold uppercase tracking-wide`}
                      style={{ color: "var(--text3)", fontSize: "9px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(entries ?? []).map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: i < (entries ?? []).length - 1 ? "1px solid var(--border)" : undefined }}>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "var(--text)" }}>
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "var(--text3)" }}>
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                        style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>
                        {TX_LABELS[e.transactionType] ?? e.transactionType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[220px]" style={{ color: "var(--text)" }}>
                      <p className="truncate">{e.counterpartyAccount}</p>                      
                    </td>
                    <td className="px-4 py-2.5 max-w-[260px]" style={{ color: "var(--text2)" }}>
                      <p className="truncate">{e.narration}</p>
                      {/* {e.customerName && <p className="text-[9px]" style={{ color: "var(--text3)" }}>{e.customerName}</p>}
                      {e.tailorName && <p className="text-[9px]" style={{ color: "var(--text3)" }}>{e.tailorName}</p>} */}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium" style={{ color: "var(--color-green)" }}>
                      {e.drAmount != null ? formatInr(e.drAmount) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium" style={{ color: "var(--color-red)" }}>
                      {e.crAmount != null ? formatInr(e.crAmount) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap font-semibold" style={{ color: "var(--text)" }}>
                      {formatInr(e.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <td colSpan={4} className="px-4 py-2.5 text-right text-[11px] font-semibold" style={{ color: "var(--text2)" }}></td>
                  <td className="px-4 py-2.5 text-right font-bold" style={{ color: "var(--color-green)" }}>{formatInr(totalDr)}</td>
                  <td className="px-4 py-2.5 text-right font-bold" style={{ color: "var(--color-red)" }}>{formatInr(totalCr)}</td>
                  <td className="px-4 py-2.5 text-right font-bold" style={{ color: "var(--text)" }}>{formatInr(closing)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          Showing <span style={{ color: "var(--text2)" }}>{entries.length}</span> of{" "}
          <span style={{ color: "var(--text2)" }}>{totalCount}</span> • Page{" "}
          <span style={{ color: "var(--text2)" }}>{page}</span> /{" "}
          <span style={{ color: "var(--text2)" }}>{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"
            style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"
            style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
