"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Package, Plus } from "lucide-react";
import { useState } from "react";

type FabricDto = {
  id: string; fabricName: string; fabricType: string | null;
  quantityMeters: number; costPerMeter: number | null;
};

const FABRIC_TYPES = ["Cotton", "Silk", "Polyester", "Georgette", "Chiffon", "Linen", "Rayon", "Net", "Velvet", "Other"];

export default function FabricPage() {
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ fabricName: "", fabricType: "", color: "", quantityMeters: "", costPerMeter: "", supplierName: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<FabricDto[]>({
    queryKey: ["fabric"],
    queryFn: async () => (await api.get("/api/fabric")).data,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/fabric", {
        fabricName: form.fabricName,
        fabricType: form.fabricType || null,
        color: form.color || null,
        quantityMeters: parseFloat(form.quantityMeters),
        costPerMeter: form.costPerMeter ? parseFloat(form.costPerMeter) : null,
        supplierName: form.supplierName || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fabric"] });
      setPanelOpen(false);
      setForm({ fabricName: "", fabricType: "", color: "", quantityMeters: "", costPerMeter: "", supplierName: "" });
      setFormError(null);
    },
    onError: () => setFormError("Could not add fabric. Try again."),
  });

  const fabrics = data ?? [];
  const lowStock = fabrics.filter((f) => f.quantityMeters < 5);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          {isLoading ? "Loading…" : `${fabrics.length} fabric${fabrics.length !== 1 ? "s" : ""}`}
          {lowStock.length > 0 && (
            <span className="ml-2" style={{ color: "var(--color-red)" }}>· {lowStock.length} low stock</span>
          )}
        </p>
        <StyledButton onClick={() => setPanelOpen(true)}>
          <Plus size={12} /> Add fabric
        </StyledButton>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border px-4 py-3"
          style={{ background: "rgba(224,85,85,0.06)", borderColor: "rgba(224,85,85,0.2)" }}>
          <AlertTriangle size={13} style={{ color: "var(--color-red)" }} />
          <p className="text-[12px]" style={{ color: "var(--color-red)" }}>
            Low stock: {lowStock.map((f) => f.fabricName).join(", ")}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && fabrics.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <Package size={28} className="mx-auto mb-3" style={{ color: "var(--text3)" }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>No fabric stock recorded</p>
          <div className="mt-4 flex justify-center">
            <StyledButton onClick={() => setPanelOpen(true)}><Plus size={12} /> Add fabric</StyledButton>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Fabric Name", "Type", "Stock (m)", "Cost / m", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text3)", fontSize: "9px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fabrics.map((f, i) => {
                  const isLow = f.quantityMeters < 5;
                  return (
                    <tr key={f.id} style={{ borderBottom: i < fabrics.length - 1 ? "1px solid var(--border)" : undefined }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>{f.fabricName}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text2)" }}>{f.fabricType ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold" style={{ color: isLow ? "var(--color-red)" : "var(--color-green)" }}>
                          {f.quantityMeters} m
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text2)" }}>
                        {f.costPerMeter != null ? `₹${f.costPerMeter}/m` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                          style={{
                            background: isLow ? "rgba(224,85,85,0.12)" : "rgba(92,186,125,0.12)",
                            color: isLow ? "var(--color-red)" : "var(--color-green)",
                          }}>
                          {isLow ? "Low stock" : "In stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Panel */}
      <SlidePanel open={panelOpen} onClose={() => { setPanelOpen(false); setFormError(null); }} title="Add Fabric">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
          <FormField label="Fabric name" required>
            <StyledInput placeholder="e.g. Pure Silk" value={form.fabricName}
              onChange={(e) => setForm((f) => ({ ...f, fabricName: e.target.value }))} required />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <StyledSelect value={form.fabricType} onChange={(e) => setForm((f) => ({ ...f, fabricType: e.target.value }))}>
                <option value="">Select type…</option>
                {FABRIC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </StyledSelect>
            </FormField>
            <FormField label="Color">
              <StyledInput placeholder="e.g. Red, Navy" value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantity (metres)" required>
              <StyledInput type="number" min={0} step="0.5" placeholder="0" value={form.quantityMeters}
                onChange={(e) => setForm((f) => ({ ...f, quantityMeters: e.target.value }))} required />
            </FormField>
            <FormField label="Cost / metre (₹)">
              <StyledInput type="number" min={0} placeholder="0.00" value={form.costPerMeter}
                onChange={(e) => setForm((f) => ({ ...f, costPerMeter: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Supplier name">
            <StyledInput placeholder="Optional" value={form.supplierName}
              onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))} />
          </FormField>
          {formError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>{formError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={saveMutation.isPending}>Add fabric</StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setPanelOpen(false)}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
