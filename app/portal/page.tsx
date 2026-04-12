"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useState } from "react";

export default function PortalPage() {
  const [companyId, setCompanyId] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<unknown[]>([]);

  async function requestOtp() {
    await api.post("/api/portal/otp/request", { companyId, phone });
  }

  async function verify() {
    const { data } = await api.post("/api/portal/otp/verify", { companyId, phone, code });
    setToken(data.accessToken);
  }

  async function loadOrders() {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5012";
    const res = await fetch(`${base}/api/portal/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setOrders((await res.json()) as unknown[]);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-amber-400">Customer portal</h1>
        <Input placeholder="Company ID" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
        <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button type="button" onClick={requestOtp}>
          Send OTP
        </Button>
        <Input placeholder="OTP" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button type="button" onClick={verify}>
          Verify
        </Button>
        {token && (
          <Button type="button" onClick={loadOrders}>
            Load my orders
          </Button>
        )}
        <pre className="max-h-48 overflow-auto text-xs text-zinc-400">{JSON.stringify(orders, null, 2)}</pre>
      </Card>
    </div>
  );
}
