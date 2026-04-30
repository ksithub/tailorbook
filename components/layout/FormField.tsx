type Props = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
};

export function FormField({ label, required, children, hint }: Props) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[1.2px]"
        style={{ color: "var(--text3)" }}
      >
        {label}
        {required && <span style={{ color: "var(--color-red)" }}> *</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[10px]" style={{ color: "var(--text3)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function StyledInput({ className, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-[12px] outline-none transition-colors ${className ?? ""}`}
      style={{
        background: "var(--surface2)",
        borderColor: "var(--border)",
        color: "var(--text)",
        ...props.style,
      }}
      onFocus={(e) => {
        (e.target as HTMLInputElement).style.borderColor = "var(--gold)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        (e.target as HTMLInputElement).style.borderColor = "var(--border)";
        props.onBlur?.(e);
      }}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function StyledSelect({ children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none transition-colors"
      style={{
        background: "var(--surface2)",
        borderColor: "var(--border)",
        color: "var(--text)",
        ...props.style,
      }}
      onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = "var(--gold)"; }}
      onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = "var(--border)"; }}
    >
      {children}
    </select>
  );
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function StyledTextarea({ className, ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      rows={props.rows ?? 3}
      className={`w-full rounded-lg border px-3 py-2 text-[12px] outline-none transition-colors ${className ?? ""}`}
      style={{
        background: "var(--surface2)",
        borderColor: "var(--border)",
        color: "var(--text)",
        resize: "vertical",
        ...props.style,
      }}
      onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--gold)"; }}
      onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--border)"; }}
    />
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
  padding?: string;
};

export function StyledButton({ variant = "primary", loading, children, disabled, padding = "0.5rem 1rem", ...props }: BtnProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "var(--gold)", color: "var(--on-gold)" },
    ghost: { background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" },
    danger: { background: "rgba(224,85,85,0.15)", color: "var(--color-red)", border: "1px solid rgba(224,85,85,0.3)" },
    padding: { padding: padding },
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 ${padding}`}
      style={{ ...styles[variant], ...styles.padding }}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}
