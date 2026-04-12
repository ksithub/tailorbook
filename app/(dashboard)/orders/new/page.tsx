"use client";

import { FormField, StyledButton, StyledInput, StyledSelect, StyledTextarea } from "@/components/layout/FormField";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ExternalLink, Minus, Pencil, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

type CustomerDto = { id: string; name: string; phone: string; city: string | null };

type DesignDto = {
  id: string;
  garmentTypeId: string;
  garmentTypeName: string;
  styleName: string;
  category: string | null;
  imageUrl: string | null;
  basePrice: number | null;
};

/** API may send camelCase or PascalCase depending on config. */
function parseDesignDto(raw: unknown): DesignDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id ?? o.Id;
  const garmentTypeId = o.garmentTypeId ?? o.GarmentTypeId;
  if (typeof id !== "string" || typeof garmentTypeId !== "string") return null;
  const base = o.basePrice ?? o.BasePrice;
  return {
    id,
    garmentTypeId,
    garmentTypeName: String(o.garmentTypeName ?? o.GarmentTypeName ?? ""),
    styleName: String(o.styleName ?? o.StyleName ?? ""),
    category: (o.category ?? o.Category ?? null) as string | null,
    imageUrl: (o.imageUrl ?? o.ImageUrl ?? null) as string | null,
    basePrice: base == null ? null : Number(base),
  };
}

function parseDesignList(data: unknown): DesignDto[] {
  if (!Array.isArray(data)) return [];
  return data.map(parseDesignDto).filter((d): d is DesignDto => d != null);
}

type MeasurementValueDto = { fieldName: string; value: number | null; notes: string | null };
type LatestMeasurementDto = {
  id: string;
  garmentTypeId: string;
  garmentTypeName: string;
  measuredAt: string;
  notes: string | null;
  values: MeasurementValueDto[];
};

function normalizeLatestMeasurementPayload(data: unknown): LatestMeasurementDto | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const id = String(o.id ?? o.Id ?? "");
  const rawVals = o.values ?? o.Values;
  const values: MeasurementValueDto[] = [];
  if (Array.isArray(rawVals)) {
    for (const item of rawVals) {
      if (!item || typeof item !== "object") continue;
      const v = item as Record<string, unknown>;
      const fieldName = String(v.fieldName ?? v.FieldName ?? "");
      const val = v.value ?? v.Value;
      values.push({
        fieldName,
        value: val == null || val === "" ? null : Number(val),
        notes: (v.notes ?? v.Notes ?? null) as string | null,
      });
    }
  }
  return {
    id,
    garmentTypeId: String(o.garmentTypeId ?? o.GarmentTypeId ?? ""),
    garmentTypeName: String(o.garmentTypeName ?? o.GarmentTypeName ?? ""),
    measuredAt: String(o.measuredAt ?? o.MeasuredAt ?? ""),
    notes: (o.notes ?? o.Notes ?? null) as string | null,
    values,
  };
}
type TemplateField = { fieldName: string; displayOrder: number; unit: string; isRequired: boolean };

async function fetchMeasurementTemplatesNormalized(garmentTypeId: string): Promise<TemplateField[]> {
  const raw = (await api.get(`/api/measurements/templates/${garmentTypeId}`)).data as unknown;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      return {
        fieldName: String(r.fieldName ?? r.FieldName ?? ""),
        displayOrder: Number(r.displayOrder ?? r.DisplayOrder ?? 0),
        unit: String(r.unit ?? r.Unit ?? ""),
        isRequired: Boolean(r.isRequired ?? r.IsRequired),
      } as TemplateField;
    })
    .filter((t): t is TemplateField => t != null && t.fieldName.length > 0)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

type LineItem = {
  designId: string;
  /** Design catalog style name (shown on the order). */
  designStyleName: string;
  garmentTypeId: string;
  garmentTypeName: string;
  quantity: number;
  unitPrice: number;
  styleNotes: string;
  designImageUrl: string | null;
  /** Snapshot linked to this line when booking (optional until user saves measurements here). */
  measurementId: string | null;
};

const PRIORITIES = ["Normal", "Express", "Urgent"];
const FABRIC_SOURCES = ["Customer", "Shop"];

function isUuid(value: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type CustomerDetailResponse = { customer: { id: string; name: string; phone: string; city: string | null } };

function lineFromDesign(d: DesignDto | undefined): LineItem {
  if (!d) {
    return {
      designId: "",
      designStyleName: "",
      garmentTypeId: "",
      garmentTypeName: "",
      quantity: 1,
      unitPrice: 0,
      styleNotes: "",
      designImageUrl: null,
      measurementId: null,
    };
  }
  return {
    designId: d.id,
    designStyleName: d.styleName,
    garmentTypeId: d.garmentTypeId,
    garmentTypeName: d.garmentTypeName,
    quantity: 1,
    unitPrice: d.basePrice != null ? Number(d.basePrice) : 0,
    styleNotes: "",
    designImageUrl: d.imageUrl,
    measurementId: null,
  };
}

/** GST temporarily 0% (aligned with backend GstCalculator). */
function lineGstAmount(_qty: number, _unitPrice: number): number {
  return 0;
}

function orderTotals(items: LineItem[]) {
  let subtotal = 0;
  let gstTotal = 0;
  for (const it of items) {
    subtotal += it.quantity * it.unitPrice;
    gstTotal += lineGstAmount(it.quantity, it.unitPrice);
  }
  return { subtotal, gstTotal, total: subtotal + gstTotal };
}

function catalogPatch(d: DesignDto): Partial<LineItem> {
  return {
    designId: d.id,
    designStyleName: d.styleName,
    garmentTypeId: d.garmentTypeId,
    garmentTypeName: d.garmentTypeName,
    unitPrice: d.basePrice != null ? Number(d.basePrice) : 0,
    designImageUrl: d.imageUrl,
    measurementId: null,
  };
}

/** Inline summary + edit trigger for one order line */
function LineMeasurementsBlock(props: {
  customerId: string;
  line: LineItem;
  onOpenEdit: () => void;
}) {
  const { customerId, line, onOpenEdit } = props;
  const hasCustomer = !!customerId;

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["meas-templates", line.garmentTypeId],
    queryFn: () => fetchMeasurementTemplatesNormalized(line.garmentTypeId),
    enabled: !!line.garmentTypeId,
  });

  const { data: versionCount } = useQuery({
    queryKey: ["customer-meas-versions", customerId, line.garmentTypeId],
    queryFn: async () => {
      const r = await api.get(`/api/customers/${customerId}/measurements`, { params: { garmentTypeId: line.garmentTypeId } });
      return Array.isArray(r.data) ? r.data.length : 0;
    },
    enabled: hasCustomer && !!line.garmentTypeId,
  });

  const { data: latest } = useQuery({
    queryKey: ["latest-meas-order-line", customerId, line.garmentTypeId],
    queryFn: async (): Promise<LatestMeasurementDto | null> => {
      try {
        const r = await api.get(`/api/customers/${customerId}/measurements/latest/${line.garmentTypeId}`);
        return normalizeLatestMeasurementPayload(r.data);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 404) return null;
        throw e;
      }
    },
    enabled: hasCustomer && !!line.garmentTypeId,
  });

  if (!line.garmentTypeId) {
    return <p className="text-[10px]" style={{ color: "var(--text3)" }}>Choose a design from the catalog first.</p>;
  }

  const valueByField = new Map<string, number | null>();
  for (const v of latest?.values ?? []) {
    valueByField.set(v.fieldName, v.value);
  }

  const fieldsToShow: { fieldName: string; value: number | null | undefined; unit?: string }[] =
    (templates?.length ?? 0) > 0
      ? templates!.map((t) => ({
          fieldName: t.fieldName,
          unit: t.unit,
          value: valueByField.has(t.fieldName) ? valueByField.get(t.fieldName) : undefined,
        }))
      : (latest?.values ?? [])
          .filter((v) => v.value != null)
          .map((v) => ({ fieldName: v.fieldName, value: v.value }));

  const linkedToLatest = line.measurementId && latest?.id === line.measurementId;

  return (
    <div className="mt-3 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
          Measurements · {line.garmentTypeName}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {hasCustomer && (versionCount ?? 0) > 0 && (
            <span className="text-[9px]" style={{ color: "var(--text3)" }}>
              {versionCount} version{(versionCount ?? 0) !== 1 ? "s" : ""} on file
            </span>
          )}
          {hasCustomer && (
            <Link
              href={`/measurements?customerId=${customerId}`}
              className="inline-flex items-center gap-0.5 text-[9px] font-medium"
              style={{ color: "var(--gold)" }}
            >
              Full history <ExternalLink size={9} />
            </Link>
          )}
        </div>
      </div>

      {!hasCustomer && (
        <p className="mb-2 text-[10px]" style={{ color: "var(--text3)" }}>
          Select a customer above to load saved measurements for this garment type.
        </p>
      )}

      {templatesLoading && (
        <p className="mb-2 text-[11px]" style={{ color: "var(--text3)" }}>Loading measurement fields…</p>
      )}

      {!templatesLoading && fieldsToShow.length === 0 && (
        <p className="mb-2 text-[11px]" style={{ color: "var(--text3)" }}>
          No measurement template for this garment. Add fields under Settings → Measurement templates.
        </p>
      )}

      {fieldsToShow.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {fieldsToShow.map((cell) => {
            const show = cell.value != null && cell.value !== undefined;
            return (
              <div key={cell.fieldName} className="rounded-md px-2 py-1" style={{ background: "var(--surface2)" }}>
                <p className="text-[8px] uppercase" style={{ color: "var(--text3)" }}>
                  {cell.fieldName}
                  {cell.unit ? ` (${cell.unit})` : ""}
                </p>
                <p className="text-[12px] font-semibold" style={{ color: show ? "var(--gold)" : "var(--text3)" }}>
                  {show ? cell.value : "—"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {hasCustomer && !latest && !templatesLoading && (templates?.length ?? 0) > 0 && (
        <p className="mb-2 text-[10px]" style={{ color: "var(--text3)" }}>No saved set yet — values show “—” until you record measurements.</p>
      )}

      {line.measurementId && (
        <p className="mb-2 text-[9px]" style={{ color: linkedToLatest ? "var(--color-green)" : "var(--text3)" }}>
          {linkedToLatest
            ? "This line will use the latest saved measurement set."
            : "This line is linked to a specific saved measurement snapshot."}
        </p>
      )}

      <StyledButton
        type="button"
        variant="ghost"
        className="!px-2 !py-1 text-[11px]"
        disabled={!hasCustomer}
        onClick={onOpenEdit}
      >
        <Pencil size={11} /> {latest ? "Update / new version" : "Record measurements"}
      </StyledButton>
      {!hasCustomer && (
        <p className="mt-1 text-[9px]" style={{ color: "var(--text3)" }}>Choose a customer to record or update measurements.</p>
      )}
    </div>
  );
}

type MeasEditPanelProps = {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  garmentTypeId: string;
  garmentTypeName: string;
  onSaved: (measurementId: string) => void;
};

function MeasEditPanel({
  open,
  onClose,
  customerId,
  customerName,
  garmentTypeId,
  garmentTypeName,
  onSaved,
}: MeasEditPanelProps) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["meas-templates", garmentTypeId],
    queryFn: () => fetchMeasurementTemplatesNormalized(garmentTypeId),
    enabled: open && !!garmentTypeId,
  });

  const { data: latest } = useQuery({
    queryKey: ["latest-meas-panel", customerId, garmentTypeId],
    queryFn: async (): Promise<LatestMeasurementDto | null> => {
      try {
        const r = await api.get(`/api/customers/${customerId}/measurements/latest/${garmentTypeId}`);
        return normalizeLatestMeasurementPayload(r.data);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 404) return null;
        throw e;
      }
    },
    enabled: open && !!customerId && !!garmentTypeId,
  });

  useEffect(() => {
    if (!open) return;
    const pre: Record<string, string> = {};
    latest?.values?.forEach((v) => {
      if (v.value != null) pre[v.fieldName] = String(v.value);
    });
    setValues(pre);
    setNotes(latest?.notes ?? "");
    setErr(null);
  }, [open, latest]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const r = await api.post("/api/measurements", {
        customerId,
        garmentTypeId,
        notes: notes || null,
        values: Object.entries(values)
          .filter(([, v]) => v !== "")
          .map(([fieldName, value]) => ({ fieldName, value: parseFloat(value), notes: null })),
      });
      return r.data as string;
    },
    onSuccess: (measurementId) => {
      qc.invalidateQueries({ queryKey: ["latest-meas-order-line"] });
      qc.invalidateQueries({ queryKey: ["latest-meas-panel"] });
      qc.invalidateQueries({ queryKey: ["customer-meas-versions"] });
      qc.invalidateQueries({ queryKey: ["customer-measurements"] });
      onSaved(measurementId);
      onClose();
    },
    onError: () => setErr("Could not save measurements."),
  });

  return (
    <SlidePanel open={open} onClose={onClose} title={`${garmentTypeName} measurements`} subtitle={customerName}>
      <p className="mb-3 text-[11px]" style={{ color: "var(--text3)" }}>
        Saving creates a <strong>new version</strong> (previous versions stay in history). This order line will use the new snapshot.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate();
        }}
      >
        {(templates ?? []).map((f) => (
          <FormField key={f.fieldName} label={`${f.fieldName} (${f.unit})`} required={f.isRequired}>
            <StyledInput
              type="number"
              step="0.5"
              value={values[f.fieldName] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.fieldName]: e.target.value }))}
              required={f.isRequired}
            />
          </FormField>
        ))}
        <FormField label="Notes">
          <StyledInput placeholder="Trial / alteration note…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        {err && <p className="text-[12px]" style={{ color: "var(--color-red)" }}>{err}</p>}
        <div className="flex gap-2 pt-1">
          <StyledButton type="submit" loading={saveMut.isPending}>Save &amp; link to this line</StyledButton>
          <StyledButton type="button" variant="ghost" onClick={onClose}>Cancel</StyledButton>
        </div>
      </form>
    </SlidePanel>
  );
}

function NewOrderPageContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const customerIdParam = useMemo(() => {
    const raw = searchParams.get("customerId");
    return isUuid(raw) ? raw : null;
  }, [searchParams]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");

  const [deliveryDate, setDeliveryDate] = useState("");
  const [trialDate, setTrialDate] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [advance, setAdvance] = useState(0);
  const [isUdhar, setIsUdhar] = useState(false);
  const [fabricSource, setFabricSource] = useState("Customer");
  const [fabricNotes, setFabricNotes] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [measEditIndex, setMeasEditIndex] = useState<number | null>(null);

  const { data: customerFromLink, isLoading: customerLinkLoading } = useQuery({
    queryKey: ["customer-for-order-link", customerIdParam],
    queryFn: async () => (await api.get(`/api/customers/${customerIdParam}`)).data as CustomerDetailResponse,
    enabled: !!customerIdParam,
    retry: 1,
  });

  useEffect(() => {
    if (!customerFromLink?.customer || !customerIdParam) return;
    const c = customerFromLink.customer;
    if (c.id !== customerIdParam) return;
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerSearch("");
    router.replace(`/orders/new?customerId=${c.id}`, { scroll: false });
  }, [customerFromLink, customerIdParam, router]);

  const { data: designsData, isLoading: designsLoading } = useQuery<DesignDto[]>({
    queryKey: ["designs", "order-new"],
    queryFn: async () => parseDesignList((await api.get("/api/designs")).data),
  });

  const designs = useMemo(() => {
    const list = designsData ?? [];
    return [...list].sort((a, b) => {
      const g = a.garmentTypeName.localeCompare(b.garmentTypeName);
      if (g !== 0) return g;
      return a.styleName.localeCompare(b.styleName);
    });
  }, [designsData]);

  const designsReady = !designsLoading && designs.length > 0;

  useEffect(() => {
    if (!designsReady || items.length > 0) return;
    setItems([lineFromDesign(designs[0])]);
  }, [designsReady, designs, items.length]);

  const { data: searchResults } = useQuery({
    queryKey: ["customers-search", customerSearch],
    queryFn: async () => {
      if (customerSearch.length < 2) return [];
      const res = await api.get("/api/customers", { params: { search: customerSearch, pageSize: 8 } });
      return res.data.items as CustomerDto[];
    },
    enabled: customerSearch.length >= 2,
  });

  const quickCreateMutation = useMutation({
    mutationFn: async () => {
      const r = await api.post("/api/customers", {
        name: quickName.trim(),
        phone: quickPhone.trim(),
        alternatePhone: null,
        address: null,
        city: null,
        notes: null,
      });
      return r.data as string;
    },
    onSuccess: (id) => {
      setCustomerId(id);
      setCustomerName(quickName.trim());
      setQuickName("");
      setQuickPhone("");
      setDropdownOpen(false);
      setCustomerSearch("");
      qc.invalidateQueries({ queryKey: ["customers-search"] });
      router.replace(`/orders/new?customerId=${id}`, { scroll: false });
    },
    onError: () => setFormError("Could not create customer. Phone may already exist."),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { subtotal: totalAmount, gstTotal: gstAmount, total: grandTotal } = orderTotals(items);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/orders", {
        customerId,
        deliveryDate: new Date(deliveryDate).toISOString(),
        trialDate: trialDate ? new Date(trialDate).toISOString() : null,
        priority,
        items: items.map((it) => ({
          garmentType: it.designStyleName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          measurementId: it.measurementId,
          styleNotes: it.styleNotes || null,
          designImageUrl: it.designImageUrl,
          assignedTailorId: null,
        })),
        advanceAmount: advance,
        discountAmount: 0,
        isUdhar,
        specialNotes: specialNotes || null,
        fabricSource,
        fabricNotes: fabricNotes || null,
      });
    },
    onSuccess: () => router.push("/orders"),
    onError: () => setFormError("Could not book order. Please check all fields."),
  });

  function addItem() {
    setItems((prev) => [...prev, lineFromDesign(designs[0])]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const next = { ...it, ...patch };
        if (patch.designId !== undefined && patch.designId !== it.designId) {
          next.measurementId = null;
        }
        if (patch.garmentTypeId !== undefined && patch.garmentTypeId !== it.garmentTypeId) {
          next.measurementId = null;
        }
        return next;
      }),
    );
  }

  function selectCustomer(c: CustomerDto) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setDropdownOpen(false);
    setCustomerSearch("");
    router.replace(`/orders/new?customerId=${c.id}`, { scroll: false });
  }

  function clearCustomer() {
    setCustomerId("");
    setCustomerName("");
    setCustomerSearch("");
    router.replace("/orders/new", { scroll: false });
  }

  const showNoResults = dropdownOpen && customerSearch.length >= 2 && (searchResults?.length ?? 0) === 0 && !customerId;
  const canQuickAdd = quickName.trim().length > 0 && quickPhone.trim().length >= 10;

  const editingLine = measEditIndex !== null ? items[measEditIndex] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 1. Customer */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h3 className="mb-4 text-[13px] font-semibold" style={{ color: "var(--text)" }}>1. Select Customer</h3>

        {customerIdParam && customerLinkLoading && !customerId && (
          <p className="mb-3 text-[12px]" style={{ color: "var(--text3)" }}>Loading customer…</p>
        )}

        {customerId ? (
          <div className="flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: "var(--gold)", background: "var(--gold-dim)" }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--gold)" }}>{customerName}</p>
              <p className="text-[10px]" style={{ color: "var(--text3)" }}>Customer selected</p>
            </div>
            <button type="button" className="text-[11px]" style={{ color: "var(--text3)" }} onClick={clearCustomer}>
              Change
            </button>
          </div>
        ) : (
          <div ref={dropdownRef} className="relative space-y-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
              <StyledInput
                placeholder="Search customer by name or phone…"
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                className="pl-9"
              />
            </div>
            {dropdownOpen && (searchResults?.length ?? 0) > 0 && (
              <div
                className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-auto rounded-lg border"
                style={{ background: "var(--surface2)", borderColor: "var(--border)" }}
              >
                {searchResults!.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ color: "var(--text)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--gold-soft)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    onClick={() => selectCustomer(c)}
                  >
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{ background: "var(--gold-dim)", color: "var(--gold)" }}
                    >
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="text-[12px] font-medium leading-none">{c.name}</p>
                      <p className="mt-0.5 text-[10px] leading-none" style={{ color: "var(--text3)" }}>{c.phone}{c.city ? ` · ${c.city}` : ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showNoResults && (
              <div
                className="rounded-lg border p-4 space-y-3"
                style={{ background: "var(--surface2)", borderColor: "var(--border)" }}
              >
                <p className="text-[12px]" style={{ color: "var(--text3)" }}>No customer found. Add quickly with name and phone:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FormField label="Name" required>
                    <StyledInput value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="Customer name" required />
                  </FormField>
                  <FormField label="Phone" required>
                    <StyledInput value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} placeholder="10-digit mobile" required />
                  </FormField>
                </div>
                <StyledButton
                  type="button"
                  loading={quickCreateMutation.isPending}
                  disabled={!canQuickAdd}
                  onClick={() => { setFormError(null); quickCreateMutation.mutate(); }}
                >
                  Create customer &amp; continue
                </StyledButton>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Items */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>2. Design &amp; items</h3>
          <button type="button" onClick={addItem} className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--gold)" }} disabled={!designsReady}>
            <Plus size={12} /> Add item
          </button>
        </div>

        {designsLoading && <p className="text-[12px]" style={{ color: "var(--text3)" }}>Loading design catalog…</p>}
        {!designsLoading && designs.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>
            No designs in the catalog.{" "}
            <Link href="/designs" className="font-medium underline" style={{ color: "var(--gold)" }}>Add designs</Link>
            {" "}first (style name, garment type, base price).
          </p>
        )}

        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-lg border p-3" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
              <div className="grid grid-cols-3 gap-2">
                <FormField label="Design (catalog)">
                  <StyledSelect
                    value={it.designId}
                    onChange={(e) => {
                      const d = designs.find((x) => x.id === e.target.value);
                      if (d) updateItem(i, catalogPatch(d));
                    }}
                  >
                    {designs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.styleName}
                        {/*  — {d.garmentTypeName} */}
                       {/*  {d.category ? ` · ${d.category}` : ""} */}
                        {d.basePrice != null ? ` · ₹${d.basePrice}` : ""}
                      </option>
                    ))}
                  </StyledSelect>
                </FormField>
                <FormField label="Qty">
                  <StyledInput type="number" min={1} value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                </FormField>
                <FormField label="Unit price (₹)" hint="Filled from design; you can change it.">
                  <StyledInput type="number" min={0} step={1} value={it.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} />
                </FormField>
              </div>
              {it.designId && (
                <p className="mt-1.5 text-[10px]" style={{ color: "var(--text3)" }}>
                  Garment for measurements: <span className="font-medium" style={{ color: "var(--text2)" }}>{it.garmentTypeName}</span>
                </p>
              )}
              <div className="mt-2 flex items-end gap-2">
                <div className="flex-1">
                  <FormField label="Style notes">
                    <StyledInput placeholder="Design details, colour…" value={it.styleNotes} onChange={(e) => updateItem(i, { styleNotes: e.target.value })} />
                  </FormField>
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgba(224,85,85,0.1)", color: "var(--color-red)" }}>
                    <Minus size={12} />
                  </button>
                )}
              </div>

              {it.garmentTypeId && (
                <LineMeasurementsBlock
                  key={`${i}-${it.designId}-${it.garmentTypeId}`}
                  customerId={customerId}
                  line={it}
                  onOpenEdit={() => setMeasEditIndex(i)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col items-end gap-1">
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>Subtotal: ₹{totalAmount.toFixed(2)}</p>
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>GST (0%): ₹{gstAmount.toFixed(2)}</p>
          <p className="text-[14px] font-semibold" style={{ color: "var(--gold)" }}>Total: ₹{grandTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* 3. Order details */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h3 className="mb-4 text-[13px] font-semibold" style={{ color: "var(--text)" }}>3. Order Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Delivery date" required>
            <StyledInput type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
          </FormField>
          <FormField label="Trial date">
            <StyledInput type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} />
          </FormField>
          <FormField label="Priority">
            <StyledSelect value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </StyledSelect>
          </FormField>
          <FormField label="Fabric source">
            <StyledSelect value={fabricSource} onChange={(e) => setFabricSource(e.target.value)}>
              {FABRIC_SOURCES.map((f) => <option key={f} value={f}>{f}</option>)}
            </StyledSelect>
          </FormField>
          <FormField label="Advance collected (₹)">
            <StyledInput type="number" min={0} value={advance} onChange={(e) => setAdvance(Number(e.target.value))} />
          </FormField>
          <FormField label="Fabric notes">
            <StyledInput placeholder="Fabric details…" value={fabricNotes} onChange={(e) => setFabricNotes(e.target.value)} />
          </FormField>
        </div>

        <div className="mt-3">
          <FormField label="Special notes">
            <StyledTextarea placeholder="Any special instructions for the order…" value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} />
          </FormField>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <div
            className="relative h-5 w-9 rounded-full transition-colors"
            style={{ background: isUdhar ? "var(--gold)" : "var(--surface2)", border: "1px solid var(--border)" }}
            onClick={() => setIsUdhar((v) => !v)}
          >
            <div
              className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
              style={{ background: "white", transform: isUdhar ? "translateX(16px)" : "translateX(2px)" }}
            />
          </div>
          <span className="text-[12px]" style={{ color: "var(--text2)" }}>Mark as Udhar (credit)</span>
        </label>
      </div>

      {formError && (
        <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
          {formError}
        </p>
      )}

      <div className="flex gap-3">
        <StyledButton
          onClick={() => {
            if (!customerId) { setFormError("Please select or create a customer."); return; }
            if (!deliveryDate) { setFormError("Please set a delivery date."); return; }
            if (items.length === 0 || items.some((x) => !x.designId)) { setFormError("Please add at least one design from the catalog."); return; }
            setFormError(null);
            saveMutation.mutate();
          }}
          loading={saveMutation.isPending}
        >
          Book Order
        </StyledButton>
        <StyledButton variant="ghost" onClick={() => router.push("/orders")}>Cancel</StyledButton>
      </div>

      {editingLine && customerId && (
        <MeasEditPanel
          open={measEditIndex !== null}
          onClose={() => setMeasEditIndex(null)}
          customerId={customerId}
          customerName={customerName}
          garmentTypeId={editingLine.garmentTypeId}
          garmentTypeName={editingLine.garmentTypeName}
          onSaved={(measurementId) => {
            if (measEditIndex !== null) updateItem(measEditIndex, { measurementId });
          }}
        />
      )}
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-[12px]" style={{ color: "var(--text3)" }}>Loading…</div>}>
      <NewOrderPageContent />
    </Suspense>
  );
}
