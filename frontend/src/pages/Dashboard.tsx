import { useEffect, useRef, useState } from "react";
import { apiGet } from "../api/client";
import type { ColumnDef } from "../hooks/useTableData";
import { useTableData } from "../hooks/useTableData";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import { Table, Th, Td, Tr } from "../ui/Table";
import { SortableTh, FilterRow, PaginationBar } from "../ui/TableControls";
import Tabs from "../ui/Tabs";
import { statusLabel, statusBadgeColor } from "../utils/status";

interface QuoteListItem {
  id: number;
  created_by: number;
  status: string;
  customer_name: string | null;
  items_count: number;
  created_at: string;
  updated_at: string;
}

const COLUMNS: ColumnDef<QuoteListItem>[] = [
  { key: "id", sortable: true },
  { key: "customer_name", sortable: true, filterable: true },
  { key: "status", sortable: true },
  { key: "items_count", sortable: true },
  { key: "updated_at", sortable: true, filterable: true, filterType: "daterange" },
];

const STATUS_TABS = [
  { key: "",                label: "Все" },
  { key: "draft",           label: "Черновик" },
  { key: "calculated",      label: "Рассчитано" },
  { key: "approved",        label: "Согласовано" },
  { key: "warehouse_check", label: "Склад" },
  { key: "rework",          label: "Доработка" },
  { key: "confirmed",       label: "Подтверждено" },
];

interface Props {
  onOpenQuote: (id: number) => void;
  onNav?: (page: string) => void;
}

export default function Dashboard({ onOpenQuote, onNav }: Props) {
  const [rows, setRows] = useState<QuoteListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    view, sort, toggleSort, filters, setFilter,
    page, setPage, pageSize, setPageSize,
    totalPages, totalFiltered, totalRows,
  } = useTableData(rows, COLUMNS);

  function load(s?: string, st?: string) {
    const qs = new URLSearchParams();
    const sf = st ?? statusFilter;
    const sq = s ?? search;
    if (sf) qs.set("status", sf);
    if (sq) qs.set("search", sq);
    setLoading(true);
    apiGet<QuoteListItem[]>(`/quotes?${qs.toString()}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function handleTab(key: string) {
    setStatusFilter(key);
    load(search, key);
  }

  function handleSearch(val: string) {
    setSearch(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => load(val, statusFilter), 400);
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ru");

  return (
    <div>
      <Tabs tabs={STATUS_TABS} active={statusFilter} onChange={handleTab} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 sm:max-w-sm">
          <Input
            placeholder="Поиск по клиенту / технике…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Button variant="primary" size="md" onClick={() => onNav?.("calc")} className="sm:ml-auto">
          + Новый расчёт
        </Button>
      </div>

      {loading && (
        <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">Загрузка…</p>
      )}

      {!loading && rows.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-[var(--color-text-secondary)]">Нет коммерческих предложений</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {statusFilter
              ? "Попробуйте выбрать другой статус или сбросить фильтр"
              : "Создайте первый расчёт, нажав кнопку выше"}
          </p>
        </Card>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <SortableTh columnKey="id" sort={sort} onSort={toggleSort}>ID</SortableTh>
                <SortableTh columnKey="customer_name" sort={sort} onSort={toggleSort}>Клиент</SortableTh>
                <SortableTh columnKey="status" sort={sort} onSort={toggleSort}>Статус</SortableTh>
                <SortableTh columnKey="items_count" sort={sort} onSort={toggleSort}>Позиций</SortableTh>
                <SortableTh columnKey="updated_at" sort={sort} onSort={toggleSort}>Обновлено</SortableTh>
                <Th className="text-right">Действия</Th>
              </tr>
              <FilterRow columns={COLUMNS} filters={filters} onFilter={setFilter}>
                <th className="border-b border-[var(--color-border)] bg-gray-50/60 px-4 py-1.5" />
              </FilterRow>
            </thead>
            <tbody>
              {view.map((q) => (
                <Tr key={q.id}>
                  <Td className="font-medium">{q.id}</Td>
                  <Td>{q.customer_name || "—"}</Td>
                  <Td>
                    <Badge color={statusBadgeColor(q.status)}>
                      {statusLabel(q.status)}
                    </Badge>
                  </Td>
                  <Td>{q.items_count}</Td>
                  <Td className="text-[var(--color-text-secondary)]">{fmtDate(q.updated_at)}</Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onOpenQuote(q.id)}>
                      Открыть
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            totalFiltered={totalFiltered}
            totalRows={totalRows}
          />
        </div>
      )}
    </div>
  );
}
