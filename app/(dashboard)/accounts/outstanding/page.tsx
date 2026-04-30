"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, IndianRupee, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type OutstandingDto = {
  customerId: string;
  customerName: string;
  phone: string | null;
  totalInvoiced: number;
  totalReceived: number;
  outstanding: number;
};

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
  runningBalance: number;
};

const TX_LABELS: Record<string, string> = {
  SaleInvoice: "Sale Invoice",
  SaleInvoiceReturn: "Sale Return / Cancelled",
  Receipt: "Receipt",
  Payment: "Payment",
};

export default function OutstandingPage() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<OutstandingDto | null>(null);

  const { data: list, isLoading } = useQuery<OutstandingDto[]>({
    queryKey: ["outstanding-list"],
    queryFn: async () => (await api.get("/api/accounting/outstanding")).data,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ["customer-ledger-drill", selectedCustomer?.customerId],
    queryFn: async () =>
      (await api.get("/api/accounting/ledger", {
        params: { customerId: selectedCustomer!.customerId, pageSize: 100 },
      })).data,
    enabled: !!selectedCustomer,
  });

  const filtered = (list ?? []).filter(
    (c) =>
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  const totalOutstanding = filtered.reduce((s, c) => s + c.outstanding, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>Total Outstanding</p>
          <p className="mt-1 text-[20px] font-semibold flex items-center gap-1" style={{ color: "var(--color-red)" }}>
            <IndianRupee size={14} /> {formatInr(totalOutstanding)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text3)" }}>{filtered.length} customers</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>Total Invoiced</p>
          <p className="mt-1 text-[20px] font-semibold" style={{ color: "var(--text)" }}>
            {formatInr(filtered.reduce((s, c) => s + c.totalInvoiced, 0))}
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>Total Collected</p>
          <p className="mt-1 text-[20px] font-semibold" style={{ color: "var(--color-green)" }}>
            {formatInr(filtered.reduce((s, c) => s + c.totalReceived, 0))}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Customer list */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} style={{ color: "var(--color-red)" }} />
              <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Customer Outstanding</p>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2" style={{ color: "var(--text3)" }} />
              <input
                type="text"
                placeholder="Search by name or phone…"
                className="w-full rounded-md border pl-7 pr-3 py-1.5 text-[12px]"
                style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text)" }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <p className="px-5 py-8 text-[12px] text-center" style={{ color: "var(--text3)" }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-8 text-[12px] text-center" style={{ color: "var(--text3)" }}>
              {list && list.length === 0 ? "All customers are settled!" : "No customers match your search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Customer", "Invoiced", "Received", "Outstanding"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text3)", fontSize: "9px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const isSelected = selectedCustomer?.customerId === c.customerId;
                    return (
                      <tr
                        key={c.customerId}
                        onClick={() => setSelectedCustomer(isSelected ? null : c)}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : undefined,
                          background: isSelected ? "var(--gold-dim)" : undefined,
                        }}
                        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)"; }}
                        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = ""; }}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium" style={{ color: isSelected ? "var(--gold)" : "var(--text)" }}>{c.customerName}</p>
                          {c.phone && <p className="text-[9px]" style={{ color: "var(--text3)" }}>{c.phone}</p>}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "var(--text2)" }}>{formatInr(c.totalInvoiced)}</td>
                        <td className="px-4 py-2.5" style={{ color: "var(--color-green)" }}>{formatInr(c.totalReceived)}</td>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--color-red)" }}>
                          {formatInr(c.outstanding)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Customer Ledger drill-down */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                {selectedCustomer ? `${selectedCustomer.customerName} – Ledger` : "Customer Ledger"}
              </p>
              {selectedCustomer && (
                <p className="text-[10px]" style={{ color: "var(--text3)" }}>
                  Outstanding: <span style={{ color: "var(--color-red)" }}>{formatInr(selectedCustomer.outstanding)}</span>
                </p>
              )}
            </div>
            {selectedCustomer && (
              <Link
                href={`/accounts/ledger?customerId=${selectedCustomer.customerId}`}
                className="text-[10px] font-medium"
                style={{ color: "var(--gold)" }}
              >
                Full ledger →
              </Link>
            )}
          </div>

          {!selectedCustomer ? (
            <p className="px-5 py-10 text-[12px] text-center" style={{ color: "var(--text3)" }}>
              Click a customer to view their transaction history.
            </p>
          ) : ledgerLoading ? (
            <p className="px-5 py-10 text-[12px] text-center" style={{ color: "var(--text3)" }}>Loading…</p>
          ) : !ledger || ledger.length === 0 ? (
            <p className="px-5 py-10 text-[12px] text-center" style={{ color: "var(--text3)" }}>No ledger entries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Date", "Type", "Dr (₹)", "Cr (₹)", "Balance"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text3)", fontSize: "9px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: i < ledger.length - 1 ? "1px solid var(--border)" : undefined }}>
                      <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "var(--text)" }}>
                        {new Date(e.transactionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                          style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>
                          {TX_LABELS[e.transactionType] ?? e.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right" style={{ color: "var(--color-red)" }}>
                        {e.drAmount != null ? formatInr(e.drAmount) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right" style={{ color: "var(--color-green)" }}>
                        {e.crAmount != null ? formatInr(e.crAmount) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: "var(--text)" }}>
                        {formatInr(e.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
