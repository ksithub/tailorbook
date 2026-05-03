"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
};

export function SlidePanel({ open, onClose, title, subtitle, children, width = "420px" }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Narrow phones are often < 420px wide; a fixed panel width clips the left edge. Cap width at viewport.
  const panelWidth = `min(100vw, ${width})`;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ background: "rgba(0,0,0,0.55)", marginTop: "0rem" }}
        onClick={onClose}
        aria-hidden={!open}
      />
      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 box-border flex max-w-[100vw] min-w-0 flex-col transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{
          width: panelWidth,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          marginTop: "0rem",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex min-w-0 flex-shrink-0 items-start justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold leading-none" style={{ color: "var(--text)" }}>
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 transition-colors"
            style={{ color: "var(--text3)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text3)"; }}
          >
            <X size={16} />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </>
  );
}
