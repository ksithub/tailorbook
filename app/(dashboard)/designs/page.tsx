"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid, LayoutList, Palette, Pencil, Plus, Ruler, Search, Settings2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type GarmentTypeDto = { id: string; name: string; displayOrder: number };

type DesignDto = {
  id: string;
  garmentTypeId: string;
  garmentTypeName: string;
  styleName: string;
  category: string | null;
  imageUrl: string | null;
  basePrice: number | null;
};

type ViewMode = "grid" | "table";

type FormState = {
  garmentTypeId: string;
  styleName: string;
  category: string;
  imageUrl: string;
  basePrice: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  garmentTypeId: "", styleName: "", category: "",
  imageUrl: "", basePrice: "", description: "",
};

const CATEGORIES = ["Casual", "Formal", "Bridal", "Party Wear", "Traditional", "Other"];

export default function DesignsPage() {
  const qc = useQueryClient();

  const [filterGarmentId, setFilterGarmentId] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Panel state — null = closed, "add" or DesignDto for edit
  const [panel, setPanel] = useState<null | "add" | DesignDto>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation (designs)
  const [deleteTarget, setDeleteTarget] = useState<DesignDto | null>(null);

  // Garment-types manager panel
  const [gtPanelOpen, setGtPanelOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [gtError, setGtError] = useState<string | null>(null);
  const newTypeRef = useRef<HTMLInputElement>(null);

  const { data: garmentTypes, isLoading: garmentTypesLoading } = useQuery<GarmentTypeDto[]>({
    queryKey: ["garment-types"],
    queryFn: async () => (await api.get("/api/garment-types")).data,
  });

  const garments = garmentTypes ?? [];

  const { data, isLoading } = useQuery<DesignDto[]>({
    queryKey: ["designs", filterGarmentId],
    queryFn: async () => {
      const params = filterGarmentId !== "All" ? { garmentTypeId: filterGarmentId } : {};
      return (await api.get("/api/designs", { params })).data;
    },
  });

  const designs = useMemo(() => {
    const all = data ?? [];
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter(
      (d) =>
        d.styleName.toLowerCase().includes(q) ||
        d.garmentTypeName.toLowerCase().includes(q) ||
        (d.category ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const effectiveGarmentTypeId =
    form.garmentTypeId || garments[0]?.id || "";

  const isEditing = panel !== null && panel !== "add";

  function openAdd() {
    setForm({ ...EMPTY_FORM, garmentTypeId: garments[0]?.id ?? "" });
    setFormError(null);
    setPanel("add");
  }

  function openEdit(d: DesignDto) {
    setForm({
      garmentTypeId: d.garmentTypeId,
      styleName: d.styleName,
      category: d.category ?? "",
      imageUrl: d.imageUrl ?? "",
      basePrice: d.basePrice != null ? String(d.basePrice) : "",
      description: "",
    });
    setFormError(null);
    setPanel(d);
  }

  function closePanel() {
    setPanel(null);
    setFormError(null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        garmentTypeId: effectiveGarmentTypeId,
        styleName: form.styleName,
        category: form.category || null,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        basePrice: form.basePrice ? parseFloat(form.basePrice) : null,
      };
      if (isEditing) {
        await api.put(`/api/designs/${(panel as DesignDto).id}`, {
          id: (panel as DesignDto).id,
          ...payload,
        });
      } else {
        await api.post("/api/designs", payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["designs"] });
      closePanel();
    },
    onError: () => setFormError("Could not save design. Try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/designs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["designs"] });
      setDeleteTarget(null);
    },
  });

  const addTypeMutation = useMutation({
    mutationFn: async (name: string) => api.post("/api/garment-types", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["garment-types"] });
      setNewTypeName("");
      setGtError(null);
      newTypeRef.current?.focus();
    },
    onError: () => setGtError("Could not add garment type. Name may already exist."),
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/garment-types/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["garment-types"] });
      qc.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  const inputStyle = {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: 12,
    padding: "6px 10px",
    outline: "none",
    width: "100%",
  } as React.CSSProperties;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 280 }}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text3)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search designs…"
            style={{ ...inputStyle, paddingLeft: 30 }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text3)" }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Garment type pills */}
        <div className="flex flex-wrap gap-1">
          {[{ id: "All", name: "All" }, ...garments].map((g) => {
            const active = g.id === filterGarmentId;
            return (
              <button key={g.id} type="button"
                onClick={() => setFilterGarmentId(g.id)}
                className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                style={{
                  background: active ? "var(--gold-dim)" : "var(--surface)",
                  color: active ? "var(--gold)" : "var(--text2)",
                  border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                }}>
                {g.name}
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Manage garment types */}
        <button type="button" onClick={() => setGtPanelOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}
          title="Manage garment types">
          <Settings2 size={13} /> Types
        </button>

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {(["table", "grid"] as ViewMode[]).map((m) => (
            <button key={m} type="button" onClick={() => setViewMode(m)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] transition-colors"
              style={{
                background: viewMode === m ? "var(--gold-dim)" : "var(--surface)",
                color: viewMode === m ? "var(--gold)" : "var(--text3)",
              }}>
              {m === "table" ? <LayoutList size={13} /> : <Grid size={13} />}
              {m === "table" ? "Table" : "Grid"}
            </button>
          ))}
        </div>

        <StyledButton onClick={openAdd}>
          <Plus size={12} /> Add design
        </StyledButton>
      </div>

      {/* Count */}
      <p className="text-[11px]" style={{ color: "var(--text3)" }}>
        {isLoading ? "Loading…" : `${designs.length} design${designs.length !== 1 ? "s" : ""}${search ? " (filtered)" : ""}`}
      </p>

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!isLoading && designs.length === 0 && (
        <div className="rounded-xl border p-10 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <Palette size={28} className="mx-auto mb-3" style={{ color: "var(--text3)" }} />
          <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text)" }}>
            {search ? "No designs match your search" : "No designs yet"}
          </p>
          {!search && (
            <div className="mt-4 flex justify-center">
              <StyledButton onClick={openAdd}><Plus size={12} /> Add first design</StyledButton>
            </div>
          )}
        </div>
      )}

      {/* ── Table view ──────────────────────────────────────────────── */}
      {!isLoading && designs.length > 0 && viewMode === "table" && (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)", width: 44 }}></th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Style Name</th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Garment</th>
                <th className="py-2.5 px-4 text-left font-medium" style={{ color: "var(--text2)" }}>Category</th>
                <th className="py-2.5 px-4 text-right font-medium" style={{ color: "var(--text2)" }}>Base Price</th>
                <th className="py-2.5 px-4 text-right font-medium" style={{ color: "var(--text2)", width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {designs.map((d, i) => (
                <tr key={d.id}
                  style={{
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)",
                    borderBottom: "1px solid var(--border)",
                  }}>
                  {/* Thumbnail */}
                  <td className="py-2 px-4">
                    {d.imageUrl ? (
                      <img src={d.imageUrl} alt={d.styleName}
                        className="rounded-md object-cover"
                        style={{ width: 28, height: 28 }} />
                    ) : (
                      <div className="rounded-md flex items-center justify-center"
                        style={{ width: 28, height: 28, background: "var(--border)" }}>
                        <Grid size={12} style={{ color: "var(--text3)" }} />
                      </div>
                    )}
                  </td>

                  {/* Style name */}
                  <td className="py-2 px-4 font-medium" style={{ color: "var(--text)" }}>
                    {d.styleName}
                  </td>

                  {/* Garment type */}
                  <td className="py-2 px-4">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
                      {d.garmentTypeName}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="py-2 px-4">
                    {d.category ? (
                      <span className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{ background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)" }}>
                        {d.category}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text3)" }}>—</span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="py-2 px-4 text-right font-semibold"
                    style={{ color: d.basePrice != null ? "var(--gold)" : "var(--text3)" }}>
                    {d.basePrice != null ? `₹${d.basePrice}` : "—"}
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(d)}
                        className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface2)]"
                        title="Edit"
                        style={{ color: "var(--text2)" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(d)}
                        className="rounded-lg p-1.5 transition-colors hover:bg-[rgba(224,85,85,0.12)]"
                        title="Delete"
                        style={{ color: "var(--text3)" }}>
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

      {/* ── Grid view ───────────────────────────────────────────────── */}
      {!isLoading && designs.length > 0 && viewMode === "grid" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {designs.map((d) => (
            <div key={d.id} className="group relative overflow-hidden rounded-xl border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              {/* Action buttons (visible on hover) */}
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(d)}
                  className="rounded-lg p-1.5 shadow-sm"
                  style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
                  title="Edit">
                  <Pencil size={12} />
                </button>
                <button onClick={() => setDeleteTarget(d)}
                  className="rounded-lg p-1.5 shadow-sm"
                  style={{ background: "var(--surface)", color: "rgba(224,85,85,0.8)", border: "1px solid var(--border)" }}
                  title="Delete">
                  <Trash2 size={12} />
                </button>
              </div>

              {d.imageUrl ? (
                <img src={d.imageUrl} alt={d.styleName} className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center" style={{ background: "var(--surface2)" }}>
                  <Grid size={24} style={{ color: "var(--text3)" }} />
                </div>
              )}

              <div className="p-3">
                <p className="text-[12px] font-semibold leading-none" style={{ color: "var(--text)" }}>{d.styleName}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    <span className="rounded-full px-2 py-0.5 text-[9px]"
                      style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
                      {d.garmentTypeName}
                    </span>
                    {d.category && (
                      <span className="rounded-full px-2 py-0.5 text-[9px]"
                        style={{ background: "var(--surface2)", color: "var(--text3)" }}>
                        {d.category}
                      </span>
                    )}
                  </div>
                  {d.basePrice != null && (
                    <p className="text-[11px] font-semibold" style={{ color: "var(--gold)" }}>₹{d.basePrice}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirmation dialog ───────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="rounded-xl p-6 w-[340px] shadow-xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>Delete design?</h3>
            <p className="text-[12px] mb-5" style={{ color: "var(--text2)" }}>
              <span className="font-medium" style={{ color: "var(--text)" }}>{deleteTarget.styleName}</span> will be
              removed from your catalog. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <StyledButton variant="ghost" type="button"
                onClick={() => setDeleteTarget(null)}>Cancel</StyledButton>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg px-4 py-1.5 text-[12px] font-medium transition-colors"
                style={{ background: "rgba(224,85,85,0.15)", color: "rgb(220,60,60)", border: "1px solid rgba(224,85,85,0.3)" }}>
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Garment types manager panel ─────────────────────────────── */}
      <SlidePanel open={gtPanelOpen} onClose={() => { setGtPanelOpen(false); setGtError(null); setNewTypeName(""); }}
        title="Manage Garment Types">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href="/settings/measurement-templates"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-90"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text2)" }}
              title="Configure measurement templates"
            >
              <Ruler size={13} />
              Measurement Templates
            </Link>
          </div>

          {/* Add new type */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newTypeName.trim()) addTypeMutation.mutate(newTypeName.trim());
            }}
            className="flex gap-2">
            <input
              ref={newTypeRef}
              value={newTypeName}
              onChange={(e) => { setNewTypeName(e.target.value); setGtError(null); }}
              placeholder="New garment type…"
              maxLength={100}
              className="flex-1 rounded-lg px-3 py-1.5 text-[12px]"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                outline: "none",
              }}
            />
            <StyledButton type="submit" loading={addTypeMutation.isPending}
              disabled={!newTypeName.trim()}>
              <Plus size={12} /> Add
            </StyledButton>
          </form>

          {gtError && (
            <p className="rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
              {gtError}
            </p>
          )}

          {/* List */}
          {garmentTypesLoading ? (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>Loading…</p>
          ) : garments.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>No garment types yet.</p>
          ) : (
            <ul className="space-y-1">
              {garments.map((g) => (
                <li key={g.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <span className="text-[12px]" style={{ color: "var(--text)" }}>{g.name}</span>
                  <button
                    onClick={() => deleteTypeMutation.mutate(g.id)}
                    disabled={deleteTypeMutation.isPending}
                    className="rounded-md p-1 transition-colors hover:bg-[rgba(224,85,85,0.12)]"
                    title="Remove"
                    style={{ color: "var(--text3)" }}>
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SlidePanel>

      {/* ── Add / Edit panel ────────────────────────────────────────── */}
      <SlidePanel open={panel !== null} onClose={closePanel}
        title={isEditing ? "Edit Design" : "Add Design"}>
        <form className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
          <FormField label="Garment type" required>
            {garments.length > 0 ? (
              <StyledSelect
                value={form.garmentTypeId || garments[0]?.id}
                onChange={(e) => setForm((f) => ({ ...f, garmentTypeId: e.target.value }))}
                disabled={garmentTypesLoading}>
                {garments.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </StyledSelect>
            ) : (
              <p className="text-[12px]" style={{ color: "var(--text3)" }}>
                {garmentTypesLoading ? "Loading garment types…" : "No garment types found."}
              </p>
            )}
          </FormField>

          <FormField label="Style name" required>
            <StyledInput placeholder="e.g. Round neck princess cut"
              value={form.styleName}
              onChange={(e) => setForm((f) => ({ ...f, styleName: e.target.value }))}
              required />
          </FormField>

          <FormField label="Category">
            <StyledSelect value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </StyledSelect>
          </FormField>

          <FormField label="Base price (₹)">
            <StyledInput type="number" min={0} placeholder="0"
              value={form.basePrice}
              onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
          </FormField>

          <FormField label="Image URL" hint="Paste a public image link">
            <StyledInput type="url" placeholder="https://…"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          </FormField>

          <FormField label="Description">
            <StyledInput placeholder="Short description…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>

          {formError && (
            <p className="rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
              {formError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={saveMutation.isPending}
              disabled={!effectiveGarmentTypeId}>
              {isEditing ? "Save changes" : "Add design"}
            </StyledButton>
            <StyledButton type="button" variant="ghost" onClick={closePanel}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
