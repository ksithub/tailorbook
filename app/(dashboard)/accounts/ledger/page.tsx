"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { AccountSelect } from "@/components/layout/AccountSelect";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

type AccountDto = { id: string; name: string; code: string; accountType: string; isSystem: boolean };
type LedgerEntry = {
  id: string;
  transactionDate: string;
  transactionType: string;
  paymentMode: string | null;
  amount: number;
  drAmount: number | null;
  crAmount: number | null;
  drAccountName: string;
  crAccountName: string;
  narration: string;
  customerName: string | null;
  tailorName: string | null;
  runningBalance: number;
};

type PagedResult<T> = { items: T[]; totalCount: number; page: number; pageSize: number };
type AccountLedgerResponse = {
  page: PagedResult<LedgerEntry>;
  openingBalance: number;
  totalDr: number;
  totalCr: number;
  closingBalance: number;
};

const TX_LABELS: Record<string, string> = {
  SaleInvoice: "Sale Invoice",
  SaleInvoiceReturn: "Sale Return / Cancelled",
  Receipt: "Receipt",
  Payment: "Payment",
};

export default function AccountLedgerPage() {
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    // Default date range: current month start → today
    const today = new Date();
    const toYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };
    if (!from) setFrom(toYmd(new Date(today.getFullYear(), today.getMonth(), 1)));
    if (!to) setTo(toYmd(today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: accounts } = useQuery<AccountDto[]>({
    queryKey: ["ledger-accounts"],
    queryFn: async () => (await api.get("/api/accounting/accounts")).data,
  });

  const params: Record<string, string> = {};
  if (accountId) params.accountId = accountId;
  if (from) params.from = from;
  if (to) params.to = to;
  params.page = String(page);
  params.pageSize = String(pageSize);

  const { data, isLoading, isFetching } = useQuery<AccountLedgerResponse>({
    queryKey: ["ledger-entries", accountId, from, to, page, pageSize],
    queryFn: async () => (await api.get("/api/accounting/ledger", { params })).data,
    enabled: !!accountId,
  });

  const entries = data?.page.items ?? [];
  const totalCount = data?.page.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const openingBalance = data?.openingBalance ?? 0;
  const totalDr = data?.totalDr ?? 0;
  const totalCr = data?.totalCr ?? 0;
  const closingBalance = data?.closingBalance ?? 0;

  useEffect(() => {
    setPage(1);
  }, [accountId, from, to]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[320px]">
            <AccountSelect
              value={accountId}
              onChange={(v) => { setAccountId(v); }}
              options={(accounts ?? []).map((a) => ({ id: a.id, name: a.name, code: a.code }))}
              includeAll={false}
              placeholder="— Select account —"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>From</label>
            <input
              type="date"
              className="rounded-md border px-2 py-1.5 text-[12px]"
              style={{ background: "var(--surface-alt, var(--surface))", borderColor: "var(--border)", color: "var(--text)" }}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>To</label>
            <input
              type="date"
              className="rounded-md border px-2 py-1.5 text-[12px]"
              style={{ background: "var(--surface-alt, var(--surface))", borderColor: "var(--border)", color: "var(--text)" }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Whole-period summary */}
    {/*   {accountId && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>Opening</p>
            <p className="mt-1 text-[16px] font-semibold" style={{ color: "var(--text)" }}>{formatInr(openingBalance)}</p>
          </div>
          <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>Debit (Dr)</p>
            <p className="mt-1 text-[16px] font-semibold" style={{ color: "var(--color-red)" }}>{formatInr(totalDr)}</p>
          </div>
          <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>Credit (Cr)</p>
            <p className="mt-1 text-[16px] font-semibold" style={{ color: "var(--color-green)" }}>{formatInr(totalCr)}</p>
          </div>
          <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>Closing</p>
            <p className="mt-1 text-[16px] font-semibold" style={{ color: "var(--text)" }}>{formatInr(closingBalance)}</p>
          </div>
        </div>
      )} */}

      {/* Ledger Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <BookOpen size={14} style={{ color: "var(--gold)" }} />
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Account Ledger</p>
          {isFetching && <span className="text-[10px]" style={{ color: "var(--text3)" }}>Refreshing…</span>}
        </div>

        {!accountId ? (
          <p className="px-5 py-8 text-[12px] text-center" style={{ color: "var(--text3)" }}>
            Select an account above to view ledger entries.
          </p>
        ) : isLoading ? (
          <p className="px-5 py-8 text-[12px] text-center" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p className="px-5 py-8 text-[12px] text-center" style={{ color: "var(--text3)" }}>No transactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Date", "Type", "DR/CR Account", "Narration", "Mode", "Dr (₹)", "Cr (₹)", "Balance (₹)"].map((h) => (
                    <th key={h} className={`px-4 py-2 ${h === "Dr (₹)" || h === "Cr (₹)" || h === "Balance (₹)" ? "text-right" : "text-left"} font-semibold uppercase tracking-wide`}
                      style={{ color: "var(--text3)", fontSize: "9px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Opening balance row */}
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <td className="px-4 py-2 whitespace-nowrap" style={{ color: "var(--text3)" }}>
                    {from ? new Date(from).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ background: "rgba(0,0,0,0.06)", color: "var(--text3)" }}>
                      Opening
                    </span>
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--text3)" }}>—</td>
                  <td className="px-4 py-2" style={{ color: "var(--text2)" }}>Opening Balance</td>
                  <td className="px-4 py-2" style={{ color: "var(--text3)" }}>—</td>
                  <td className="px-4 py-2 text-right" style={{ color: "var(--text3)" }}>—</td>
                  <td className="px-4 py-2 text-right" style={{ color: "var(--text3)" }}>—</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap font-semibold" style={{ color: "var(--text)" }}>
                    {formatInr(openingBalance)}
                  </td>
                </tr>
                {entries.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : undefined }}>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: "var(--text)" }}>
                      {new Date(e.transactionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                        style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>
                        {TX_LABELS[e.transactionType] ?? e.transactionType}
                      </span>
                    </td>
                    <td className="px-4 py-2" style={{ color: "var(--text3)" }}>
                      {(() => {
                        const opposite = e.drAmount != null ? e.crAccountName : e.drAccountName;
                        return opposite ? (
                          <p className="text-[11px]" style={{ color: "var(--text3)" }}>{opposite}</p>
                        ) : "—";
                      })()}
                    </td>
                    <td className="px-4 py-2 max-w-[220px]" style={{ color: "var(--text2)" }}>
                      <p className="truncate">{e.narration}</p>
                      {/* {e.customerName && <p className="text-[9px]" style={{ color: "var(--text3)" }}>{e.customerName}</p>}
                      {e.tailorName && <p className="text-[9px]" style={{ color: "var(--text3)" }}>{e.tailorName}</p>} */}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: "var(--text3)" }}>
                      {e.paymentMode ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap font-medium" style={{ color: "var(--color-red)" }}>
                      {e.drAmount != null ? formatInr(e.drAmount) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap font-medium" style={{ color: "var(--color-green)" }}>
                      {e.crAmount != null ? formatInr(e.crAmount) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap font-semibold" style={{ color: "var(--text)" }}>
                      {formatInr(Math.abs(e.runningBalance))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <td colSpan={5} className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
                    
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap font-semibold" style={{ color: "var(--color-red)" }}>
                    {formatInr(totalDr)}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap font-semibold" style={{ color: "var(--color-green)" }}>
                    {formatInr(totalCr)}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap font-bold" style={{ color: "var(--text)" }}>
                    {formatInr(Math.abs(closingBalance))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {(entries.length > 0 || totalPages > 1) && (
        <div
          className="rounded-xl px-5  flex items-center justify-between"
          /* style={{ background: "var(--surface)", borderColor: "var(--border)" }} */
        >
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>
            {totalCount} entries · page {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-[11px] font-medium"
              style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-[11px] font-medium"
              style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
