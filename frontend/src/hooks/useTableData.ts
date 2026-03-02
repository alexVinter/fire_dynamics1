import { useMemo, useRef, useState } from "react";

export interface ColumnDef<T> {
  key: keyof T & string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "select" | "daterange";
  filterOptions?: { value: string; label: string }[];
  sortFn?: (a: T, b: T) => number;
  filterFn?: (row: T, filterValue: string) => boolean;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

interface Options {
  defaultPageSize?: number;
  defaultSort?: SortState;
}

export function useTableData<T>(
  rows: T[],
  columns: ColumnDef<T>[],
  options?: Options,
) {
  const colsRef = useRef(columns);
  colsRef.current = columns;

  const [sort, setSort] = useState<SortState | null>(
    options?.defaultSort ?? null,
  );
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, _setPageSize] = useState(options?.defaultPageSize ?? 25);

  const filtered = useMemo(() => {
    let result = rows;
    for (const col of colsRef.current) {
      if (!col.filterable) continue;
      const val = filters[col.key];
      if (!val) continue;
      if (col.filterFn) {
        result = result.filter((r) => col.filterFn!(r, val));
      } else if (col.filterType === "select") {
        result = result.filter((r) => String(r[col.key] ?? "") === val);
      } else if (col.filterType === "daterange") {
        const [from, to] = val.split("|");
        if (from || to) {
          result = result.filter((r) => {
            const raw = r[col.key];
            if (raw == null) return false;
            const d = String(raw).slice(0, 10);
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
          });
        }
      } else {
        const lower = val.toLowerCase();
        result = result.filter((r) =>
          String(r[col.key] ?? "").toLowerCase().includes(lower),
        );
      }
    }
    return result;
  }, [rows, filters]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = colsRef.current.find((c) => c.key === sort.key);
    if (!col?.sortable) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (col.sortFn) return col.sortFn(a, b) * dir;
      const va = a[col.key];
      const vb = b[col.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "ru") * dir;
    });
  }, [filtered, sort]);

  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const view = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key && prev.dir === "asc"
        ? { key, dir: "desc" }
        : { key, dir: "asc" },
    );
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function setPageSize(size: number) {
    _setPageSize(size);
    setPage(1);
  }

  return {
    view,
    sort,
    toggleSort,
    filters,
    setFilter,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalFiltered,
    totalRows: rows.length,
  };
}
