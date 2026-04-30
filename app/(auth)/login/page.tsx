"use client";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Eye, EyeOff, Loader2, Lock, Phone, Scissors } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/api/auth/login", { phoneNumber, password });
      setAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : null;
      setError(msg || "Invalid phone number or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--gold-dim)" }}
          >
            <Scissors size={22} style={{ color: "var(--gold)" }} />
          </div>
          <div className="text-center">
            <h1
              className="text-[22px] font-semibold leading-none"
              style={{ color: "var(--gold)" }}
            >
              Tailor Book
            </h1>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text3)" }}>
              Smart tailor management
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-7"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="mb-5">
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>
              Sign in
            </h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--text2)" }}>
              Welcome back to your shop
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Phone */}
            <div>
              <label
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[1.2px]"
                style={{ color: "var(--text3)" }}
              >
                Phone number
              </label>
              <div className="relative">
                <Phone
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text3)" }}
                />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="10-digit mobile number"
                  className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-[13px] outline-none transition-colors"
                  style={{
                    background: "var(--surface2)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--gold)"; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[1.2px]"
                style={{ color: "var(--text3)" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text3)" }}
                />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Your password"
                  className="w-full rounded-lg border py-2.5 pl-9 pr-9 text-[13px] outline-none transition-colors"
                  style={{
                    background: "var(--surface2)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--gold)"; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text3)" }}
                  onClick={() => setShowPwd((p) => !p)}
                >
                  {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p
                className="rounded-lg px-3 py-2 text-[12px]"
                style={{ background: "rgba(224,85,85,0.12)", color: "var(--color-red)" }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--gold)", color: "var(--on-gold)" }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-5 text-center text-[12px]" style={{ color: "var(--text3)" }}>
          New shop?{" "}
          <Link href="/register" style={{ color: "var(--gold)" }} className="font-medium hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
