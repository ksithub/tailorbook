import { OrderForm } from "../_components/OrderForm";
import { Suspense } from "react";

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-[12px]" style={{ color: "var(--text3)" }}>Loading…</div>}>
      <OrderForm mode="create" />
    </Suspense>
  );
}
