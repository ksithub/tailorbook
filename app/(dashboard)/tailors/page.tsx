"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Plus, Scissors, XCircle } from "lucide-react";
import { useState } from "react";

type TailorDto = { id: string; name: string; phone: string; skills: string; payType: string; isActive: boolean };

const PAY_TYPES = ["Monthly", "PerPiece", "Daily", "Commission"];
const SKILL_OPTIONS = ["Blouse", "Salwar", "Lehenga", "Suit", "Alteration", "Embroidery"];

export default function TailorsPage() {
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", skills: "" as string, payType: "Monthly" });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<TailorDto[]>({
    queryKey: ["tailors"],
    queryFn: async () => (await api.get("/api/tailors")).data,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/tailors", {
        name: form.name,
        phone: form.phone || null,
        skills: selectedSkills.join(", ") || null,
        payType: form.payType,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tailors"] });
      setPanelOpen(false);
      setForm({ name: "", phone: "", skills: "", payType: "Monthly" });
      setSelectedSkills([]);
      setFormError(null);
    },
    onError: () => setFormError("Could not add tailor. Please try again."),
  });

  const tailors = data ?? [];
  const active = tailors.filter((t) => t.isActive).length;

  function toggleSkill(s: string) {
    setSelectedSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          {isLoading ? "Loading…" : `${active} active · ${tailors.length} total`}
        </p>
        <StyledButton onClick={() => setPanelOpen(true)}>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tailors.map((t) => (
          <div key={t.id} className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
                  style={{ background: "var(--gold-dim)", color: "var(--gold)" }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-[13px] font-semibold leading-none" style={{ color: "var(--text)" }}>{t.name}</p>
                  <p className="mt-0.5 text-[10px] leading-none" style={{ color: "var(--text3)" }}>{t.phone ?? "—"}</p>
                </div>
              </div>
              {t.isActive
                ? <CheckCircle size={13} style={{ color: "var(--color-green)" }} />
                : <XCircle size={13} style={{ color: "var(--text3)" }} />}
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {(t.skills ?? "").split(",").filter(Boolean).map((s) => (
                <span key={s} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px]"
                  style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
                  <Scissors size={8} />{s.trim()}
                </span>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-[10px]" style={{ color: "var(--text3)" }}>Pay: {t.payType}</p>
              {!t.isActive && (
                <span className="rounded-full px-2 py-0.5 text-[9px]" style={{ background: "var(--surface2)", color: "var(--text3)" }}>
                  Inactive
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Tailor Panel */}
      <SlidePanel open={panelOpen} onClose={() => { setPanelOpen(false); setFormError(null); }} title="Add Tailor">
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
          <FormField label="Skills (select all that apply)">
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
          </FormField>

          {formError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
              {formError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={saveMutation.isPending}>Add tailor</StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setPanelOpen(false)}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
