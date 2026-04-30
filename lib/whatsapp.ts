export type WhatsAppOrderContext = {
  tokenNo: string;
  customerName?: string;
  customerPhone: string | null | undefined;
  itemLines?: string[];
  fromStatus?: string;
  toStatus?: string;
  shopName?: string;
  shopPhone?: string | null;
  totalAmount?: number | null;
  dueAmount?: number | null;
};

function digitsOnly(phone: string) {
  return String(phone ?? "").replace(/\D/g, "");
}

export function buildWhatsAppMessage(ctx: WhatsAppOrderContext) {
  const items = (ctx.itemLines ?? []).filter(Boolean);
  const itemsText = items.length > 0 ? `Items: ${items.join(", ")}\n` : "";
  const amountLines =
    (ctx.totalAmount != null || ctx.dueAmount != null)
      ? `${ctx.totalAmount != null ? `Total: ₹${Number(ctx.totalAmount).toFixed(2)}\n` : ""}${ctx.dueAmount != null ? `Due: ₹${Number(ctx.dueAmount).toFixed(2)}\n` : ""}`
      : "";
  const statusLine =
    ctx.toStatus && ctx.fromStatus
      ? `Status: ${ctx.fromStatus} → ${ctx.toStatus}\n`
      : ctx.toStatus
        ? `Status: ${ctx.toStatus}\n`
        : "";

  const header = `Order #${ctx.tokenNo}\n${statusLine}${itemsText}${amountLines}`;
  const shopLine =
    ctx.shopName || ctx.shopPhone
      ? `\n${ctx.shopName ? `${ctx.shopName}\n` : ""}${ctx.shopPhone ? `Contact: ${ctx.shopPhone}\n` : ""}`
      : "";

  // Simple, centralized templates (can be refined later)
  switch (ctx.toStatus) {
    case "Booked":
      return `${header}\nYour order has been booked successfully.\n${shopLine}`;
    case "Trial":
      return `${header}\nYour order is ready for trial. Please visit the shop for trial.\n${shopLine}`;
    case "Ready":
      return `${header}\nYour order is ready. Please trial & collect from the shop.\n${shopLine}`;
    default:
      return null;
  }
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string | null) {
  if (!message) return null;
  const digits = digitsOnly(phone ?? "");
  if (!digits) return null;
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

