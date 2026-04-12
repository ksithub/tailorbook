"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, IndianRupee, Plus } from "lucide-react";
import { useState } from "react";

type DailySummary = { date: string; totalAmount: number; count: number };
type OrderDto = { id: string; tokenNo: string; customerName: string; balanceAmount: number };

const PAYMENT_MODES = ["Cash", "UPI", "Card", "BankTransfer", "Cheque"];
const PAYMENT_TYPES = ["Advance", "Balance", "Full", "Extra"];

export default function PaymentsPage() {
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ orderId: "", amount: "", mode: "Cash", type: "Balance", upiRef: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: summary, isLoading } = useQuery<DailySummary[]>({
    queryKey: ["payments-daily"],
    queryFn: async () => {
      // Backend returns a single object {date, total} — wrap in array for consistent display
      const res = await api.get("/api/payments/daily");
      const d = res.data;
      if (Array.isArray(d)) return d;
      return d ? [{ date: d.date, totalAmount: d.total, count: 1 }] : [];
    },
  });

  const { data: pendingOrders } = useQuery<{ items: OrderDto[] }>({
    queryKey: ["orders-pending-payment"],
    queryFn: async () => (await api.get("/api/orders", { params: { pageSize: 60 } })).data,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/payments", {
        orderId: form.orderId,
        amount: parseFloat(form.amount),
        mode: form.mode,
        type: form.type,
        uPIRef: form.upiRef || null,
        notes: form.notes || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments-daily"] });
      qc.invalidateQueries({ queryKey: ["orders-pending-payment"] });
      setPanelOpen(false);
      setForm({ orderId: "", amount: "", mode: "Cash", type: "Balance", upiRef: "", notes: "" });
      setFormError(null);
    },
    onError: () => setFormError("Could not record payment. Check the order and amount."),
  });

  const ordersWithBalance = (pendingOrders?.items ?? []).filter((o) => o.balanceAmount > 0);
  const totalThisWeek = (summary ?? []).slice(0, 7).reduce((s, d) => s + d.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>Today's collection</p>
          <p className="mt-1 text-[20px] font-semibold" style={{ color: "var(--color-green)" }}>
            {formatInr((summary ?? [])[0]?.totalAmount ?? 0)}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>{(summary ?? [])[0]?.count ?? 0} transactions</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>This week</p>
          <p className="mt-1 text-[20px] font-semibold" style={{ color: "var(--text)" }}>{formatInr(totalThisWeek)}</p>
        </div>
        <div className="rounded-xl border p-4 flex items-center justify-between" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div>
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>Pending balance orders</p>
            <p className="mt-1 text-[20px] font-semibold" style={{ color: "var(--color-red)" }}>{ordersWithBalance.length}</p>
          </div>
          <StyledButton onClick={() => setPanelOpen(true)}>
            <Plus size={12} /> Record
          </StyledButton>
        </div>
      </div>

      {/* Daily breakdown */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <CreditCard size={14} style={{ color: "var(--gold)" }} />
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Daily Collection History</p>
        </div>
        {isLoading ? (
          <p className="px-5 py-6 text-[12px]" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : (summary ?? []).length === 0 ? (
          <p className="px-5 py-6 text-[12px]" style={{ color: "var(--text3)" }}>No payment records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Date", "Transactions", "Total Collected"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text3)", fontSize: "9px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(summary ?? []).map((p, i) => (
                  <tr key={p.date} style={{ borderBottom: i < (summary ?? []).length - 1 ? "1px solid var(--border)" : undefined }}>
                    <td className="px-4 py-2.5" style={{ color: "var(--text)" }}>
                      {new Date(p.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text2)" }}>{p.count} payment{p.count !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--color-green)" }}>{formatInr(p.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Panel */}
      <SlidePanel open={panelOpen} onClose={() => { setPanelOpen(false); setFormError(null); }} title="Record Payment">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
          <FormField label="Order" required>
            <StyledSelect value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))} required>
              <option value="">Select order…</option>
              {ordersWithBalance.map((o) => (
                <option key={o.id} value={o.id}>#{o.tokenNo} — {o.customerName} ({formatInr(o.balanceAmount)} due)</option>
              ))}
            </StyledSelect>
          </FormField>
          <FormField label="Amount (₹)" required>
            <StyledInput type="number" min={1} step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment mode">
              <StyledSelect value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </StyledSelect>
            </FormField>
            <FormField label="Payment type">
              <StyledSelect value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </StyledSelect>
            </FormField>
          </div>
          {form.mode === "UPI" && (
            <FormField label="UPI reference">
              <StyledInput placeholder="Transaction ID" value={form.upiRef} onChange={(e) => setForm((f) => ({ ...f, upiRef: e.target.value }))} />
            </FormField>
          )}
          <FormField label="Notes">
            <StyledInput placeholder="Optional notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </FormField>
          {formError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>{formError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={saveMutation.isPending}><IndianRupee size={12} /> Record payment</StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setPanelOpen(false)}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
