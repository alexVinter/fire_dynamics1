import type { ReactNode } from "react";
import type { ColumnDef, SortState } from "../hooks/useTableData";

/* ── Sortable table header cell ─────────────────────────────────── */

interface SortableThProps {
  columnKey: string;
  sort: SortState | null;
  onSort: (key: string) => void;
  children: ReactNode;
  className?: string;
}

export function SortableTh({
  columnKey,
  sort,
  onSort,
  children,
  className = "",
}: SortableThProps) {
  const active = sort?.key === columnKey;
  return (
    <th
      className={`cursor-pointer select-none whitespace-nowrap border-b border-[var(--color-border)] bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[var(--color-text)] ${active ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"} ${className}`}
      onClick={() => onSort(columnKey)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (
          <span className="text-[0.65rem] leading-none">
            {sort!.dir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </span>
    </th>
  );
}

/* ── Date range filter (two date inputs packed into "from|to") ──── */

function DateRangeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [from, to] = value.split("|");
  const set = (f: string, t: string) => onChange(f || t ? `${f}|${t}` : "");
  const inputCls =
    "w-full rounded-md border border-gray-200 bg-gray-50/60 px-2 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15 transition-colors";
  return (
    <div className="flex gap-1.5">
      <input
        type="date"
        className={inputCls}
        title="С…"
        value={from ?? ""}
        onChange={(e) => set(e.target.value, to ?? "")}
      />
      <input
        type="date"
        className={inputCls}
        title="По…"
        value={to ?? ""}
        onChange={(e) => set(from ?? "", e.target.value)}
      />
    </div>
  );
}

/* ── Filter row (placed inside <thead> under the header row) ───── */

interface FilterRowProps<T> {
  columns: ColumnDef<T>[];
  filters: Record<string, string>;
  onFilter: (key: string, value: string) => void;
  children?: ReactNode;
}

export function FilterRow<T>({
  columns,
  filters,
  onFilter,
  children,
}: FilterRowProps<T>) {
  const hasAny = columns.some((c) => c.filterable);
  if (!hasAny) return null;

  return (
    <tr>
      {columns.map((col) => (
        <th
          key={col.key}
          className="border-b border-[var(--color-border)] bg-gray-50/60 px-4 py-1.5 font-normal"
        >
          {col.filterable ? (
            col.filterType === "select" ? (
              <select
                className="w-full rounded-md border border-gray-200 bg-gray-50/60 px-2 py-1.5 text-xs text-[var(--color-text)] transition-colors focus:border-[var(--color-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15"
                value={filters[col.key] ?? ""}
                onChange={(e) => onFilter(col.key, e.target.value)}
              >
                <option value="">Все</option>
                {col.filterOptions?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : col.filterType === "daterange" ? (
              <DateRangeFilter
                value={filters[col.key] ?? ""}
                onChange={(v) => onFilter(col.key, v)}
              />
            ) : (
              <input
                className="w-full rounded-md border border-gray-200 bg-gray-50/60 px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder:text-gray-400 transition-colors focus:border-[var(--color-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15"
                placeholder="Фильтр…"
                value={filters[col.key] ?? ""}
                onChange={(e) => onFilter(col.key, e.target.value)}
              />
            )
          ) : null}
        </th>
      ))}
      {children}
    </tr>
  );
}

/* ── Pagination bar ──────────────────────────────────────────────── */

const PAGE_SIZES = [10, 25, 50, 100] as const;

interface PaginationBarProps {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  totalFiltered: number;
  totalRows: number;
}

export function PaginationBar({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalFiltered,
  totalRows,
}: PaginationBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm text-[var(--color-text-secondary)]">
      <div className="flex items-center gap-2">
        <span className="text-xs">Строк:</span>
        <select
          className="rounded-md border border-gray-200 bg-gray-50/60 px-2 py-1.5 text-xs text-[var(--color-text)] transition-colors focus:border-[var(--color-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/15"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <span className="text-xs">
        {totalFiltered < totalRows
          ? `Найдено ${totalFiltered} из ${totalRows}`
          : `Всего: ${totalRows}`}
      </span>

      <div className="flex items-center gap-1">
        <button
          className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ← Назад
        </button>
        <span className="min-w-[4rem] text-center text-xs">
          {page} / {totalPages}
        </span>
        <button
          className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Вперёд →
        </button>
      </div>
    </div>
  );
}
