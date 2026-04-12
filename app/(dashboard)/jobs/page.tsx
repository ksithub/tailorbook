"use client";

import { FormField, StyledButton, StyledSelect } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, Plus } from "lucide-react";
import { useState } from "react";

type OrderDto = { id: string; tokenNo: string; customerName: string; deliveryDate: string; status: string; priority: string };
type TailorDto = { id: string; name: string; isActive: boolean };

const STATUS_COLORS: Record<string, string> = {
  Booked: "var(--color-blue)", Cutting: "var(--color-purple)", Stitching: "var(--color-teal)",
  Trial: "var(--gold)", Alteration: "var(--color-red)", Ready: "var(--color-green)",
};

const PRODUCTION_STATUSES = ["Booked", "Cutting", "Stitching", "Trial", "Alteration"];

export default function JobCardsPage() {
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ orderId: "", tailorId: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["orders-production"],
    queryFn: async () => {
      const results = await Promise.all(
        PRODUCTION_STATUSES.map((s) =>
          api.get("/api/orders", { params: { status: s, pageSize: 30 } }).then((r) => r.data.items as OrderDto[])
        )
      );
      return results.flat();
    },
    refetchInterval: 30_000,
  });

  const { data: tailors } = useQuery<TailorDto[]>({
    queryKey: ["tailors"],
    queryFn: async () => (await api.get("/api/tailors")).data,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/assignments", {
        orderId: form.orderId,
        tailorId: form.tailorId,
        notes: form.notes || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-production"] });
      setPanelOpen(false);
      setForm({ orderId: "", tailorId: "", notes: "" });
      setFormError(null);
    },
    onError: () => setFormError("Could not assign tailor. Try again."),
  });

  const orders = ordersData ?? [];
  const activeTailors = (tailors ?? []).filter((t) => t.isActive);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          {isLoading ? "Loading…" : `${orders.length} orders in production`}
        </p>
        <StyledButton onClick={() => setPanelOpen(true)}>
          <Plus size={12} /> Assign tailor
        </StyledButton>
      </div>

      {/* Cards grouped by status */}
      {PRODUCTION_STATUSES.map((status) => {
        const statusOrders = orders.filter((o) => o.status === status);
        if (statusOrders.length === 0) return null;
        const color = STATUS_COLORS[status];
        return (
          <div key={status}>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: color }} />
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color }}>
                {status} ({statusOrders.length})
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {statusOrders.map((o) => {
                const today = new Date().toISOString().slice(0, 10);
                const isOverdue = o.deliveryDate.slice(0, 10) < today;
                const isUrgent = o.priority === "Urgent" || o.priority === "Express";
                return (
                  <div key={o.id}
                    className="rounded-xl border-l-2 p-3"
                    style={{ background: "var(--surface)", borderLeftColor: isUrgent ? "var(--color-red)" : color, outline: "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[10px] font-semibold" style={{ color: "var(--gold)" }}>#{o.tokenNo}</span>
                      {isUrgent && <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                        style={{ background: "rgba(224,85,85,0.15)", color: "var(--color-red)" }}>{o.priority}</span>}
                    </div>
                    <p className="mt-0.5 text-[12px] font-medium" style={{ color: "var(--text)" }}>{o.customerName}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <CalendarDays size={9} style={{ color: isOverdue ? "var(--color-red)" : "var(--text3)" }} />
                      <p className="text-[9px]" style={{ color: isOverdue ? "var(--color-red)" : "var(--text3)" }}>
                        {new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {isOverdue && " ⚠"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {!isLoading && orders.length === 0 && (
        <div className="rounded-xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <ClipboardList size={28} className="mx-auto mb-3" style={{ color: "var(--text3)" }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>No orders in production right now</p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>Book an order to see it here.</p>
        </div>
      )}

      {/* Assign Panel */}
      <SlidePanel open={panelOpen} onClose={() => { setPanelOpen(false); setFormError(null); }} title="Assign Tailor to Order">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(); }}>
          <FormField label="Order" required>
            <StyledSelect value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))} required>
              <option value="">Select order…</option>
              {orders.map((o) => <option key={o.id} value={o.id}>#{o.tokenNo} — {o.customerName} ({o.status})</option>)}
            </StyledSelect>
          </FormField>
          <FormField label="Tailor" required>
            <StyledSelect value={form.tailorId} onChange={(e) => setForm((f) => ({ ...f, tailorId: e.target.value }))} required>
              <option value="">Select tailor…</option>
              {activeTailors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </StyledSelect>
          </FormField>
          {formError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>{formError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={assignMutation.isPending}>Assign</StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setPanelOpen(false)}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
