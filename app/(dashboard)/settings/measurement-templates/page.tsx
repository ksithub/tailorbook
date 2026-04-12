"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type GarmentTypeDto = { id: string; name: string; displayOrder: number };
type MeasurementTemplateDto = {
  id: string;
  garmentTypeId: string;
  fieldName: string;
  displayOrder: number;
  unit: string;
  isRequired: boolean;
  isActive: boolean;
};

export default function MeasurementTemplatesPage() {
  const qc = useQueryClient();
  const [garmentTypeId, setGarmentTypeId] = useState("");
  const [newField, setNewField] = useState({ fieldName: "", unit: "inch", isRequired: false });
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeasurementTemplateDto | null>(null);

  const { data: garmentTypes, isLoading: gtLoading } = useQuery<GarmentTypeDto[]>({
    queryKey: ["garment-types"],
    queryFn: async () => (await api.get("/api/garment-types")).data,
  });

  const garments = garmentTypes ?? [];
  const effectiveGarmentTypeId = garmentTypeId || garments[0]?.id || "";

  const { data: templates, isLoading: tplLoading } = useQuery<MeasurementTemplateDto[]>({
    queryKey: ["measurement-templates", effectiveGarmentTypeId],
    queryFn: async () =>
      (await api.get("/api/measurement-templates", { params: { garmentTypeId: effectiveGarmentTypeId } })).data,
    enabled: !!effectiveGarmentTypeId,
  });

  const sorted = useMemo(
    () => (templates ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder || a.fieldName.localeCompare(b.fieldName)),
    [templates],
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/measurement-templates", {
        garmentTypeId: effectiveGarmentTypeId,
        fieldName: newField.fieldName,
        unit: newField.unit,
        isRequired: newField.isRequired,
        displayOrder: null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measurement-templates"] });
      setNewField({ fieldName: "", unit: newField.unit, isRequired: false });
      setError(null);
    },
    onError: () => setError("Could not add field. Field name may already exist."),
  });

  const updateMutation = useMutation({
    mutationFn: async (t: MeasurementTemplateDto) => {
      await api.put(`/api/measurement-templates/${t.id}`, {
        id: t.id,
        fieldName: t.fieldName,
        unit: t.unit,
        isRequired: t.isRequired,
        displayOrder: t.displayOrder,
        isActive: true,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["measurement-templates"] }),
    onError: () => setError("Could not update field."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/measurement-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measurement-templates"] });
      setDeleteTarget(null);
    },
    onError: () => setError("Could not delete field."),
  });

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1" style={{ minWidth: 220 }}>
            <FormField label="Garment type">
              <StyledSelect
                value={effectiveGarmentTypeId}
                onChange={(e) => setGarmentTypeId(e.target.value)}
                disabled={gtLoading}
              >
                {garments.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </StyledSelect>
            </FormField>
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            Measurement template fields
          </h2>
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>
            {tplLoading ? "Loading…" : `${sorted.length} field${sorted.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Add field */}
        <form
          className="grid gap-3 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newField.fieldName.trim()) return;
            addMutation.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <FormField label="Field name" required>
              <StyledInput
                placeholder="e.g. Chest"
                value={newField.fieldName}
                onChange={(e) => { setNewField((p) => ({ ...p, fieldName: e.target.value })); setError(null); }}
                required
              />
            </FormField>
          </div>
          <div>
            <FormField label="Unit">
              <StyledSelect
                value={newField.unit}
                onChange={(e) => setNewField((p) => ({ ...p, unit: e.target.value }))}
              >
                <option value="inch">inch</option>
                <option value="cm">cm</option>
              </StyledSelect>
            </FormField>
          </div>
          <div className="flex items-end">
            <StyledButton type="submit" loading={addMutation.isPending}>
              <Plus size={12} /> Add
            </StyledButton>
          </div>
        </form>

        {error && (
          <p className="mt-3 rounded-lg px-3 py-2 text-[12px]"
            style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
            {error}
          </p>
        )}

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Order</th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Field</th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Unit</th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Required</th>
                <th className="py-2.5 px-4 text-right font-medium" style={{ color: "var(--text2)", width: 70 }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, idx) => (
                <tr key={t.id} style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      min={0}
                      value={t.displayOrder}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        updateMutation.mutate({ ...t, displayOrder: Number.isFinite(v) ? v : t.displayOrder });
                      }}
                      className="w-[72px] rounded-md px-2 py-1 text-[12px]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      value={t.fieldName}
                      onChange={(e) => updateMutation.mutate({ ...t, fieldName: e.target.value })}
                      className="w-full rounded-md px-2 py-1 text-[12px]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                  </td>
                  <td className="py-2 px-4">
                    <select
                      value={t.unit}
                      onChange={(e) => updateMutation.mutate({ ...t, unit: e.target.value })}
                      className="rounded-md px-2 py-1 text-[12px]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                      <option value="inch">inch</option>
                      <option value="cm">cm</option>
                    </select>
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="checkbox"
                      checked={t.isRequired}
                      onChange={(e) => updateMutation.mutate({ ...t, isRequired: e.target.checked })}
                    />
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(t)}
                      className="rounded-lg p-1.5 transition-colors hover:bg-[rgba(224,85,85,0.12)]"
                      title="Delete"
                      style={{ color: "var(--text3)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {!tplLoading && sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[12px]" style={{ color: "var(--text3)" }}>
                    No fields yet. Add your first field above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => {
            if (deleteMutation.isPending) return;
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div
            className="rounded-xl p-6 w-[360px] shadow-xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
              Delete field?
            </h3>
            <p className="text-[12px] mb-5" style={{ color: "var(--text2)" }}>
              <span className="font-medium" style={{ color: "var(--text)" }}>
                {deleteTarget.fieldName}
              </span>{" "}
              will be permanently removed from the database.
            </p>
            <div className="flex gap-2 justify-end">
              <StyledButton
                variant="ghost"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </StyledButton>
              <button
                type="button"
                onClick={() => {
                  // Close immediately to avoid double-open from click bubbling / rerenders.
                  const id = deleteTarget.id;
                  setDeleteTarget(null);
                  deleteMutation.mutate(id);
                }}
                disabled={deleteMutation.isPending}
                className="rounded-lg px-4 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  background: "rgba(224,85,85,0.15)",
                  color: "rgb(220,60,60)",
                  border: "1px solid rgba(224,85,85,0.3)",
                }}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

