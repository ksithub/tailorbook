"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: number;
};

export function Modal({ open, onClose, title, subtitle, children, maxWidth = 520 }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!open}
      >
        <div
          className="w-full overflow-hidden rounded-xl border shadow-xl"
          style={{ maxWidth, background: "var(--surface)", borderColor: "var(--border)" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
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
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text3)";
              }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </>
  );
}

