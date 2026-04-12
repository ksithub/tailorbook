"use client";

import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, MessageCircle, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderDto = {
  id: string; tokenNo: string; customerName: string; orderDate: string;
  totalAmount: number; balanceAmount: number; status: string; invoiceNo: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  Delivered: "var(--color-green)", Ready: "var(--color-teal)",
  Cancelled: "var(--text3)",
};

export default function BillingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [whatsAppId, setWhatsAppId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["billing-orders"],
    queryFn: async () => (await api.get("/api/orders?pageSize=80")).data as { items: OrderDto[] },
  });

  const invoiceMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setGeneratingId(orderId);
      await api.post(`/api/orders/${orderId}/invoice`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-orders"] }); setGeneratingId(null); },
    onError: () => setGeneratingId(null),
  });

  const whatsAppMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setWhatsAppId(orderId);
      await api.post(`/api/orders/${orderId}/whatsapp`, { template: "InvoiceReady" });
    },
    onSuccess: () => setWhatsAppId(null),
    onError: () => setWhatsAppId(null),
  });

  const orders = data?.items ?? [];
  const totalBilled = orders.filter((o) => o.status !== "Cancelled").reduce((s, o) => s + o.totalAmount, 0);
  const totalPending = orders.filter((o) => o.status !== "Cancelled").reduce((s, o) => s + o.balanceAmount, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total billed", value: formatInr(totalBilled), color: "var(--text)" },
          { label: "Balance pending", value: formatInr(totalPending), color: totalPending > 0 ? "var(--color-red)" : "var(--color-green)" },
          { label: "Orders", value: String(orders.length), color: "var(--text)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>{s.label}</p>
            <p className="mt-1 text-[20px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <Receipt size={14} style={{ color: "var(--gold)" }} />
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Invoices & Billing</p>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 px-5 py-8" style={{ color: "var(--text3)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Token", "Customer", "Date", "Total", "Balance", "Status", "Invoice", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text3)", fontSize: "9px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center" style={{ color: "var(--text3)" }}>No orders found</td></tr>
                ) : orders.map((o, i) => (
                  <tr key={o.id}
                    style={{ borderBottom: i < orders.length - 1 ? "1px solid var(--border)" : undefined }}
                    className="cursor-pointer"
                    onClick={() => router.push(`/orders/${o.id}`)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-semibold" style={{ color: "var(--gold)" }}>#{o.tokenNo}</span>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text)" }}>{o.customerName}</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text2)" }}>
                      {new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text)" }}>{formatInr(o.totalAmount)}</td>
                    <td className="px-4 py-2.5" style={{ color: o.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                      {o.balanceAmount > 0 ? formatInr(o.balanceAmount) : "Paid"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                        style={{ color: STATUS_COLORS[o.status] ?? "var(--text2)", background: `${STATUS_COLORS[o.status] ?? "var(--text3)"}22` }}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {o.invoiceNo ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px]" style={{ color: "var(--color-green)" }}>#{o.invoiceNo}</span>
                          <a href={`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/orders/${o.id}/invoice/pdf`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--gold)" }}>
                            <Download size={10} /> PDF
                          </a>
                        </div>
                      ) : (
                        <button type="button"
                          disabled={generatingId === o.id}
                          onClick={() => invoiceMutation.mutate(o.id)}
                          className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ color: "var(--text2)" }}>
                          {generatingId === o.id ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
                          Generate
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {o.invoiceNo && (
                        <button type="button"
                          disabled={whatsAppId === o.id}
                          onClick={() => whatsAppMutation.mutate(o.id)}
                          className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ color: "var(--color-green)" }}>
                          {whatsAppId === o.id ? <Loader2 size={10} className="animate-spin" /> : <MessageCircle size={10} />}
                          WhatsApp
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
