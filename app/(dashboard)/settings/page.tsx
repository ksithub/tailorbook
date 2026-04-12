"use client";

import { FormField, StyledButton, StyledInput } from "@/components/layout/FormField";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Settings } from "lucide-react";
import { useEffect, useState } from "react";

type CompanySettings = {
  id: string; name: string; ownerName: string | null; phone: string | null;
  address: string | null; city: string | null; state: string | null;
  gSTIN: string | null; logoUrl: string | null; upiId: string | null;
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", state: "", gSTIN: "", upiId: "" });
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery<CompanySettings>({
    queryKey: ["settings-company"],
    queryFn: async () => (await api.get("/api/settings/company")).data,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        gSTIN: data.gSTIN ?? "",
        upiId: data.upiId ?? "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put("/api/settings/company", {
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        gSTIN: form.gSTIN || null,
        upiId: form.upiId || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-company"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const FIELDS: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: "name", label: "Shop / Company name", placeholder: "e.g. Sharma Tailor Works" },
    { key: "phone", label: "Business phone", placeholder: "10-digit number" },
    { key: "address", label: "Address", placeholder: "Street / locality" },
    { key: "city", label: "City", placeholder: "e.g. Jaipur" },
    { key: "state", label: "State", placeholder: "e.g. Rajasthan" },
    { key: "gSTIN", label: "GSTIN", placeholder: "15-char GST number" },
    { key: "upiId", label: "UPI ID", placeholder: "shop@upi" },
  ];

  return (
    <div className="max-w-lg space-y-5">
      <div className="rounded-xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-5 flex items-center gap-2">
          <Settings size={15} style={{ color: "var(--gold)" }} />
          <h2 className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>Company Settings</h2>
        </div>

        {isLoading ? (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            {FIELDS.map((f) => (
              <FormField key={f.key} label={f.label}>
                <StyledInput
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  required={f.key === "name"}
                />
              </FormField>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <StyledButton type="submit" loading={saveMutation.isPending}>Save changes</StyledButton>
              {saved && (
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-green)" }}>
                  <CheckCircle size={12} />
                  Saved successfully
                </div>
              )}
              {saveMutation.isError && (
                <p className="text-[11px]" style={{ color: "var(--color-red)" }}>Save failed. Try again.</p>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <p className="mb-2 text-[12px] font-semibold" style={{ color: "var(--text)" }}>Coming soon</p>
        <ul className="space-y-1">
          {["Notification preferences (WhatsApp / SMS)", "User management & roles", "Measurement template defaults", "Branch management"].map((s) => (
            <li key={s} className="text-[11px]" style={{ color: "var(--text3)" }}>· {s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
