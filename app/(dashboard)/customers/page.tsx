"use client";

import { FormField, StyledButton, StyledInput, StyledTextarea } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Grid, LayoutList, MapPin, Pencil, Phone, Plus, Search, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CustomerDto = {
  id: string;
  name: string;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  udharBalance: number;
  isActive: boolean;
  createdAt: string;
};

const EMPTY_FORM = { name: "", phone: "", alternatePhone: "", address: "", city: "", notes: "" };

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [deleteTarget, setDeleteTarget] = useState<CustomerDto | null>(null);

  const router = useRouter();

  // Debounce search so we don't fire a query on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", debouncedSearch, page, pageSize],
    queryFn: async () => {
      const res = await api.get("/api/customers", {
        params: { search: debouncedSearch || undefined, page, pageSize },
      });
      return res.data as { items: CustomerDto[]; totalCount: number; page: number; pageSize: number };
    },
    staleTime: 30_000,   // don't refetch if data is < 30 s old
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.put(`/api/customers/${editing.id}`, form);
      } else {
        await api.post("/api/customers", form);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setPanelOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message || "Could not save customer. Check the details and try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setDeleteTarget(null);
    },
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setPanelOpen(true);
  }

  function openEdit(c: CustomerDto) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, alternatePhone: c.alternatePhone ?? "", address: c.address ?? "", city: c.city ?? "", notes: c.notes ?? "" });
    setFormError(null);
    setPanelOpen(true);
  }

  const customers = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const withUdhar = customers.filter((c) => c.udharBalance > 0).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
          <StyledInput
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {(["table", "grid"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className="flex items-center gap-1 px-2.5 py-2 text-[11px] transition-colors"
              style={{
                background: viewMode === m ? "var(--gold-dim)" : "var(--surface)",
                color: viewMode === m ? "var(--gold)" : "var(--text3)",
              }}
            >
              {m === "table" ? <LayoutList size={13} /> : <Grid size={13} />}
              {m === "table" ? "Table" : "Grid"}
            </button>
          ))}
        </div> */}
        <StyledButton onClick={openAdd}>
          <Plus size={12} strokeWidth={2.5} />
          Add customer
        </StyledButton>
        {/* {withUdhar > 0 && (
          <Link
            href="/udhar"
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-medium"
            style={{ background: "rgba(224,85,85,0.1)", color: "var(--color-red)", border: "1px solid rgba(224,85,85,0.2)" }}
          >
            <AlertCircle size={11} />
            {withUdhar} with udhar
          </Link>
        )} */}
      </div>

      {/* Error / summary row */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border px-4 py-3"
          style={{ background: "rgba(224,85,85,0.08)", borderColor: "rgba(224,85,85,0.25)" }}>
          <AlertCircle size={13} style={{ color: "var(--color-red)" }} />
          <p className="text-[12px]" style={{ color: "var(--color-red)" }}>
            {(error as Error).message || "Failed to load customers — is the API running?"}
          </p>
        </div>
      )}
      

      {/* Grid */}
      {!isLoading && customers.length === 0 && (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <User size={28} className="mx-auto mb-3" style={{ color: "var(--text3)" }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>No customers yet</p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>Add your first customer to get started.</p>
          <div className="mt-4 flex justify-center">
            <StyledButton onClick={openAdd}><Plus size={12} /> Add customer</StyledButton>
          </div>
        </div>
      )}

      {!isLoading && customers.length > 0 && viewMode === "table" && (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)", width: 44 }} />
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Name</th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Phone</th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>City / Address</th>
                <th className="py-2.5 px-4 text-right font-medium" style={{ color: "var(--text2)" }}>Udhar</th>
                <th className="py-2.5 px-4 text-right font-medium" style={{ color: "var(--text2)", width: 110 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr
                  key={c.id}
                  style={{
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <td className="py-2 px-4">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold"
                      style={{ background: "var(--gold-dim)", color: "var(--gold)" }}
                    >
                      {c.name[0]}
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <button
                      type="button"
                      onClick={() => router.push(`/customers/${c.id}`)}
                      className="text-left font-medium hover:underline"
                      style={{ color: "var(--text)" }}
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="py-2 px-4" style={{ color: "var(--text3)" }}>
                    {c.phone}
                    {c.alternatePhone ? <span style={{ color: "var(--text3)" }}> · {c.alternatePhone}</span> : null}
                  </td>
                  <td className="py-2 px-4" style={{ color: "var(--text3)" }}>
                    {[c.city, c.address].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td
                    className="py-2 px-4 text-right font-semibold"
                    style={{ color: c.udharBalance > 0 ? "var(--color-red)" : "var(--text3)" }}
                  >
                    {c.udharBalance > 0 ? formatInr(c.udharBalance) : "—"}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface2)]"
                        title="Edit"
                        style={{ color: "var(--text2)" }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-lg p-1.5 transition-colors hover:bg-[rgba(224,85,85,0.12)]"
                        title="Delete"
                        style={{ color: "var(--text3)" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && customers.length > 0 && viewMode === "grid" && (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <div
              key={c.id}
              className="group relative rounded-xl border px-4 py-3 text-left transition-all hover:scale-[1.01]"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gold)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded-lg p-1.5 shadow-sm"
                  style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(c)}
                  className="rounded-lg p-1.5 shadow-sm"
                  style={{ background: "var(--surface)", color: "rgba(224,85,85,0.8)", border: "1px solid var(--border)" }}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.push(`/customers/${c.id}`)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                      style={{ background: "var(--gold-dim)", color: "var(--gold)" }}
                    >
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-none" style={{ color: "var(--text)" }}>
                        {c.name}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        <Phone size={9} style={{ color: "var(--text3)" }} />
                        <p className="text-[10px] leading-none" style={{ color: "var(--text3)" }}>{c.phone}</p>
                      </div>
                    </div>
                  </div>
                  {c.udharBalance > 0 && (
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                      style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}
                    >
                      {formatInr(c.udharBalance)}
                    </span>
                  )}
                </div>
                {(c.city || c.address) && (
                  <div className="mt-2 flex items-center gap-1">
                    <MapPin size={9} style={{ color: "var(--text3)" }} />
                    <p className="truncate text-[10px]" style={{ color: "var(--text3)" }}>
                      {[c.city, c.address].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
      

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>
        {isLoading
          ? "Loading…"
          : `${totalCount} customer${totalCount !== 1 ? "s" : ""}${search ? " found" : ""} · page ${page} / ${totalPages}`}
      </p>
          <div className="flex items-center gap-2">
            <StyledButton type="button" variant="ghost" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </StyledButton>
            <StyledButton type="button" variant="ghost" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </StyledButton>
          </div>
        </div>
      )}
      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div
            className="rounded-xl p-6 w-[340px] shadow-xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>Delete customer?</h3>
            <p className="text-[12px] mb-5" style={{ color: "var(--text2)" }}>
              <span className="font-medium" style={{ color: "var(--text)" }}>{deleteTarget.name}</span> will be
              removed. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <StyledButton variant="ghost" type="button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </StyledButton>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg px-4 py-1.5 text-[12px] font-medium transition-colors"
                style={{ background: "rgba(224,85,85,0.15)", color: "rgb(220,60,60)", border: "1px solid rgba(224,85,85,0.3)" }}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setFormError(null); }}
        title={editing ? "Edit Customer" : "Add Customer"}
        subtitle={editing ? editing.name : "Fill in customer details"}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
        >
          <FormField label="Full name" required>
            <StyledInput
              placeholder="e.g. Raja Kumar"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </FormField>

          <FormField label="Phone number" required>
            <StyledInput
              type="tel"
              placeholder="Mobile number / WhatsApp number"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required
            />
          </FormField>

          <FormField label="Alternate phone">
            <StyledInput
              type="tel"
              placeholder="Optional"
              value={form.alternatePhone}
              onChange={(e) => setForm((f) => ({ ...f, alternatePhone: e.target.value }))}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="City">
              <StyledInput
                placeholder="e.g. Surat"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </FormField>
            <FormField label="Address">
              <StyledInput
                placeholder="Street / area"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Notes">
            <StyledTextarea
              placeholder="Any special notes…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </FormField>

          {formError && (
            <p className="rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
              {formError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={saveMutation.isPending}>
              {editing ? "Save changes" : "Add customer"}
            </StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setPanelOpen(false)}>
              Cancel
            </StyledButton>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
