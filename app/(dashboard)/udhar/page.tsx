"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ArrowRight, BookOpen, CheckCircle,
  CreditCard, IndianRupee, Loader2,
} from "lucide-react";
import { useState } from "react";

type CustomerDto = { id: string; name: string; phone: string; city: string | null; udharBalance: number };
type LedgerEntry = { date: string; type: string; amount: number; notes: string | null };

const PAYMENT_MODES = ["Cash", "UPI", "Card", "BankTransfer", "Cheque"];

export default function UdharPage() {
  const qc = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [payPanel, setPayPanel] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", mode: "Cash", notes: "" });
  const [payError, setPayError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<CustomerDto[]>({
    queryKey: ["udhar-list"],
    queryFn: async () => (await api.get("/api/udhar")).data,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ["udhar-ledger", selectedCustomer?.id],
    queryFn: async () => (await api.get(`/api/udhar/customer/${selectedCustomer!.id}`)).data,
    enabled: !!selectedCustomer,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      /* Record a balance payment against the udhar: use an udhar-balance order or direct API */
      await api.post("/api/payments", {
        orderId: "00000000-0000-0000-0000-000000000000", // handled by backend for udhar-only payments
        amount: parseFloat(payForm.amount),
        mode: payForm.mode,
        type: "Balance",
        uPIRef: null,
        notes: payForm.notes || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["udhar-list"] });
      qc.invalidateQueries({ queryKey: ["udhar-ledger", selectedCustomer?.id] });
      setPayPanel(false);
      setPayForm({ amount: "", mode: "Cash", notes: "" });
      setPayError(null);
    },
    onError: () => setPayError("Payment could not be recorded. Try from an open order instead."),
  });

  const customers = data ?? [];
  const totalOutstanding = customers.reduce((s, c) => s + c.udharBalance, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Left: debtor list */}
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between rounded-xl border px-5 py-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <BookOpen size={14} style={{ color: "var(--gold)" }} />
            <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Udhar Khata</p>
          </div>
          {customers.length > 0 && (
            <div className="text-right">
              <p className="text-[9px]" style={{ color: "var(--text3)" }}>Total outstanding</p>
              <p className="text-[16px] font-bold" style={{ color: "var(--color-red)" }}>{formatInr(totalOutstanding)}</p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4" style={{ color: "var(--text3)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : customers.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--color-green)" }}>
            <CheckCircle size={14} />
            <p className="text-[12px] font-semibold">All balances cleared — no udhar!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <button key={c.id} type="button"
                onClick={() => setSelectedCustomer(c)}
                className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all"
                style={{
                  background: selectedCustomer?.id === c.id ? "var(--gold-dim)" : "var(--surface)",
                  borderColor: selectedCustomer?.id === c.id ? "var(--gold)" : "var(--border)",
                }}
                onMouseEnter={(e) => { if (selectedCustomer?.id !== c.id) (e.currentTarget as HTMLElement).style.borderColor = "var(--gold)"; }}
                onMouseLeave={(e) => { if (selectedCustomer?.id !== c.id) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold flex-shrink-0"
                    style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>{c.name[0]}</div>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold leading-none" style={{ color: "var(--text)" }}>{c.name}</p>
                    <p className="mt-0.5 text-[10px] leading-none" style={{ color: "var(--text3)" }}>
                      {c.phone}{c.city ? ` · ${c.city}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-[13px] font-bold" style={{ color: "var(--color-red)" }}>{formatInr(c.udharBalance)}</p>
                  </div>
                  <ArrowRight size={12} style={{ color: "var(--text3)" }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: ledger */}
      <div>
        {!selectedCustomer ? (
          <div className="flex flex-col items-center justify-center rounded-xl border py-16 text-center"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <AlertCircle size={28} className="mb-3" style={{ color: "var(--text3)" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>Select a customer</p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>Click any row to view their ledger</p>
          </div>
        ) : (
          <div className="rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {/* Ledger header */}
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{selectedCustomer.name}</p>
                <p className="mt-0.5 text-[10px]" style={{ color: "var(--text3)" }}>
                  Balance: <span style={{ color: "var(--color-red)", fontWeight: 600 }}>{formatInr(selectedCustomer.udharBalance)}</span>
                </p>
              </div>
              <StyledButton onClick={() => setPayPanel(true)}>
                <IndianRupee size={12} /> Record payment
              </StyledButton>
            </div>

            {/* Ledger entries */}
            <div className="p-5">
              {ledgerLoading ? (
                <div className="flex items-center gap-2" style={{ color: "var(--text3)" }}>
                  <Loader2 size={13} className="animate-spin" /> Loading ledger…
                </div>
              ) : (ledger ?? []).length === 0 ? (
                <p className="text-[12px]" style={{ color: "var(--text3)" }}>No transactions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {(ledger ?? []).map((entry, i) => {
                    const isCredit = entry.type === "Credit";
                    return (
                      <div key={i} className="flex items-center justify-between rounded-lg px-4 py-2.5"
                        style={{ background: "var(--surface2)" }}>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <CreditCard size={10} style={{ color: isCredit ? "var(--color-green)" : "var(--color-red)" }} />
                            <p className="text-[11px] font-medium" style={{ color: "var(--text)" }}>
                              {isCredit ? "Payment received" : "Credit issued"}
                            </p>
                          </div>
                          <p className="mt-0.5 text-[9px]" style={{ color: "var(--text3)" }}>
                            {new Date(entry.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            {entry.notes ? ` · ${entry.notes}` : ""}
                          </p>
                        </div>
                        <p className="text-[13px] font-semibold" style={{ color: isCredit ? "var(--color-green)" : "var(--color-red)" }}>
                          {isCredit ? "-" : "+"}{formatInr(entry.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Panel */}
      <SlidePanel open={payPanel} onClose={() => { setPayPanel(false); setPayError(null); }}
        title="Record Udhar Payment"
        subtitle={selectedCustomer ? `${selectedCustomer.name} · ${formatInr(selectedCustomer.udharBalance)} due` : ""}>
        <div className="mb-4 rounded-lg p-3 text-[12px]" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
          To record a payment against udhar, open the specific order from the{" "}
          <a href="/orders" style={{ color: "var(--gold)" }}>Orders page</a> and use "Record payment" there.
          This keeps payments correctly linked to order records.
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); payMutation.mutate(); }}>
          <FormField label="Amount (₹)" required>
            <StyledInput type="number" min={1} step="0.01" placeholder="0.00"
              value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} required />
          </FormField>
          <FormField label="Mode">
            <StyledSelect value={payForm.mode} onChange={(e) => setPayForm((f) => ({ ...f, mode: e.target.value }))}>
              {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </StyledSelect>
          </FormField>
          <FormField label="Notes">
            <StyledInput placeholder="Optional notes" value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} />
          </FormField>
          {payError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>{payError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={payMutation.isPending}><IndianRupee size={12} /> Record</StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setPayPanel(false)}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
