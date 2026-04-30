"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { AccountSelect } from "@/components/layout/AccountSelect";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type PaymentEntry = {
  id: string;
  date: string;
  accountName: string;
  transactionType: string;
  paymentMode: string;
  amount: number;
  narration: string;
  referenceId: string | null;
  isManual: boolean;
};

type LedgerAccount = {
  id: string;
  name: string;
  code: string;
  accountType: string;
  isSystem: boolean;
  isActive: boolean;
};

type ManualTransactionDto = {
  id: string;
  kind: string;
  date: string;
  mode: string;
  amount: number;
  otherAccountId: string;
  otherAccountName: string;
  narration: string;
};

type PagedResult<T> = { items: T[]; totalCount: number; page: number; pageSize: number };

const TX_LABELS: Record<string, string> = {
  PaymentTailor: "Tailor Payment",
  Refund: "Refund to Customer",
};

const MODE_TABS = ["All", "Cash", "UPI", "Card", "BankTransfer"];
const CASH_BANK_CODES = new Set(["CASH", "UPI", "CARD", "TRANSFER"]);

export default function PaymentBookPage() {
  const [modeTab, setModeTab] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [accountId, setAccountId] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const qc = useQueryClient();

  useEffect(() => {
    // Default: current month start → today
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

  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (modeTab !== "All") params.mode = modeTab;
  if (accountId !== "all") params.accountId = accountId;
  params.page = String(page);
  params.pageSize = String(pageSize);

  const { data, isLoading } = useQuery<PagedResult<PaymentEntry>>({
    queryKey: ["payment-book", modeTab, from, to, accountId, page, pageSize],
    queryFn: async () => (await api.get("/api/accounting/payment-book", { params })).data,
  });

  const entries = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const total = entries.reduce((s, e) => s + e.amount, 0);

  const { data: accounts } = useQuery<LedgerAccount[]>({
    queryKey: ["ledger-accounts"],
    queryFn: async () => (await api.get("/api/accounting/accounts")).data,
  });

  const { data: editing } = useQuery<ManualTransactionDto>({
    queryKey: ["manual-tx", editingId],
    enabled: !!editingId,
    queryFn: async () => (await api.get(`/api/accounting/transactions/${editingId}`)).data,
  });

  const otherAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.isActive && !CASH_BANK_CODES.has(a.code)),
    [accounts]
  );

  const [fDate, setFDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [fMode, setFMode] = useState<string>("Cash");
  const [fAmt, setFAmt] = useState<number>(0);
  const [fAcc, setFAcc] = useState<string>("");
  const [fNar, setFNar] = useState<string>("");

  useEffect(() => {
    if (!panelOpen) return;
    setFDate(editing?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setFMode(editing?.mode ?? "Cash");
    setFAmt(editing?.amount ?? 0);
    setFAcc(editing?.otherAccountId ?? (otherAccounts[0]?.id ?? ""));
    setFNar(editing?.narration ?? "");
  }, [panelOpen, editing?.date, editing?.mode, editing?.amount, editing?.otherAccountId, editing?.narration, otherAccounts]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        kind: "Payment",
        date: fDate,
        mode: fMode,
        amount: fAmt,
        otherAccountId: fAcc,
        narration: fNar,
      };
      if (editingId) {
        await api.put(`/api/accounting/transactions/${editingId}`, payload);
        return { id: editingId };
      }
      return (await api.post(`/api/accounting/transactions`, payload)).data as { id: string };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["payment-book"] });
      setPanelOpen(false);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/accounting/transactions/${id}`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["payment-book"] });
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [modeTab, from, to, accountId]);

  return (
    <div className="space-y-4">
      {/* Date filters */}
      <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>From</label>
            <input type="date"
              className="rounded-md border px-2 py-1.5 text-[12px]"
              style={{ background: "var(--surface-alt, var(--surface))", borderColor: "var(--border)", color: "var(--text)" }}
              value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>To</label>
            <input type="date"
              className="rounded-md border px-2 py-1.5 text-[12px]"
              style={{ background: "var(--surface-alt, var(--surface))", borderColor: "var(--border)", color: "var(--text)" }}
              value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 min-w-[320px]">
            <AccountSelect
              value={accountId}
              onChange={setAccountId}
              options={(accounts ?? []).map((a) => ({ id: a.id, name: a.name, code: a.code, isActive: a.isActive }))}
              includeAll
              allLabel="All"
            />
          </div>

          {/* Mode Tabs beside account */}
          <div className="flex gap-1 mt-[18px]">
            {MODE_TABS.map((tab) => (
              <button key={tab} type="button"
                onClick={() => setModeTab(tab)}
                className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-all"
                style={{
                  background: modeTab === tab ? "var(--gold)" : "var(--surface)",
                  color: modeTab === tab ? "var(--on-gold)" : "var(--text2)",
                  border: "1px solid",
                  borderColor: modeTab === tab ? "var(--gold)" : "var(--border)",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          </div>

          <button
            type="button"
            onClick={() => { setEditingId(null); setPanelOpen(true); }}
            className="rounded-md px-3 py-2 text-[12px] font-semibold inline-flex items-center gap-2"
            style={{ background: "var(--gold)", color: "var(--on-gold)", border: "1px solid var(--gold)" }}
          >
            <Plus size={14} /> Add Payment
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
     {/*    <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <ArrowUpRight size={14} style={{ color: "var(--color-red)" }} />
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Payment Book</p>
        </div> */}

        {isLoading ? (
          <p className="px-5 py-8 text-[12px] text-center" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p className="px-5 py-8 text-[12px] text-center" style={{ color: "var(--text3)" }}>No payments found for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Date", "DR/CR Account",  "Mode", "Narration", "Amount (₹)", "Actions"].map((h) => (
                    <th key={h} className={`px-4 py-2.5 ${h === "Actions" || h === "Amount (₹)" ? "text-right" : "text-left"} font-semibold uppercase tracking-wide`}
                      style={{ color: "var(--text3)", fontSize: "9px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : undefined }}>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "var(--text)" }}>
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text2)" }}>{e.accountName}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "var(--text3)" }}>{e.paymentMode}</td>
                    <td className="px-4 py-2.5 max-w-[200px]" style={{ color: "var(--text2)" }}>
                      <p className="truncate">{e.narration}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap font-semibold" style={{ color: "var(--color-red)" }}>
                      {formatInr(e.amount)}
                    </td>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                      {e.isManual ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditingId(e.id); setPanelOpen(true); }}
                            className="rounded-md p-1.5"
                            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              setDeleteTarget({ id: e.id, label: e.accountName || "Payment" });
                            }}
                            className="rounded-md p-1.5"
                            style={{ border: "1px solid var(--border)", color: "var(--color-red)", background: "var(--surface)", opacity: deleteMutation.isPending ? 0.7 : 1 }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <td colSpan={5}  className="px-4 py-2.5 text-right font-bold" style={{ color: "var(--color-red)" }}>{formatInr(total)}</td>
                  <td  className="px-4 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete payment?"
        description={
          <>
            <span className="font-medium" style={{ color: "var(--text)" }}>
              {deleteTarget?.label}
            </span>{" "}
            will be removed. This cannot be undone.
          </>
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id);
        }}
        confirmLoading={deleteMutation.isPending}
      />

      {/* Footer total + pagination */}
      {(entries.length > 0 || totalPages > 1) && (
        <div
          className="rounded-xl  px-5  flex items-center justify-between"
          /* style={{ background: "var(--surface)", borderColor: "var(--border)" }} */
        >
          <div className="flex flex-col">
           {/*  <p className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>Total (this page)</p> */}
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              {totalCount} entries · page {page} / {totalPages}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* <p className="text-[13px] font-bold" style={{ color: "var(--color-red)" }}>{formatInr(total)}</p> */}
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
        </div>
      )}

      <SlidePanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setEditingId(null); }}
        title={editingId ? "Edit Payment" : "Add Payment"}
        subtitle="Manual entry (Order/payroll payments are not editable)"
        width="460px"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>Date</label>
              <input
                type="date"
                className="rounded-md border px-2 py-2 text-[12px]"
                style={{ background: "var(--surface-alt, var(--surface))", borderColor: "var(--border)", color: "var(--text)" }}
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>Mode</label>
              <select
                className="rounded-md border px-2 py-2 text-[12px]"
                style={{ background: "var(--surface-alt, var(--surface))", borderColor: "var(--border)", color: "var(--text)" }}
                value={fMode}
                onChange={(e) => setFMode(e.target.value)}
              >
                {MODE_TABS.filter((m) => m !== "All").map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>Amount</label>
              <input
                type="number"
                className="rounded-md border px-2 py-2 text-[12px]"
                style={{ background: "var(--surface-alt, var(--surface))", borderColor: "var(--border)", color: "var(--text)" }}
                value={Number.isFinite(fAmt) ? fAmt : 0}
                onChange={(e) => setFAmt(Number(e.target.value))}
              />
            </div>
            <AccountSelect
              label="Debit Account"
              value={fAcc}
              onChange={setFAcc}
              options={otherAccounts.map((a) => ({ id: a.id, name: a.name, code: a.code, isActive: a.isActive }))}
              placeholder="Select account…"
              className="min-w-0"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>Narration</label>
            <textarea
              className="rounded-md border px-2 py-2 text-[12px]"
              style={{ background: "var(--surface-alt, var(--surface))", borderColor: "var(--border)", color: "var(--text)" }}
              rows={3}
              value={fNar}
              onChange={(e) => setFNar(e.target.value)}
            />
          </div>

          <button
            type="button"
            disabled={saveMutation.isPending || !fAcc || fAmt <= 0}
            onClick={() => saveMutation.mutate()}
            className="w-full rounded-md px-3 py-2 text-[12px] font-semibold"
            style={{
              background: saveMutation.isPending ? "var(--border)" : "var(--gold)",
              color: saveMutation.isPending ? "var(--text3)" : "var(--on-gold)",
              border: "1px solid var(--gold)",
              opacity: saveMutation.isPending ? 0.7 : 1,
            }}
          >
            {editingId ? "Save Changes" : "Save Payment"}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
