"use client";

import { FormField, StyledButton, StyledInput } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Ruler, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type CustomerDto = { id: string; name: string; phone: string; city: string | null };
type GarmentTypeDto = { id: string; name: string; displayOrder: number };
type TemplateField = { fieldName: string; displayOrder: number; unit: string; isRequired: boolean };
type MeasurementOrderLink = { orderId: string; tokenNo: string };
type MeasurementDto = {
  id: string;
  garmentTypeId: string;
  garmentTypeName: string;
  measuredAt: string;
  isLatest: boolean;
  notes: string | null;
  values: { fieldName: string; value: number | null; notes: string | null }[];
  linkedOrders: MeasurementOrderLink[];
};

type RecordMode = "blank" | "copy";

type CustomerDetailResponse = {
  customer: { id: string; name: string; phone: string; city: string | null };
};

function isUuid(value: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function MeasurementsPageContent() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = useMemo(() => {
    const raw = searchParams.get("customerId");
    return isUuid(raw) ? raw : null;
  }, [searchParams]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [selectedGarmentId, setSelectedGarmentId] = useState<string>("");
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [recordMode, setRecordMode] = useState<RecordMode>("copy");
  const [measureValues, setMeasureValues] = useState<Record<string, string>>({});
  const [measureNotes, setMeasureNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [viewMeasurement, setViewMeasurement] = useState<MeasurementDto | null>(null);

  const { data: customerFromLink, isLoading: customerLinkLoading, isError: customerLinkError } = useQuery({
    queryKey: ["customer-for-measurements-link", customerIdParam],
    queryFn: async () => (await api.get(`/api/customers/${customerIdParam}`)).data as CustomerDetailResponse,
    enabled: !!customerIdParam,
    retry: 1,
  });

  useEffect(() => {
    if (!customerFromLink?.customer || !customerIdParam) return;
    const c = customerFromLink.customer;
    if (c.id !== customerIdParam) return;
    setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone, city: c.city ?? null });
    setCustomerSearch("");
  }, [customerFromLink, customerIdParam]);

  const { data: garmentTypes } = useQuery<GarmentTypeDto[]>({
    queryKey: ["garment-types"],
    queryFn: async () => (await api.get("/api/garment-types")).data,
  });

  const garments = garmentTypes ?? [];
  const effectiveGarmentId = selectedGarmentId || garments[0]?.id || "";
  const selectedGarmentName = garments.find((g) => g.id === effectiveGarmentId)?.name ?? "";

  const { data: customers } = useQuery<CustomerDto[]>({
    queryKey: ["customers-search-meas", customerSearch],
    queryFn: async () => {
      if (customerSearch.length < 2) return [];
      return (await api.get("/api/customers", { params: { search: customerSearch, pageSize: 8 } })).data.items;
    },
    enabled: customerSearch.length >= 2,
  });

  const { data: templates } = useQuery<TemplateField[]>({
    queryKey: ["meas-templates", effectiveGarmentId],
    queryFn: async () => (await api.get(`/api/measurements/templates/${effectiveGarmentId}`)).data,
    enabled: !!effectiveGarmentId,
  });

  const { data: existingMeasurements } = useQuery<MeasurementDto[]>({
    queryKey: ["customer-measurements", selectedCustomer?.id, effectiveGarmentId],
    queryFn: async () =>
      (await api.get(`/api/customers/${selectedCustomer!.id}/measurements`, { params: { garmentTypeId: effectiveGarmentId } })).data,
    enabled: !!selectedCustomer && !!effectiveGarmentId,
  });

  const sortedVersions = useMemo(
    () => (existingMeasurements ?? []).slice().sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()),
    [existingMeasurements],
  );

  const latestMeasurement = sortedVersions.find((m) => m.isLatest) ?? sortedVersions[0];

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/measurements", {
        customerId: selectedCustomer!.id,
        garmentTypeId: effectiveGarmentId,
        notes: measureNotes || null,
        values: Object.entries(measureValues)
          .filter(([, v]) => v !== "")
          .map(([fieldName, value]) => ({ fieldName, value: parseFloat(value), notes: null })),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-measurements"] });
      setEditPanelOpen(false);
      setMeasureValues({});
      setMeasureNotes("");
      setFormError(null);
    },
    onError: () => setFormError("Could not save measurements. Please try again."),
  });

  function selectCustomer(c: CustomerDto) {
    setSelectedCustomer(c);
    setCustomerSearch("");
    router.replace(`/measurements?customerId=${c.id}`, { scroll: false });
  }

  function clearCustomerSelection() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    router.replace("/measurements", { scroll: false });
  }

  function openRecordPanel(mode: RecordMode) {
    setRecordMode(mode);
    const prefill: Record<string, string> = {};
    if (mode === "copy" && latestMeasurement) {
      latestMeasurement.values.forEach((v) => {
        if (v.value != null) prefill[v.fieldName] = String(v.value);
      });
    }
    setMeasureValues(prefill);
    setMeasureNotes(mode === "copy" && latestMeasurement?.notes ? latestMeasurement.notes : "");
    setFormError(null);
    setEditPanelOpen(true);
  }

  const panelTitle =
    recordMode === "copy"
      ? `New ${selectedGarmentName} (from latest)`
      : `New ${selectedGarmentName} (blank)`;

  return (
    <div className="space-y-5">
      {/* Step 1: Pick Customer */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
          1. Select Customer
        </p>

        {customerIdParam && customerLinkLoading && !selectedCustomer && (
          <p className="mb-3 text-[12px]" style={{ color: "var(--text3)" }}>Loading customer from link…</p>
        )}

        {customerIdParam && customerLinkError && !selectedCustomer && (
          <p className="mb-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
            Could not load customer for this link. Use search below or go back to the customer profile.
          </p>
        )}

        {selectedCustomer ? (
          <div className="flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: "var(--gold)", background: "var(--gold-dim)" }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--gold)" }}>{selectedCustomer.name}</p>
              <p className="text-[10px]" style={{ color: "var(--text3)" }}>{selectedCustomer.phone}</p>
            </div>
            <button type="button" className="text-[11px]" style={{ color: "var(--text3)" }} onClick={clearCustomerSelection}>
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
            <StyledInput
              placeholder="Type name or phone to search…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9"
            />
            {(customers?.length ?? 0) > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border"
                style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                {customers!.map((c) => (
                  <button key={c.id} type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                    onClick={() => selectCustomer(c)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>{c.name[0]}</div>
                    <div>
                      <p className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{c.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text3)" }}>{c.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Pick Garment */}
      {selectedCustomer && (
        <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
            2. Garment Type
          </p>
          <div className="flex flex-wrap gap-2">
            {garments.map((g) => {
              const isActive = g.id === effectiveGarmentId;
              return (
                <button key={g.id} type="button" onClick={() => setSelectedGarmentId(g.id)}
                  className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-all"
                  style={{
                    background: isActive ? "var(--gold-dim)" : "var(--surface2)",
                    color: isActive ? "var(--gold)" : "var(--text2)",
                    border: `1px solid ${isActive ? "var(--gold)" : "var(--border)"}`,
                  }}>
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 */}
      {selectedCustomer && effectiveGarmentId && (
        <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
              3. {selectedGarmentName} Measurements
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StyledButton type="button" onClick={() => openRecordPanel("blank")}>
                <Ruler size={12} /> Add new (blank)
              </StyledButton>
              {latestMeasurement && (
                <StyledButton type="button" onClick={() => openRecordPanel("copy")}>
                  <Copy size={12} /> Copy from latest → new version
                </StyledButton>
              )}
            </div>
          </div>

          {!latestMeasurement ? (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>
              No measurements recorded for {selectedGarmentName} yet. Use <strong>Add new (blank)</strong> to record the first set.
            </p>
          ) : (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
                  Latest
                </span>
                <p className="text-[10px]" style={{ color: "var(--text3)" }}>
                  Recorded {new Date(latestMeasurement.measuredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              {latestMeasurement.notes && (
                <p className="mb-2 text-[11px]" style={{ color: "var(--text2)" }}>Notes: {latestMeasurement.notes}</p>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {latestMeasurement.values.map((v) => (
                  <div key={v.fieldName} className="rounded-lg p-2.5" style={{ background: "var(--surface2)" }}>
                    <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>{v.fieldName}</p>
                    <p className="mt-0.5 text-[15px] font-semibold" style={{ color: "var(--gold)" }}>
                      {v.value ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-[11px] font-medium"
                style={{ color: "var(--gold)" }}
                onClick={() => setViewMeasurement(latestMeasurement)}
              >
                View full snapshot…
              </button>
            </div>
          )}

          {/* Version history */}
          {sortedVersions.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text3)" }}>
                Version history
              </p>
              <p className="mb-2 text-[10px]" style={{ color: "var(--text3)" }}>
                Orders that used a version keep a link to that snapshot — see <strong>Linked orders</strong> below.
              </p>
              <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                      <th className="py-2 px-3 text-left font-medium" style={{ color: "var(--text2)" }}>Date</th>
                      <th className="py-2 px-3 text-left font-medium" style={{ color: "var(--text2)" }}>Fields</th>
                      <th className="py-2 px-3 text-left font-medium" style={{ color: "var(--text2)" }}>Linked orders</th>
                      <th className="py-2 px-3 text-right font-medium" style={{ color: "var(--text2)", width: 72 }}>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVersions.map((m, idx) => (
                      <tr key={m.id} style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {m.isLatest && (
                              <span className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
                                Latest
                              </span>
                            )}
                            <span style={{ color: "var(--text2)" }}>
                              {new Date(m.measuredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3" style={{ color: "var(--text3)" }}>{m.values.length}</td>
                        <td className="py-2 px-3">
                          {(m.linkedOrders?.length ?? 0) === 0 ? (
                            <span style={{ color: "var(--text3)" }}>—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(m.linkedOrders ?? []).map((lo) => (
                                <Link
                                  key={lo.orderId}
                                  href={`/orders/${lo.orderId}`}
                                  className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                                  style={{ background: "var(--surface2)", color: "var(--gold)", border: "1px solid var(--border)" }}
                                >
                                  {lo.tokenNo}
                                </Link>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setViewMeasurement(m)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1"
                            style={{ color: "var(--text2)", border: "1px solid var(--border)" }}
                          >
                            <Eye size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record / edit panel */}
      <SlidePanel open={editPanelOpen} onClose={() => { setEditPanelOpen(false); setFormError(null); }}
        title={panelTitle}
        subtitle={selectedCustomer?.name}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>
            {recordMode === "copy"
              ? "Values are copied from the latest version. Edit and save to create a new version (latest will move to this set)."
              : "Enter measurements from scratch. Saving creates a new version."}
          </p>
          {(templates ?? []).map((f) => (
            <FormField key={f.fieldName} label={`${f.fieldName} (${f.unit})`} required={f.isRequired}>
              <StyledInput
                type="number"
                step="0.5"
                placeholder={`e.g. 36`}
                value={measureValues[f.fieldName] ?? ""}
                onChange={(e) => setMeasureValues((v) => ({ ...v, [f.fieldName]: e.target.value }))}
                required={f.isRequired}
              />
            </FormField>
          ))}
          <FormField label="Notes">
            <StyledInput placeholder="Reason for change, trial notes…" value={measureNotes} onChange={(e) => setMeasureNotes(e.target.value)} />
          </FormField>
          {formError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
              {formError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={saveMutation.isPending}>Save as new version</StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setEditPanelOpen(false)}>Cancel</StyledButton>
          </div>
        </form>
      </SlidePanel>

      {/* Read-only snapshot viewer */}
      <SlidePanel
        open={viewMeasurement !== null}
        onClose={() => setViewMeasurement(null)}
        title={viewMeasurement ? `${selectedGarmentName} · ${new Date(viewMeasurement.measuredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
        subtitle={viewMeasurement?.isLatest ? "Latest version" : "Past version"}
      >
        {viewMeasurement && (
          <div className="space-y-4">
            {viewMeasurement.notes && (
              <p className="text-[12px]" style={{ color: "var(--text2)" }}><span style={{ color: "var(--text3)" }}>Notes:</span> {viewMeasurement.notes}</p>
            )}
            {(viewMeasurement.linkedOrders?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>Linked orders</p>
                <div className="flex flex-wrap gap-1.5">
                  {viewMeasurement.linkedOrders!.map((lo) => (
                    <Link
                      key={lo.orderId}
                      href={`/orders/${lo.orderId}`}
                      className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                      style={{ background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid var(--gold)" }}
                    >
                      {lo.tokenNo}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {viewMeasurement.values.map((v) => (
                <div key={v.fieldName} className="rounded-lg p-2.5" style={{ background: "var(--surface2)" }}>
                  <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>{v.fieldName}</p>
                  <p className="mt-0.5 text-[15px] font-semibold" style={{ color: "var(--gold)" }}>{v.value ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

export default function MeasurementsPage() {
  return (
    <Suspense fallback={<div className="py-8 text-[12px]" style={{ color: "var(--text3)" }}>Loading…</div>}>
      <MeasurementsPageContent />
    </Suspense>
  );
}
