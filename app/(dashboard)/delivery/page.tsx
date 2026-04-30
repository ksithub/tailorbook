"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, MessageCircle, Package, Phone, Search, Truck } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OrderDto = {
  id: string;
  tokenNo: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  status: string;
  totalAmount: number;
  balanceAmount: number;
};

const PAYMENT_MODES = ["Cash", "UPI", "Card", "BankTransfer", "Cheque"];

export default function DeliveryPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [delivering, setDelivering] = useState<OrderDto | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [payMode, setPayMode] = useState("Cash");
  const [deliverError, setDeliverError] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState("");

  const { data: pending, isLoading: pendingLoading } = useQuery<OrderDto[]>({
    queryKey: ["delivery-pending"],
    queryFn: async () => (await api.get("/api/delivery/pending")).data,
  });

  const { data: overdue, isLoading: overdueLoading } = useQuery<OrderDto[]>({
    queryKey: ["delivery-overdue"],
    queryFn: async () => (await api.get("/api/delivery/overdue")).data,
  });

  const deliverMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/api/orders/${delivering!.id}/deliver`, {
        collectBalanceAmount: collectAmount ? parseFloat(collectAmount) : null,
        mode: collectAmount ? payMode : null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery-pending"] });
      qc.invalidateQueries({ queryKey: ["delivery-overdue"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setDelivering(null);
      setCollectAmount("");
      setDeliverError(null);
    },
    onError: () => setDeliverError("Could not mark as delivered. Please try again."),
  });

  const overdueList = overdue ?? [];
  const pendingList = pending ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const isLoading = pendingLoading || overdueLoading;

  const overdueIds = useMemo(() => new Set(overdueList.map((o) => o.id)), [overdueList]);

  const shopName = useAuthStore((s) => s.user?.companyName) ?? "Shop";
  const shopPhone = null;

  function telDigits(phone: string) {
    return String(phone ?? "").replace(/\D/g, "");
  }

  function waUrlFor(o: OrderDto) {
    const msg = buildWhatsAppMessage({
      tokenNo: o.tokenNo,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      fromStatus: o.status,
      toStatus: "Ready",
      shopName,
      shopPhone,
      totalAmount: o.totalAmount,
      dueAmount: o.balanceAmount,
    });
    return buildWhatsAppUrl(o.customerPhone, msg);
  }

  function searchMatch(o: OrderDto, rawQuery: string) {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return true;

    const tokenNo = (o.tokenNo ?? "").toLowerCase();
    const customerName = (o.customerName ?? "").toLowerCase();
    const customerPhone = (o.customerPhone ?? "").toLowerCase();

    const orderDateIso = o.orderDate ? new Date(o.orderDate).toISOString().slice(0, 10).toLowerCase() : "";
    const deliveryDateIso = o.deliveryDate ? new Date(o.deliveryDate).toISOString().slice(0, 10).toLowerCase() : "";

    const deliveryDateText = o.deliveryDate
      ? new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase()
      : "";
    const orderDateText = o.orderDate
      ? new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase()
      : "";

    const totalText = String(o.totalAmount ?? "");
    const dueText = o.balanceAmount > 0 ? String(o.balanceAmount) : "paid";

    const tokenDigits = telDigits(tokenNo);
    const phoneDigits = telDigits(customerPhone);
    const qDigits = telDigits(q);
    const totalDigits = telDigits(totalText);
    const dueDigits = telDigits(dueText);

    return (
      tokenNo.includes(q) ||
      customerName.includes(q) ||
      customerPhone.includes(q) ||
      orderDateIso.includes(q) ||
      deliveryDateIso.includes(q) ||
      orderDateText.includes(q) ||
      deliveryDateText.includes(q) ||
      totalText.toLowerCase().includes(q) ||
      dueText.toLowerCase().includes(q) ||
      (qDigits ? tokenDigits.includes(qDigits) || phoneDigits.includes(qDigits) || totalDigits.includes(qDigits) || dueDigits.includes(qDigits) : false)
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Truck size={13} style={{ color: "var(--gold)" }} />
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
            Ready for Delivery  - Overdue ({overdueList.length})
          </p>
        </div>

        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search size={13} className="absolute left-3 top-1/2 z-[1] -translate-y-1/2" style={{ color: "var(--text3)" }} />
            <StyledInput
              placeholder="Search order #, customer, mobile, amount, or dates…"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {orderSearch.trim().length > 0 && (
            <StyledButton
              type="button"
              variant="ghost"
              onClick={() => setOrderSearch("")}
              style={{ color: "var(--text3)" }}
            >
              Clear
            </StyledButton>
          )}
        </div>

        {isLoading ? (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : pendingList.length === 0 && overdueList.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--color-green)" }}>
            <CheckCircle size={14} />
            <p className="text-[12px] font-medium">No deliveries — all clear!</p>
          </div>
        ) : (
          (() => {
            /* const combined = [...pendingList, ...overdueList].sort( */
            const combined = [...pendingList].sort(
              (a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime(),
            );
            // Same order may appear in both pending + overdue lists; dedupe by id.
            const uniqueById = Array.from(new Map(combined.map((o) => [o.id, o])).values());
            const filtered = uniqueById.filter((o) => searchMatch(o, orderSearch));
            const dueSum = filtered.reduce((s, o) => s + (Number(o.balanceAmount) > 0 ? Number(o.balanceAmount) : 0), 0);

            return (
              <div className="overflow-hidden rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-5 py-12">
                  <Package size={28} style={{ color: "var(--text3)" }} />
                  <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
                    No orders found for this search
                  </p>
                </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["Order #", "Order Date", "Delivery Date", "Customer", "Due / Paid", "Actions"].map((h) => (
                            <th
                              key={h}
                              className={`px-4 py-3 font-semibold uppercase tracking-wide ${h === "Due / Paid" || h === "Actions" ? "text-right" : "text-left"}`}
                              style={{ color: "var(--text3)", fontSize: "9px" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((o, i) => {
                          const isOverdue = overdueIds.has(o.id);
                          const dueDate = new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
                          const orderDate = new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
                          const callDigits = telDigits(o.customerPhone);
                          const wa = waUrlFor(o);

                          return (
                            <tr key={o.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : undefined }}>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  className="font-semibold underline-offset-2 hover:underline"
                                  style={{ color: "var(--gold)" }}
                                  onClick={() => router.push(`/orders/${o.id}`)}
                                >
                                  #{o.tokenNo}
                                </button>
                              </td>
                              <td className="px-4 py-2" style={{ color: "var(--text3)" }}>
                                 {orderDate} 
                                
                              </td>
                              <td className="px-4 py-2" style={{ color: "var(--text3)" }}>
                                 {dueDate}
                                {isOverdue && (
                                  <span
                                    className="ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                                    style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}
                                  >
                                    Overdue
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2" style={{ color: "var(--text)" }}>
                                <span className="font-medium">
                                  {o.customerName} - {o.customerPhone}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span style={{ color: o.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)", fontWeight: 600 }}>
                                  {o.balanceAmount > 0 ? `${formatInr(o.balanceAmount)}` : "Paid"}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center justify-end gap-2">
                                  {callDigits && (
                                    <a
                                      href={`tel:${callDigits}`}
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
                                      className="flex h-6 w-6 items-center justify-center rounded-md border"
                                      style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text2)" }}
                                      title="WhatsApp"
                                      aria-label="WhatsApp"
                                    >
                                      <MessageCircle size={13} />
                                    </a>
                                  )}
                                  <StyledButton 
                                    onClick={() => {
                                      setDelivering(o);
                                      setCollectAmount(o.balanceAmount > 0 ? String(o.balanceAmount) : "");
                                    }}
                                    padding="0.3rem 1rem"
                                  >
                                    <Truck size={11} /> Deliver
                                  </StyledButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                          <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
                            Total due
                          </td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--color-red)" }}>
                            {formatInr(dueSum)}
                          </td>
                          <td className="px-4 py-3" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Mark Delivered Panel */}
      <SlidePanel
        open={!!delivering}
        onClose={() => { setDelivering(null); setDeliverError(null); }}
        title="Mark as Delivered"
        subtitle={delivering ? `#${delivering.tokenNo} · ${delivering.customerName}` : ""}
      >
        {delivering && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); deliverMutation.mutate(); }}>
            <div className="rounded-lg p-3" style={{ background: "var(--surface2)" }}>
              <p className="text-[11px]" style={{ color: "var(--text2)" }}>Order total: <strong style={{ color: "var(--text)" }}>{formatInr(delivering.totalAmount)}</strong></p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text2)" }}>
                Balance due: <strong style={{ color: delivering.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                  {delivering.balanceAmount > 0 ? formatInr(delivering.balanceAmount) : "Nil"}
                </strong>
              </p>
            </div>

            {delivering.balanceAmount > 0 && (
              <>
                <FormField label="Collect balance amount (₹)">
                  <StyledInput type="number" min={0} step="0.01" value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    placeholder={`Up to ${formatInr(delivering.balanceAmount)}`} />
                </FormField>
                {collectAmount && parseFloat(collectAmount) > 0 && (
                  <FormField label="Payment mode">
                    <StyledSelect value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                      {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </StyledSelect>
                  </FormField>
                )}
              </>
            )}

            {deliverError && (
              <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>{deliverError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <StyledButton type="submit" loading={deliverMutation.isPending}>
                <CheckCircle size={12} /> Confirm delivery
              </StyledButton>
              <StyledButton type="button" variant="ghost" onClick={() => setDelivering(null)}>Cancel</StyledButton>
            </div>
          </form>
        )}
      </SlidePanel>
    </div>
  );
}
