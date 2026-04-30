"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { Modal } from "@/components/layout/Modal";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Pencil, Phone, Plus, Scissors, Trash2, XCircle } from "lucide-react";
import { useState } from "react";

type TailorDto = { id: string; name: string; phone: string; skills: string; payType: string; isActive: boolean };

const PAY_TYPES = ["Monthly", "PerPiece", "Daily", "Commission"];
const SKILL_OPTIONS = ["Blouse", "Salwar", "Lehenga", "Suit", "Alteration", "Embroidery"];

export default function TailorsPage() {
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<TailorDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TailorDto | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", skills: "" as string, payType: "Monthly" });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<TailorDto[]>({
    queryKey: ["tailors"],
    queryFn: async () => (await api.get("/api/tailors")).data,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        skills: selectedSkills.join(", ") || null,
        payType: form.payType,
      };
      if (editing) await api.put(`/api/tailors/${editing.id}`, payload);
      else await api.post("/api/tailors", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tailors"] });
      setPanelOpen(false);
      setEditing(null);
      setForm({ name: "", phone: "", skills: "", payType: "Monthly" });
      setSelectedSkills([]);
      setFormError(null);
    },
    onError: () => setFormError(editing ? "Could not update tailor. Please try again." : "Could not add tailor. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/tailors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tailors"] });
      setDeleteTarget(null);
      setActionError(null);
    },
    onError: (e: any) => {
      const msg =
        typeof e?.response?.data === "string"
          ? e.response.data
          : e?.response?.data?.message
            ? String(e.response.data.message)
            : "Could not delete tailor.";
      setActionError(msg);
    },
  });

  const tailors = data ?? [];
  const active = tailors.filter((t) => t.isActive).length;

  function toggleSkill(s: string) {
    setSelectedSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", phone: "", skills: "", payType: "Monthly" });
    setSelectedSkills([]);
    setFormError(null);
    setPanelOpen(true);
  }

  function openEdit(t: TailorDto) {
    setEditing(t);
    setForm({ name: t.name ?? "", phone: t.phone ?? "", skills: t.skills ?? "", payType: t.payType ?? "Monthly" });
    setSelectedSkills((t.skills ?? "").split(",").map((x) => x.trim()).filter(Boolean));
    setFormError(null);
    setPanelOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          {isLoading ? "Loading…" : `${active} active · ${tailors.length} total`}
        </p>
        <StyledButton onClick={openAdd}>
          <Plus size={12} strokeWidth={2.5} /> Add tailor
        </StyledButton>
      </div>

      {/* Grid */}
      {!isLoading && tailors.length === 0 && (
        <div className="rounded-xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <Scissors size={28} className="mx-auto mb-3" style={{ color: "var(--text3)" }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>No tailors added yet</p>
          <div className="mt-4 flex justify-center">
            <StyledButton onClick={() => setPanelOpen(true)}><Plus size={12} /> Add tailor</StyledButton>
          </div>
        </div>
      )}

      {!isLoading && tailors.length > 0 && (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)", width: 44 }} />
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Name</th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Phone</th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Pay type</th>
                {/* <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Skills</th> */}
                <th className="py-2.5 px-4 text-right font-medium" style={{ color: "var(--text2)", width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tailors.map((t, i) => (
                <tr
                  key={t.id}
                  style={{
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <td className="py-2 px-4">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{ background: "var(--gold-dim)", color: "var(--gold)" }}
                    >
                      {t.name?.[0] ?? "T"}
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{t.name}</p>
                     {/*  {t.isActive
                        ? <CheckCircle size={12} style={{ color: "var(--color-green)" }} />
                        : <XCircle size={12} style={{ color: "var(--text3)" }} />} */}
                    </div>
                  </td>
                  <td className="py-2 px-4" style={{ color: "var(--text2)" }}>{t.phone ?? "—"}</td>
                  <td className="py-2 px-4" style={{ color: "var(--text2)" }}>{t.payType ?? "—"}</td>
                  {/* <td className="py-2 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(t.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="rounded-full px-2 py-0.5 text-[10px]"
                          style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                        >
                          {s}
                        </span>
                      ))}
                      {(t.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean).length > 4 && (
                        <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
                          +{(t.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean).length - 4}
                        </span>
                      )}
                    </div>
                  </td> */}
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {t.phone && (
                        <a
                          className="flex h-8 w-8 items-center justify-center rounded-lg border"
                          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text2)" }}
                          href={`tel:${String(t.phone).replace(/\\D/g, "")}`}
                          aria-label="Call tailor"
                          title="Call"
                        >
                          <Phone size={14} />
                        </a>
                      )}
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text2)" }}
                        onClick={() => openEdit(t)}
                        aria-label="Edit tailor"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border"
                        style={{ background: "rgba(224,85,85,0.12)", borderColor: "rgba(224,85,85,0.25)", color: "var(--color-red)" }}
                        onClick={() => { setDeleteTarget(t); setActionError(null); }}
                        aria-label="Delete tailor"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Tailor Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setFormError(null); setEditing(null); }}
        title={editing ? "Edit Tailor" : "Add Tailor"}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
          <FormField label="Full name" required>
            <StyledInput placeholder="e.g. Ramesh Kumar" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </FormField>
          <FormField label="Phone number">
            <StyledInput type="tel" placeholder="Optional" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </FormField>
          <FormField label="Pay type">
            <StyledSelect value={form.payType} onChange={(e) => setForm((f) => ({ ...f, payType: e.target.value }))}>
              {PAY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
            </StyledSelect>
          </FormField>
          {/* <FormField label="Skills (select all that apply)">
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((s) => {
                const on = selectedSkills.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                    style={{
                      background: on ? "var(--gold-dim)" : "var(--surface2)",
                      color: on ? "var(--gold)" : "var(--text2)",
                      border: `1px solid ${on ? "var(--gold)" : "var(--border)"}`,
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </FormField> */}

          {formError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
              {formError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={saveMutation.isPending}>{editing ? "Save changes" : "Add tailor"}</StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setPanelOpen(false)}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>

      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setActionError(null); }}
        title="Delete tailor?"
        subtitle={deleteTarget ? deleteTarget.name : ""}
      >
        <div className="space-y-4">
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>
            This will deactivate the tailor. If any order items are assigned to this tailor, deletion will be blocked.
          </p>
          {actionError && (
            <div className="rounded-lg border px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.10)", borderColor: "rgba(224,85,85,0.25)", color: "var(--color-red)" }}>
              {actionError}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton
              type="button"
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              <Trash2 size={12} /> Delete
            </StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</StyledButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
