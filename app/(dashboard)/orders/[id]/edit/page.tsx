"use client";

import { OrderForm } from "../../_components/OrderForm";
import { useParams } from "next/navigation";

export default function EditOrderPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  return <OrderForm mode="edit" orderId={id} />;
}

