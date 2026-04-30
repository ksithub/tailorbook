"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type AccountSelectOption = {
  id: string;
  name: string;
  code?: string;
  isActive?: boolean;
};

type Props = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  options: AccountSelectOption[];
  placeholder?: string;
  includeAll?: boolean;
  allValue?: string;
  allLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function AccountSelect({
  label = "Account",
  value,
  onChange,
  options,
  placeholder = "Select account…",
  includeAll,
  allValue = "all",
  allLabel = "All",
  disabled,
  className,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const activeOptions = useMemo(
    () => options.filter((o) => o.isActive !== false),
    [options]
  );

  const selectedLabel = useMemo(() => {
    if (includeAll && value === allValue) return allLabel;
    const hit = activeOptions.find((o) => o.id === value);
    return hit?.name ?? "";
  }, [includeAll, value, allValue, allLabel, activeOptions]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return activeOptions;
    return activeOptions.filter((o) => {
      const hay = `${o.name} ${o.code ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [activeOptions, q]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div ref={rootRef} className={className} style={{ position: "relative" }}>
      {label ? (
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
          {label}
        </label>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          setQ("");
        }}
        className="mt-1 w-full rounded-md border px-2 py-1.5 text-[12px] flex items-center justify-between gap-2"
        style={{
          background: "var(--surface-alt, var(--surface))",
          borderColor: "var(--border)",
          color: "var(--text)",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <span className="truncate" style={{ color: selectedLabel ? "var(--text)" : "var(--text3)" }}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={14} style={{ color: "var(--text3)" }} />
      </button>

      {open ? (
        <div
          className="rounded-xl border shadow-xl overflow-hidden"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 8,
            background: "var(--surface)",
            borderColor: "var(--border)",
            zIndex: 60,
          }}
        >
          <div className="p-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type to search…"
                className="w-full rounded-md border pl-8 pr-2 py-2 text-[12px]"
                style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>
          </div>

          <div className="max-h-[240px] overflow-y-auto">
            {includeAll ? (
              <OptionRow
                active={value === allValue}
                title={allLabel}
                subtitle=""
                onPick={() => { onChange(allValue); setOpen(false); setQ(""); }}
              />
            ) : null}

            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[12px]" style={{ color: "var(--text3)" }}>
                No accounts found.
              </p>
            ) : (
              filtered.map((o) => (
                <OptionRow
                  key={o.id}
                  active={o.id === value}
                  title={o.name}
                  subtitle={o.code ?? ""}
                  onPick={() => { onChange(o.id); setOpen(false); setQ(""); }}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OptionRow({
  active,
  title,
  subtitle,
  onPick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full px-3 py-2 text-left flex items-center justify-between gap-3"
      style={{
        background: active ? "var(--gold-dim)" : "transparent",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium" style={{ color: "var(--text)" }}>
          {title}
        </p>
        {subtitle ? (
          <p className="truncate text-[10px]" style={{ color: "var(--text3)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {active ? (
        <span className="text-[10px] font-semibold" style={{ color: "var(--gold)" }}>
          Selected
        </span>
      ) : null}
    </button>
  );
}

