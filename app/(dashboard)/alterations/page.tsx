"use client";

import { FormField, StyledButton, StyledInput, StyledSelect, StyledTextarea } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { useState } from "react";

type OrderDto = { id: string; tokenNo: string; customerName: string; status: string };

export default function AlterationsPage() {
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ orderId: "", notes: "", extraCharge: "0" });
  const [formError, setFormError] = useState<string | null>(null);

  /* Orders that can have alterations raised (not delivered/cancelled) */
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["orders-alterable"],
    queryFn: async () => {
      const eligible = ["Booked", "Cutting", "Stitching", "Trial", "Ready"];
      const results = await Promise.all(
        eligible.map((s) => api.get("/api/orders", { params: { status: s, pageSize: 30 } }).then((r) => r.data.items as OrderDto[]))
      );
      return results.flat();
    },
  });

  /* Orders currently in Alteration status */
  const { data: inAlteration } = useQuery<OrderDto[]>({
    queryKey: ["orders-in-alteration"],
    queryFn: async () => (await api.get("/api/orders", { params: { status: "Alteration", pageSize: 50 } })).data.items,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/alterations", {
        orderId: form.orderId,
        orderItemId: null,
        notes: form.notes,
        extraCharge: parseFloat(form.extraCharge) || 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-alterable"] });
      qc.invalidateQueries({ queryKey: ["orders-in-alteration"] });
      qc.invalidateQueries({ queryKey: ["kanban"] });
      setPanelOpen(false);
      setForm({ orderId: "", notes: "", extraCharge: "0" });
      setFormError(null);
    },
    onError: () => setFormError("Could not raise alteration. Try again."),
  });

  const activeAlterations = inAlteration ?? [];

  return (
    <div className="space-y-5">
      {/* Active Alterations */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
            <RefreshCw size={10} className="inline mr-1.5" style={{ color: "var(--color-red)" }} />
            In Alteration ({activeAlterations.length})
          </p>
          <StyledButton onClick={() => setPanelOpen(true)}>
            <Plus size={12} /> Raise alteration
          </StyledButton>
        </div>

        {isLoading ? (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : activeAlterations.length === 0 ? (
          <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>No orders in alteration right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeAlterations.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border-l-2 px-4 py-3"
                style={{ background: "var(--surface)", borderLeftColor: "var(--color-red)", outline: "1px solid var(--border)" }}>
                <div>
                  <span className="font-mono text-[11px]" style={{ color: "var(--gold)" }}>#{o.tokenNo}</span>
                  <span className="ml-2 text-[12px] font-medium" style={{ color: "var(--text)" }}>{o.customerName}</span>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                  style={{ background: "rgba(224,85,85,0.15)", color: "var(--color-red)" }}>
                  Alteration
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <p className="text-[11px]" style={{ color: "var(--text2)" }}>
          Raising an alteration will move the order status to <strong>Alteration</strong> and track the
          extra charge. The order resumes the normal production flow after alteration is complete.
        </p>
      </div>

      {/* Raise Alteration Panel */}
      <SlidePanel open={panelOpen} onClose={() => { setPanelOpen(false); setFormError(null); }} title="Raise Alteration Request">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
          <FormField label="Order" required>
            <StyledSelect value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))} required>
              <option value="">Select order…</option>
              {(ordersData ?? []).map((o) => (
                <option key={o.id} value={o.id}>#{o.tokenNo} — {o.customerName} ({o.status})</option>
              ))}
            </StyledSelect>
          </FormField>
          <FormField label="Alteration notes" required>
            <StyledTextarea placeholder="Describe what needs to be altered…" value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} required />
          </FormField>
          <FormField label="Extra charge (₹)" hint="Enter 0 if no additional charge">
            <StyledInput type="number" min={0} step="0.01" value={form.extraCharge}
              onChange={(e) => setForm((f) => ({ ...f, extraCharge: e.target.value }))} />
          </FormField>
          {formError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>{formError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={saveMutation.isPending}>Raise alteration</StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setPanelOpen(false)}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
