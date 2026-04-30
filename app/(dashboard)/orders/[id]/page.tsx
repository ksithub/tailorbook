"use client";

import { FormField, StyledButton, StyledInput, StyledSelect } from "@/components/layout/FormField";
import { Modal } from "@/components/layout/Modal";
import { SlidePanel } from "@/components/layout/SlidePanel";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/utils";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useAuthStore } from "@/stores/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CreditCard,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pencil,
  Phone,
  Printer,
  Ruler,
  Tag,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type PropsWithChildren } from "react";

/** Avoid duplicate auto-invoice under React StrictMode remount. */
const autoInvoiceTriggeredFor = new Set<string>();

/* ─── Types ─────────────────────────────────────────────────────────────── */
type OrderLineItemDto = {
  id: string;
  garmentType: string;
  quantity: number;
  unitPrice: number | null;
  styleNotes: string | null;
  measurementId: string | null;
  assignedTailorId?: string | null;
  assignedTailorName?: string | null;
};

type OrderDetailDto = {
  id: string;
  tokenNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  orderDate: string;
  trialDate: string | null;
  deliveryDate: string;
  priority: string;
  status: string;
  totalAmount: number;
  advancePaid: number;
  balanceAmount: number;
  invoiceNo: string | null;
  gstAmount: number;
  gstRate: number;
  items: OrderLineItemDto[];
};

type PaymentEntry = { id: string; amount: number; mode: string; type: string; paidAt: string };

type MeasurementDetailDto = {
  id: string;
  garmentTypeName: string;
  measuredAt: string;
  notes: string | null;
  isLatest: boolean;
  values: { fieldName: string; value: number | null }[];
};

/* ─── Constants ──────────────────────────────────────────────────────────── */
/** Matches backend OrderStatusRules main flow (includes optional Alteration). */
const STATUS_PIPELINE = ["Booked", "Cutting", "Stitching", "Trial", "Alteration", "Ready", "Delivered"] as const;

const STATUS_COLORS: Record<string, string> = {
  Booked: "var(--color-blue)",
  Cutting: "var(--color-purple)",
  Stitching: "var(--color-teal)",
  Trial: "var(--gold)",
  Alteration: "var(--color-red)",
  Ready: "var(--color-green)",
  Delivered: "var(--color-green)",
  Cancelled: "var(--text3)",
};

const PAYMENT_MODES = ["Cash", "UPI", "Card", "BankTransfer"];
const PAYMENT_TYPES = ["Full", "Advance", "Partial", "Others"] as const;

const ALL_STATUSES = ["Booked", "Cutting", "Stitching", "Trial", "Alteration", "Ready", "Delivered"] as const;

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);
  return ref;
}

function HeaderIconTooltip({ label }: { label: string }) {
  return (
    <span
      className="pointer-events-none absolute bottom-full left-1/2 z-[60] mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      style={{
        background: "var(--surface)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
      }}
      role="tooltip"
    >
      {label}
    </span>
  );
}

function HeaderIconButton({
  label,
  variant = "default",
  children,
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: "default" | "gold" }
>) {
  const style: CSSProperties =
    variant === "gold"
      ? { background: "var(--gold)", color: "var(--on-gold)", borderColor: "rgba(232,168,74,0.35)" }
      : { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text2)" };
  return (
    <button
      type="button"
      aria-label={label}
      className="group relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-opacity hover:opacity-90 disabled:opacity-50"
      style={style}
      {...props}
    >
      {children}
      <HeaderIconTooltip label={label} />
    </button>
  );
}

function HeaderIconLink({ href, label, children }: PropsWithChildren<{ href: string; label: string }>) {
  return (
    <a
      href={href}
      aria-label={label}
      className="group relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-opacity hover:opacity-90"
      style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text2)" }}
    >
      {children}
      <HeaderIconTooltip label={label} />
    </a>
  );
}

function allowedNextStatuses(current: string): string[] {
  if (current === "Cancelled" || current === "Delivered") return [];
  const flow = [...STATUS_PIPELINE] as readonly string[];
  const i = flow.indexOf(current);
  if (i < 0) return [];
  const next: string[] = [];
  if (i + 1 < flow.length) next.push(flow[i + 1]!);
  if (current === "Alteration" && !next.includes("Stitching")) next.push("Stitching");
  return [...new Set(next)];
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "var(--text3)";
  return (
    <span
      className="rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{ background: `${color}22`, color }}
    >
      {status}
    </span>
  );
}

function Widget({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div
        className="flex items-center justify-between gap-3 border-b px-5 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[1.5px]"
          style={{ color: "var(--text3)" }}
        >
          {title}
        </p>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

async function openOrderInvoicePdf(orderId: string) {
  const res = await api.get(`/api/orders/${orderId}/invoice/pdf`, { responseType: "blob" });
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  /* if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${orderId}.pdf`;
    a.click();
  } */
  
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function openOrderJobCardPdf(orderId: string) {
  // Order details print should include ALL items, so no tailor filter here.
  const res = await api.get(`/api/orders/${orderId}/jobcard/pdf`, { responseType: "blob" });
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function LineMeasurementPanelBody({ measurementId }: { measurementId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["measurement", measurementId],
    queryFn: async () => (await api.get(`/api/measurements/${measurementId}`)).data as MeasurementDetailDto,
    enabled: !!measurementId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4" style={{ color: "var(--text3)" }}>
        <Loader2 size={14} className="animate-spin" /> Loading measurements…
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-[12px]" style={{ color: "var(--color-red)" }}>Could not load this measurement snapshot.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px]" style={{ color: "var(--text3)" }}>
        {data.garmentTypeName}
        {" · "}
        {new Date(data.measuredAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        {data.isLatest && (
          <span className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>
            Latest
          </span>
        )}
      </p>
      {data.notes && <p className="text-[11px]" style={{ color: "var(--text2)" }}>Notes: {data.notes}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.values.map((v) => (
          <div key={v.fieldName} className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
            <p className="text-[9px] uppercase" style={{ color: "var(--text3)" }}>{v.fieldName}</p>
            <p className="text-[14px] font-semibold" style={{ color: "var(--gold)" }}>{v.value ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const router = useRouter();

  const [paymentPanel, setPaymentPanel] = useState(false);
  const [cancelPanel, setCancelPanel] = useState(false);
  const [linePanel, setLinePanel] = useState<OrderLineItemDto | null>(null);
  const [deletePanel, setDeletePanel] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", mode: "Cash", type: "Balance", upiRef: "", notes: "" });
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useOutsideClose(menuOpen, () => setMenuOpen(false));

  const { data: order, isLoading } = useQuery<OrderDetailDto>({
    queryKey: ["order", id],
    queryFn: async () => (await api.get(`/api/orders/${id}`)).data,
  });

  // IMPORTANT: Hooks must run on every render (before early returns).
  const orderStatus = order?.status ?? "Booked";
  const invoiceReady = !!order?.invoiceNo;
  const menuStatusItems = useMemo(() => {
    const base = [...ALL_STATUSES] as readonly string[];
    // Allow moving back/forth by design (force=true)
    return base.filter((s) => s !== "Delivered" || orderStatus !== "Cancelled");
  }, [orderStatus]);

  const { data: payments } = useQuery<PaymentEntry[]>({
    queryKey: ["order-payments", id],
    queryFn: async () => (await api.get(`/api/payments/order/${id}`)).data,
  });

  const invoiceMutation = useMutation({
    mutationFn: async () => api.post(`/api/orders/${id}/invoice`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      setActionError(null);
    },
    onError: () => setActionError("Invoice generation failed."),
  });

  const pendingStatusNotify = useRef<{ from: string; to: string } | null>(null);

  useEffect(() => {
    if (!order || !id) return;
    const done = order.status === "Delivered" || order.status === "Cancelled";
    if (done || order.invoiceNo) return;
    if (autoInvoiceTriggeredFor.has(order.id)) return;
    autoInvoiceTriggeredFor.add(order.id);
    invoiceMutation.mutate();
  }, [order, id, invoiceMutation]);

  const payMutation = useMutation({
    mutationFn: async () =>
      api.post("/api/payments", {
        orderId: id,
        amount: parseFloat(payForm.amount),
        mode: payForm.mode,
        type: payForm.type,
        uPIRef: payForm.upiRef || null,
        notes: payForm.notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["order-payments", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setPaymentPanel(false);
      setPayForm({ amount: "", mode: "Cash", type: "Balance", upiRef: "", notes: "" });
      setActionError(null);
    },
    onError: () => setActionError("Payment failed. Check amount and try again."),
  });

  const dueAmount = Math.max(0, Number(order?.balanceAmount ?? 0));
  const enteredAmount = Number(payForm.amount || 0);
  const isExcessPayment = payForm.type !== "Refund" && enteredAmount > 0 && enteredAmount > dueAmount;

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      pendingStatusNotify.current = { from: order?.status ?? "", to: newStatus };
      return api.patch(`/api/orders/${id}/status`, { status: newStatus, notes: null, force: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["kanban"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setActionError(null);
      const p = pendingStatusNotify.current;
      pendingStatusNotify.current = null;
      if (p && ["Booked", "Trial", "Ready"].includes(p.to)) openOrderWhatsApp(p.to, p.from);
    },
    onError: () => setActionError("Status update failed."),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => api.post(`/api/orders/${id}/cancel`, { reason: cancelReason || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      setCancelPanel(false);
    },
    onError: () => setActionError("Cancel failed. Try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/api/orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["kanban"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/orders");
    },
    onError: () => setActionError("Delete failed. Try again."),
  });

  function openOrderWhatsApp(toStatus?: string, fromStatus?: string) {
    if (!order?.customerPhone) return;
    const itemLines = (order.items ?? []).map((it) => `${it.garmentType} × ${it.quantity}`);
    const msg = buildWhatsAppMessage({
      tokenNo: order.tokenNo,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      itemLines,
      fromStatus: fromStatus ?? order.status,
      toStatus: toStatus ?? order.status,
      shopName: useAuthStore.getState().user?.companyName ?? "Shop",
      shopPhone: null,
      totalAmount: order.totalAmount ?? null,
      dueAmount: order.balanceAmount ?? null,
    });
    const url = buildWhatsAppUrl(order.customerPhone, msg);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handlePrintInvoice() {
    if (!order) return;
    await openOrderInvoicePdf(order.id);
    // Only triggers for Booked/Trial/Ready based on centralized template rules.
    // comment by biren , whatsapp temporary disabled
    //openOrderWhatsApp(order.status, order.status);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8" style={{ color: "var(--text3)" }}>
        <Loader2 size={16} className="animate-spin" /> Loading order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-8 text-center">
        <p className="text-[13px]" style={{ color: "var(--text3)" }}>Order not found.</p>
        <Link href="/orders" className="mt-2 block text-[12px]" style={{ color: "var(--gold)" }}>
          ← Back to orders
        </Link>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = order.deliveryDate.slice(0, 10) < today && !["Delivered", "Cancelled"].includes(order.status);
  const isDone = ["Delivered", "Cancelled"].includes(order.status);
  const gstAmount = order.gstAmount ?? 0;
  const gstRatePct = order.gstRate ?? 0;
  const baseAmount = order.totalAmount - gstAmount;
  const nextOptions = allowedNextStatuses(order.status);
  const currentPipelineIndex = (STATUS_PIPELINE as readonly string[]).indexOf(order.status);
  const prevStatus =
    currentPipelineIndex > 0 ? (STATUS_PIPELINE as readonly string[])[currentPipelineIndex - 1] : null;
  const nextStatus = nextOptions.length > 0 ? nextOptions[0] : null;
  const canRecordPayment = !isDone && order.balanceAmount > 0;
  const canEditOrder = !["Delivered", "Cancelled"].includes(order.status) && (order.advancePaid ?? 0) <= 0;
  const telDigits = order.customerPhone ? order.customerPhone.replace(/\D/g, "") : "";

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div>
        <Link href="/orders" className="mb-3 flex w-fit items-center gap-1.5 text-[11px]" style={{ color: "var(--text3)" }}>
          <ArrowLeft size={11} /> All orders
        </Link>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-[20px] font-bold" style={{ color: "var(--gold)" }}>#{order.tokenNo}</h1>
              <StatusBadge status={order.status} />
              {isOverdue && (
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                  style={{ background: "rgba(224,85,85,0.15)", color: "var(--color-red)" }}
                >
                  <AlertTriangle size={9} /> Overdue
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] font-medium" style={{ color: "var(--text)" }}>{order.customerName}</p>
            {order.customerPhone && <p className="text-[11px]" style={{ color: "var(--text3)" }}>{order.customerPhone}</p>}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            {telDigits.length > 0 && (
              <HeaderIconLink href={`tel:${telDigits}`} label="Call">
                <Phone size={16} strokeWidth={2} />
              </HeaderIconLink>
            )}
            {!isDone && (
              <>
                <HeaderIconButton
                  label="WhatsApp"
                  variant="gold"
                  onClick={() => openOrderWhatsApp()}
                >
                  <MessageCircle size={16} strokeWidth={2} />
                </HeaderIconButton>
                <HeaderIconButton label="Print invoice" onClick={() => void handlePrintInvoice()}>
                  <Printer size={16} strokeWidth={2} />
                </HeaderIconButton>
              </>
            )}
            <div className="relative ml-0.5" ref={menuRef}>
            <button
              type="button"
              className="group relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text2)" }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Order actions"
            >
              <MoreVertical size={16} />
              <HeaderIconTooltip label="More actions" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border shadow-lg"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="p-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] disabled:opacity-50"
                    style={{ color: "var(--text)" }}
                    disabled={!canEditOrder}
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(`/orders/${id}/edit`);
                    }}
                  >
                    <Pencil size={14} /> Edit order
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] disabled:opacity-50"
                    style={{ color: "var(--text)" }}
                    disabled={!canRecordPayment}
                    onClick={() => {
                      setMenuOpen(false);
                      setPaymentPanel(true);
                      setPayForm((f) => ({
                        ...f,
                        type: "Balance",
                        amount: order.balanceAmount > 0 ? String(order.balanceAmount) : "",
                      }));
                    }}
                  >
                    <CreditCard size={14} /> Record payment
                    {!canRecordPayment && <span className="ml-auto text-[10px]" style={{ color: "var(--text3)" }}></span>}
                  </button>

                  <div className="my-2 border-t" style={{ borderColor: "var(--border)" }} />

                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
                    Status
                  </p>
                  <div className="max-h-48 overflow-auto">
                    {menuStatusItems.map((s) => {
                      const active = s === order.status;
                      return (
                        <button
                          key={s}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px]"
                          style={{
                            background: active ? "var(--gold-dim)" : "transparent",
                            color: active ? "var(--gold)" : "var(--text)",
                          }}
                          onClick={() => {
                            setMenuOpen(false);
                            statusMutation.mutate(s);
                          }}
                        >
                          {active ? <Check size={14} /> : <span className="h-[14px] w-[14px]" />}
                          {s}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px]"
                      style={{
                        background: order.status === "Cancelled" ? "rgba(224,85,85,0.10)" : "transparent",
                        color: order.status === "Cancelled" ? "var(--color-red)" : "var(--text)",
                      }}
                      onClick={() => {
                        setMenuOpen(false);
                        setCancelPanel(true);
                      }}
                      disabled={isDone}
                    >
                      <XCircle size={14} /> Cancel order
                    </button>
                  </div>

                  <div className="my-2 border-t" style={{ borderColor: "var(--border)" }} />

                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] disabled:opacity-50"
                    style={{ color: "var(--text)" }}
                    disabled={!invoiceReady}
                    onClick={() => {
                      setMenuOpen(false);
                      void handlePrintInvoice();
                    }}
                  >
                    <FileText size={14} /> Print invoice
                    {!invoiceReady && <span className="ml-auto text-[10px]" style={{ color: "var(--text3)" }}>Generating…</span>}
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] disabled:opacity-50"
                    style={{ color: "var(--text)" }}
                    onClick={() => {
                      setMenuOpen(false);
                      void openOrderJobCardPdf(order.id);
                    }}
                  >
                    <Download size={14} /> Print job card
                  </button>

                  <div className="my-2 border-t" style={{ borderColor: "var(--border)" }} />

                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] disabled:opacity-50"
                    style={{ color: "var(--color-red)" }}
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      setMenuOpen(false);
                      setDeletePanel(true);
                    }}
                  >
                    <AlertTriangle size={14} /> Delete 
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      <Modal
        open={deletePanel}
        onClose={() => setDeletePanel(false)}
        title="Delete order?"
        subtitle={order ? `#${order.tokenNo} · ${order.customerName}` : ""}
      >
        <div className="space-y-4">
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>
            This will remove the order from the system (soft delete). You can’t undo this from the UI.
          </p>
          {actionError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
              {actionError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton
              type="button"
              loading={deleteMutation.isPending}
              onClick={() => {
                setActionError(null);
                deleteMutation.mutate();
              }}
              className="!bg-[rgba(224,85,85,0.16)]"
              style={{ color: "var(--color-red)" }}
            >
              <AlertTriangle size={12} /> Delete
            </StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setDeletePanel(false)}>
              Cancel
            </StyledButton>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Order date",
            value: new Date(order.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
            icon: CalendarDays,
          },
          {
            label: "Delivery due",
            value: new Date(order.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
            icon: Truck,
            alert: isOverdue,
          },
          { label: "Priority", value: order.priority, icon: Tag },
        ].map(({ label, value, icon: Icon, alert }) => (
          <div key={label} className="rounded-xl border p-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="mb-1 flex items-center gap-1.5">
              <Icon size={10} style={{ color: alert ? "var(--color-red)" : "var(--text3)" }} />
              <p className="text-[9px] uppercase tracking-wide" style={{ color: alert ? "var(--color-red)" : "var(--text3)" }}>{label}</p>
            </div>
            <p className="text-[12px] font-semibold" style={{ color: alert ? "var(--color-red)" : "var(--text)" }}>{value}</p>
          </div>
        ))}
        <button
          type="button"
          className="rounded-xl border p-3 text-left transition-opacity hover:opacity-90 disabled:cursor-default"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          disabled={!order.invoiceNo}
          onClick={() => {
            if (order.invoiceNo) void openOrderInvoicePdf(order.id);
          }}
          title={order.invoiceNo ? "Open invoice PDF" : "Invoice will generate automatically"}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <FileText size={10} style={{ color: "var(--text3)" }} />
            <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>Invoice</p>
          </div>
          <p className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{order.invoiceNo ?? "Generating…"}</p>
          {/* {order.invoiceNo && (
            <p className="mt-1 text-[9px]" style={{ color: "var(--gold)" }}>Click to open PDF</p>
          )} */}
        </button>
      </div>

      {!isDone && (
        <Widget
          title="Current Order Status"
          right={
            <div className="flex items-center gap-2">
              <StyledButton
                type="button"
                variant="ghost"
                className="!h-8 !px-2 text-[11px]"
                disabled={!prevStatus || statusMutation.isPending}
                onClick={() => {
                  if (!prevStatus) return;
                  setActionError(null);
                  statusMutation.mutate(prevStatus);
                }}
              >
                Prev
              </StyledButton>
              <StyledButton
                type="button"
                className="!h-8 !px-2 text-[11px]"
                disabled={!nextStatus || statusMutation.isPending}
                onClick={() => {
                  if (!nextStatus) return;
                  setActionError(null);
                  statusMutation.mutate(nextStatus);
                }}
              >
                Next
              </StyledButton>
            </div>
          }
        >
         {/*  <p className="mb-3 text-[11px]" style={{ color: "var(--text3)" }}>
            <span className="font-semibold" style={{ color: "var(--text)" }}>Current:</span> {order.status}
          </p> */}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
            {STATUS_PIPELINE.map((step, idx) => {
              const color = STATUS_COLORS[step] ?? "var(--text3)";
              const isCurrent = order.status === step;
              const isPast = currentPipelineIndex >= 0 && idx < currentPipelineIndex;
              return (
                <div key={step} className="flex items-center">
                  {idx > 0 && (
                    <span className="mx-0.5 text-[10px]" style={{ color: "var(--text3)" }}>→</span>
                  )}
                  <div
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{
                      background: isCurrent ? color : isPast ? `${String(color)}18` : "var(--surface2)",
                      color: isCurrent ? "#fff" : isPast ? color : "var(--text3)",
                      border: isCurrent ? `2px solid ${color}` : `1px solid ${isPast ? `${String(color)}40` : "var(--border)"}`,
                      boxShadow: isCurrent ? `0 0 0 2px ${String(color)}33` : undefined,
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {isPast && !isCurrent && <Check size={10} strokeWidth={3} />}
                      {step}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* {nextOptions.length > 0 && (
            <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>Move to next</p>
              <div className="flex flex-wrap gap-2">
                {nextOptions.map((s) => {
                  const color = STATUS_COLORS[s] ?? "var(--text3)";
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={statusMutation.isPending}
                      onClick={() => {
                        setActionError(null);
                        statusMutation.mutate(s);
                      }}
                      className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-85 disabled:opacity-50"
                      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )} */}
          {actionError && <p className="mt-3 text-[11px]" style={{ color: "var(--color-red)" }}>{actionError}</p>}
        </Widget>
      )}

      <Widget title="Garment Items">
        <p className="mb-3 text-[11px]" style={{ color: "var(--text3)" }}>Tap a line to view measurement snapshot (if linked).</p>
        <div className="space-y-2">
          {order.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLinePanel(item)}
              className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors"
              style={{ background: "var(--surface2)", border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gold)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
              }}
            >
              <div className="flex items-start gap-2">
                <Ruler size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--gold)" }} />
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{item.garmentType}</p>
                  {item.styleNotes && <p className="mt-0.5 text-[10px]" style={{ color: "var(--text3)" }}>{item.styleNotes}</p>}
                  {item.assignedTailorName && (
                    <p className="mt-0.5 text-[10px]" style={{ color: "var(--text3)" }}>
                      Tailor: <span style={{ color: "var(--text2)", fontWeight: 500 }}>{item.assignedTailorName}</span>
                    </p>
                  )}
                  {/* <p className="mt-0.5 text-[9px]" style={{ color: "var(--text3)" }}>
                    {item.measurementId ? "Measurements linked — tap to view" : "No measurement snapshot on this line"}
                  </p> */}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-medium" style={{ color: "var(--text)" }}>
                  {item.quantity} × {item.unitPrice != null ? formatInr(item.unitPrice) : "—"}
                </p>
                {item.unitPrice != null && (
                  <p className="text-[10px]" style={{ color: "var(--text3)" }}>= {formatInr(item.quantity * item.unitPrice)}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </Widget>

      <div className="grid gap-4 md:grid-cols-2">
        <Widget title="Payment History">
          {(payments ?? []).length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {(payments ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg px-4 py-2.5" style={{ background: "var(--surface2)" }}>
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: "var(--text)" }}>
                      {p.type} · {p.mode}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text3)" }}>
                      {new Date(p.paidAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--color-green)" }}>{formatInr(p.amount)}</p>
                </div>
              ))}
            </div>
          )}
          
          {order.balanceAmount > 0 && (
            <div className="mt-3">
                <StyledButton
                  onClick={() => {
                    setPayForm((f) => ({
                      ...f,
                      type: "Balance",
                      amount: order.balanceAmount > 0 ? String(order.balanceAmount) : "",
                    }));
                    setPaymentPanel(true);
                  }}
                >
                  <CreditCard size={12} /> Record payment
                </StyledButton>
            </div>
          )} 
          
           

        </Widget>

        <Widget title="Payment Summary">
          <div className="space-y-1.5">
            {[
              /* { label: "Base amount", value: formatInr(baseAmount) }, */
              /* { label: `GST (${gstRatePct.toFixed(0)}%)`, value: formatInr(gstAmount) }, */
              { label: "Order total", value: formatInr(order.totalAmount), bold: true },
              { label: order.advancePaid > 0 ? "Paid Amount" : "Advance / Paid", value: formatInr(order.advancePaid), color: "var(--color-green)" },
              {
                label: "Due Amount",
                value: formatInr(order.balanceAmount),
                color: order.balanceAmount > 0 ? "var(--color-red)" : "var(--color-green)",
                bold: true,
              },
            ].map(({ label, value, bold, color }) => (
              <div key={label} className="flex items-center justify-between">
                <p className="text-[12px]" style={{ color: "var(--text2)" }}>{label}</p>
                <p className="text-[12px]" style={{ color: color ?? "var(--text)", fontWeight: bold ? 600 : 400 }}>{value}</p>
              </div>
            ))}
          </div>
        </Widget>
      </div>

      <SlidePanel
        open={paymentPanel}
        onClose={() => {
          setPaymentPanel(false);
          setActionError(null);
        }}
        title="Record Payment"
        subtitle={`#${order.tokenNo} · Due amount: ${formatInr(order.balanceAmount)}`}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            payMutation.mutate();
          }}
        >
          <FormField label="Amount (₹)" required>
            <StyledInput
              type="number"
              min={1}
              step="0.01"
              placeholder={`Up to ${formatInr(order.balanceAmount)}`}
              value={payForm.amount}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Mode">
              <StyledSelect value={payForm.mode} onChange={(e) => setPayForm((f) => ({ ...f, mode: e.target.value }))}>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </StyledSelect>
            </FormField>
            <FormField label="Type">
              <StyledSelect value={payForm.type} onChange={(e) => setPayForm((f) => ({ ...f, type: e.target.value }))}>
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </StyledSelect>
            </FormField>
          </div>
          {payForm.mode !== "Cash" && (
            <FormField label="Payment reference">
              <StyledInput placeholder="Transaction ID" value={payForm.upiRef} onChange={(e) => setPayForm((f) => ({ ...f, upiRef: e.target.value }))} />
            </FormField>
          )}
          <FormField label="Notes">
            <StyledInput placeholder="Optional" value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} />
          </FormField>
          {actionError && (
            <p className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}>
              {actionError}
            </p>
          )}
          {isExcessPayment && (
            <div
              className="rounded-lg border px-3 py-2 text-[12px]"
              style={{ background: "rgba(232,168,74,0.12)", borderColor: "rgba(232,168,74,0.35)", color: "var(--gold)" }}
            >
              You are receiving excess amount:{" "}
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{formatInr(enteredAmount - dueAmount)}</span>{" "}
              (Due: {formatInr(dueAmount)})
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <StyledButton type="submit" loading={payMutation.isPending}>
              <CreditCard size={12} /> Save payment
            </StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setPaymentPanel(false)}>
              Cancel
            </StyledButton>
          </div>
        </form>
      </SlidePanel>

      <SlidePanel
        open={!!linePanel}
        onClose={() => setLinePanel(null)}
        title={linePanel ? linePanel.garmentType : "Measurements"}
        subtitle="Snapshot linked to this order line"
      >
        {linePanel && (
          linePanel.measurementId ? (
            <LineMeasurementPanelBody measurementId={linePanel.measurementId} />
          ) : (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>
              This line has no measurement snapshot. Measurements can be linked when booking the order or from the customer&apos;s measurements screen.
            </p>
          )
        )}
      </SlidePanel>

      <Modal open={cancelPanel} onClose={() => setCancelPanel(false)} title="Cancel Order" subtitle={`#${order.tokenNo} · ${order.customerName}`}>
        <div className="space-y-4">
          <div className="rounded-lg border p-3" style={{ background: "rgba(224,85,85,0.08)", borderColor: "rgba(224,85,85,0.3)" }}>
            <p className="text-[12px]" style={{ color: "var(--color-red)" }}>
              This will permanently cancel the order and cannot be undone.
            </p>
          </div>
          <FormField label="Reason (optional)">
            <StyledInput placeholder="Why is this being cancelled?" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </FormField>
          <div className="flex gap-2 pt-1">
            <StyledButton variant="danger" onClick={() => cancelMutation.mutate()} loading={cancelMutation.isPending}>
              <XCircle size={12} /> Yes, cancel order
            </StyledButton>
            <StyledButton type="button" variant="ghost" onClick={() => setCancelPanel(false)}>
              Keep order
            </StyledButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
