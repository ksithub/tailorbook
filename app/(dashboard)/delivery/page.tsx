"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Truck } from "lucide-react";
import { useState } from "react";

type OrderDto = {
  id: string; tokenNo: string; customerName: string;
  deliveryDate: string; status: string; totalAmount: number; balanceAmount: number;
};

const PAYMENT_MODES = ["Cash", "UPI", "Card", "BankTransfer", "Cheque"];

export default function DeliveryPage() {
  const qc = useQueryClient();
  const [delivering, setDelivering] = useState<OrderDto | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [payMode, setPayMode] = useState("Cash");
  const [deliverError, setDeliverError] = useState<string | null>(null);

  const { data: pending, isLoading } = useQuery<OrderDto[]>({
    queryKey: ["delivery-pending"],
    queryFn: async () => (await api.get("/api/delivery/pending")).data,
  });

  const { data: overdue } = useQuery<OrderDto[]>({
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

  return (
    <div className="space-y-5">
      {/* Overdue */}
      {overdueList.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={13} style={{ color: "var(--color-red)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--color-red)" }}>
              Overdue ({overdueList.length})
            </p>
          </div>
          <div className="space-y-2">
            {overdueList.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border-l-2 px-4 py-3"
                style={{ background: "var(--surface)", borderLeftColor: "var(--color-red)", outline: "1px solid var(--border)" }}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px]" style={{ color: "var(--gold)" }}>#{o.tokenNo}</span>
                    <span className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{o.customerName}</span>
                  </div>
                  <p className="mt-0.5 text-[10px]" style={{ color: "var(--color-red)" }}>
                    Due: {new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {o.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[11px]" style={{ color: o.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                    {o.balanceAmount > 0 ? formatInr(o.balanceAmount) : "Paid"}
                  </p>
                  <StyledButton onClick={() => { setDelivering(o); setCollectAmount(o.balanceAmount > 0 ? String(o.balanceAmount) : ""); }}>
                    <Truck size={11} /> Deliver
                  </StyledButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Truck size={13} style={{ color: "var(--gold)" }} />
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
            Ready for Delivery ({pendingList.length})
          </p>
        </div>
        {isLoading ? (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : pendingList.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--color-green)" }}>
            <CheckCircle size={14} />
            <p className="text-[12px] font-medium">No pending deliveries — all clear!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingList.map((o) => {
              const isDueToday = o.deliveryDate.slice(0, 10) === today;
              return (
                <div key={o.id} className="flex items-center justify-between rounded-xl border px-4 py-3"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px]" style={{ color: "var(--gold)" }}>#{o.tokenNo}</span>
                      <span className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{o.customerName}</span>
                      {isDueToday && (
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>
                          Today
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px]" style={{ color: "var(--text3)" }}>
                      {o.status} · Due {new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px]" style={{ color: o.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                      {o.balanceAmount > 0 ? formatInr(o.balanceAmount) : "Paid"}
                    </p>
                    <StyledButton onClick={() => { setDelivering(o); setCollectAmount(o.balanceAmount > 0 ? String(o.balanceAmount) : ""); }}>
                      <Truck size={11} /> Deliver
                    </StyledButton>
                  </div>
                </div>
              );
            })}
          </div>
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
