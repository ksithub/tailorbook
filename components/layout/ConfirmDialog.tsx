"use client";

import { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLoading?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  onCancel,
  onConfirm,
  confirmLoading,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="rounded-xl p-6 w-[340px] shadow-xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
          {title}
        </h3>
        <div className="text-[12px] mb-5" style={{ color: "var(--text2)" }}>
          {description}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-1.5 text-[12px] font-medium transition-colors"
            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!!confirmLoading}
            className="rounded-lg px-4 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              background: "rgba(224,85,85,0.15)",
              color: "rgb(220,60,60)",
              border: "1px solid rgba(224,85,85,0.3)",
              opacity: confirmLoading ? 0.75 : 1,
            }}
          >
            {confirmLoading ? "Deleting…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

