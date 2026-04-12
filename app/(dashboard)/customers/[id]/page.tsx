"use client";

import { FormField, StyledButton, StyledInput, StyledTextarea } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarDays, ChevronRight, Loader2, MapPin,
  Phone, Ruler, ShoppingBag, Trash2, User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CustomerDetailDto = {
  customer: {
    id: string; name: string; phone: string; alternatePhone: string | null;
    address: string | null; city: string | null; notes: string | null;
    udharBalance: number; isActive: boolean; createdAt: string;
  };
  activeOrdersCount: number;
};

type OrderDto = { id: string; tokenNo: string; customerId: string; deliveryDate: string; status: string; totalAmount: number; balanceAmount: number };
type MeasurementDto = {
  id: string;
  garmentTypeName: string;
  measuredAt: string;
  isLatest: boolean;
  values: { fieldName: string; value: number | null }[];
};

const STATUS_COLORS: Record<string, string> = {
  Booked: "var(--color-blue)", Cutting: "var(--color-purple)", Stitching: "var(--color-teal)",
  Trial: "var(--gold)", Alteration: "var(--color-red)", Ready: "var(--color-green)",
  Delivered: "var(--text3)", Cancelled: "var(--text3)",
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editPanel, setEditPanel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", alternatePhone: "", address: "", city: "", notes: "" });

  const { data, isLoading } = useQuery<CustomerDetailDto>({
    queryKey: ["customer", id],
    queryFn: async () => (await api.get(`/api/customers/${id}`)).data,
  });

  const { data: orders } = useQuery<{ items: OrderDto[] }>({
    queryKey: ["customer-orders", id],
    queryFn: async () => (await api.get("/api/orders", { params: { pageSize: 30 } })).data,
    select: (d) => ({ items: d.items.filter((o: OrderDto) => o.customerId === id) }),
  });

  const { data: measurements } = useQuery<MeasurementDto[]>({
    queryKey: ["customer-measurements-detail", id],
    queryFn: async () => (await api.get(`/api/customers/${id}/measurements`)).data,
  });

  useEffect(() => {
    if (data?.customer) {
      const c = data.customer;
      setForm({ name: c.name, phone: c.phone, alternatePhone: c.alternatePhone ?? "", address: c.address ?? "", city: c.city ?? "", notes: c.notes ?? "" });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => api.put(`/api/customers/${id}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer", id] }); qc.invalidateQueries({ queryKey: ["customers"] }); setEditPanel(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/api/customers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); router.push("/customers"); },
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 py-8" style={{ color: "var(--text3)" }}><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }

  if (!data) {
    return (
      <div className="py-8 text-center">
        <p style={{ color: "var(--text3)" }}>Customer not found.</p>
        <Link href="/customers" className="mt-2 block text-[12px]" style={{ color: "var(--gold)" }}>← Back</Link>
      </div>
    );
  }

  const c = data.customer;
  const latestMeasurements = (measurements ?? []).filter((m) => m.isLatest);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Back */}
      <Link href="/customers" className="flex items-center gap-1.5 text-[11px] w-fit" style={{ color: "var(--text3)" }}>
        <ArrowLeft size={11} /> All customers
      </Link>

      {/* Profile card */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-[20px] font-bold flex-shrink-0"
              style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>{c.name[0]}</div>
            <div>
              <h1 className="text-[18px] font-bold leading-none" style={{ color: "var(--text)" }}>{c.name}</h1>
              <div className="mt-1.5 flex flex-wrap gap-3">
                <div className="flex items-center gap-1">
                  <Phone size={10} style={{ color: "var(--text3)" }} />
                  <p className="text-[11px]" style={{ color: "var(--text2)" }}>{c.phone}</p>
                </div>
                {c.alternatePhone && (
                  <div className="flex items-center gap-1">
                    <Phone size={10} style={{ color: "var(--text3)" }} />
                    <p className="text-[11px]" style={{ color: "var(--text2)" }}>{c.alternatePhone}</p>
                  </div>
                )}
                {(c.city || c.address) && (
                  <div className="flex items-center gap-1">
                    <MapPin size={10} style={{ color: "var(--text3)" }} />
                    <p className="text-[11px]" style={{ color: "var(--text2)" }}>{[c.city, c.address].filter(Boolean).join(", ")}</p>
                  </div>
                )}
              </div>
              {c.notes && <p className="mt-1.5 text-[11px]" style={{ color: "var(--text3)" }}>{c.notes}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <StyledButton onClick={() => setEditPanel(true)}><User size={11} /> Edit</StyledButton>
            <StyledButton variant="danger" onClick={() => setDeleteConfirm(true)}><Trash2 size={11} /></StyledButton>
          </div>
        </div>

        {c.udharBalance > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-lg px-4 py-2.5"
            style={{ background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.2)" }}>
            <p className="text-[12px]" style={{ color: "var(--color-red)" }}>Udhar balance outstanding</p>
            <p className="text-[15px] font-bold" style={{ color: "var(--color-red)" }}>{formatInr(c.udharBalance)}</p>
          </div>
        )}

        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={11} style={{ color: "var(--text3)" }} />
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              Since {new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <ShoppingBag size={11} style={{ color: "var(--text3)" }} />
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>{data.activeOrdersCount} active order{data.activeOrdersCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Measurements summary */}
      <div className="rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
            <Ruler size={10} className="inline mr-1.5" />Measurements
          </p>
          <Link href={`/measurements?customerId=${id}`} className="text-[11px]" style={{ color: "var(--gold)" }}>
            Record / update →
          </Link>
        </div>
        <div className="p-5">
          {latestMeasurements.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>No measurements recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {latestMeasurements.map((m) => (
                <div key={m.id} className="rounded-lg border px-3 py-2" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                  <p className="text-[10px] font-semibold" style={{ color: "var(--gold)" }}>{m.garmentTypeName}</p>
                  <p className="mt-0.5 text-[9px]" style={{ color: "var(--text3)" }}>{m.values.length} fields · {new Date(m.measuredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders */}
      <div className="rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
            <ShoppingBag size={10} className="inline mr-1.5" />Orders
          </p>
          <Link href={`/orders/new?customerId=${id}`} className="text-[11px]" style={{ color: "var(--gold)" }}>New order →</Link>
        </div>
        <div className="p-5">
          {(orders?.items ?? []).length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>No orders found for this customer.</p>
          ) : (
            <div className="space-y-2">
              {(orders?.items ?? []).map((o) => {
                const statusColor = STATUS_COLORS[o.status] ?? "var(--text3)";
                return (
                  <Link key={o.id} href={`/orders/${o.id}`}
                    className="flex items-center justify-between rounded-lg px-4 py-2.5 transition-colors"
                    style={{ background: "var(--surface2)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold" style={{ color: "var(--gold)" }}>#{o.tokenNo}</span>
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                          style={{ background: `${statusColor}22`, color: statusColor }}>{o.status}</span>
                      </div>
                      <p className="mt-0.5 text-[10px]" style={{ color: "var(--text3)" }}>
                        Due {new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-[11px]" style={{ color: o.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                        {o.balanceAmount > 0 ? formatInr(o.balanceAmount) + " due" : "Paid"}
                      </p>
                      <ChevronRight size={11} style={{ color: "var(--text3)" }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Panel */}
      <SlidePanel open={editPanel} onClose={() => setEditPanel(false)} title="Edit Customer" subtitle={c.name}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
          <FormField label="Full name" required>
            <StyledInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </FormField>
          <FormField label="Phone" required>
            <StyledInput type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
          </FormField>
          <FormField label="Alternate phone">
            <StyledInput type="tel" value={form.alternatePhone} onChange={(e) => setForm((f) => ({ ...f, alternatePhone: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="City">
              <StyledInput value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </FormField>
            <FormField label="Address">
              <StyledInput value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Notes">
            <StyledTextarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={saveMutation.isPending}>Save changes</StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setEditPanel(false)}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>

      {/* Delete confirm panel */}
      <SlidePanel open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete Customer">
        <div className="space-y-4">
          <div className="rounded-lg border p-3" style={{ background: "rgba(224,85,85,0.08)", borderColor: "rgba(224,85,85,0.3)" }}>
            <p className="text-[12px]" style={{ color: "var(--color-red)" }}>
              Deleting <strong>{c.name}</strong> will remove their profile. Their orders will remain in the system.
            </p>
          </div>
          <div className="flex gap-2">
            <StyledButton variant="danger" onClick={() => deleteMutation.mutate()} loading={deleteMutation.isPending}>
              <Trash2 size={12} /> Delete customer
            </StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setDeleteConfirm(false)}>Cancel</StyledButton>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
