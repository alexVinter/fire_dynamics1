import { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = "", id, ...rest }: Props) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`rounded-lg border bg-white px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 disabled:bg-gray-50 disabled:text-gray-400 ${
          error
            ? "border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20"
            : "border-[var(--color-border)]"
        } ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
