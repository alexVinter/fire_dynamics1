import { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
}

export default function Card({ flat, className = "", children, ...rest }: Props) {
  return (
    <div
      className={`rounded-xl bg-[var(--color-bg-card)] ${
        flat ? "" : "shadow-sm"
      } border border-[var(--color-border)] p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
