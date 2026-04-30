import { Suspense } from "react";
import OrdersPageClient from "./OrdersPageClient";

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 py-8 text-[12px]" style={{ color: "var(--text3)" }}>
          Loading…
        </div>
      }
    >
      <OrdersPageClient />
    </Suspense>
  );
}
