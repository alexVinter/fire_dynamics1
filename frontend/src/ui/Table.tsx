import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className={`w-full text-left text-sm ${className}`} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  className = "",
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`whitespace-nowrap border-b border-[var(--color-border)] bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({
  className = "",
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`border-b border-[var(--color-border)] px-4 py-3 ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}

export function Tr({
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`transition-colors hover:bg-gray-50/60 ${className}`} {...rest}>
      {children}
    </tr>
  );
}
