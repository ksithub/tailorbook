"use client";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Eye, EyeOff, Loader2, Lock, Phone, Scissors, Store, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";

type Field = {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  icon: React.ElementType;
};

const FIELDS: Field[] = [
  { key: "companyName", label: "Shop name", type: "text", placeholder: "e.g. Sharma Tailor Works", icon: Store },
  { key: "ownerName", label: "Owner name", type: "text", placeholder: "Full name", icon: User },
  { key: "phone", label: "Phone number", type: "tel", placeholder: "10-digit mobile number", icon: Phone },
  { key: "password", label: "Password (min 8 chars)", type: "password", placeholder: "Create a strong password", icon: Lock },
];

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [values, setValues] = useState({ companyName: "", ownerName: "", phone: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("tb_access")) {
      router.replace("/dashboard");
      return;
    }
    function finish() {
      if (localStorage.getItem("tb_access")) {
        router.replace("/dashboard");
        return;
      }
      if (useAuthStore.getState().accessToken) useAuthStore.getState().logout();
      setSessionChecked(true);
    }
    if (useAuthStore.persist.hasHydrated()) {
      finish();
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => finish());
    return unsub;
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/api/auth/register", {
        companyName: values.companyName,
        ownerName: values.ownerName,
        phone: values.phone.trim(),
        password: values.password,
      });
      setAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      router.push("/dashboard");
    } catch {
      setError("Could not register. Check your details or try a different phone number.");
    } finally {
      setLoading(false);
    }
  }

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3" style={{ background: "var(--bg)" }}>
        <Loader2 size={22} className="animate-spin" style={{ color: "var(--gold)" }} aria-hidden />
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: "var(--bg)" }}
    >
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-[400px]">
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
              style={{ color: "var(--gold)"}}
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
              Create your shop
            </h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--text2)" }}>
              Set up your tailor shop account in seconds
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {FIELDS.map((f) => {
              const Icon = f.icon;
              const isPassword = f.key === "password";
              return (
                <div key={f.key}>
                  <label
                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[1.2px]"
                    style={{ color: "var(--text3)" }}
                  >
                    {f.label}
                  </label>
                  <div className="relative">
                    <Icon
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text3)" }}
                    />
                    <input
                      type={isPassword && showPwd ? "text" : f.type}
                      value={values[f.key as keyof typeof values]}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      required
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border py-2.5 pl-9 pr-9 text-[13px] outline-none transition-colors"
                      style={{
                        background: "var(--surface2)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--gold)"; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                    />
                    {isPassword && (
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--text3)" }}
                        onClick={() => setShowPwd((p) => !p)}
                      >
                        {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

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
                  Creating shop…
                </>
              ) : (
                "Create shop"
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-5 text-center text-[12px]" style={{ color: "var(--text3)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--gold)" }} className="font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
