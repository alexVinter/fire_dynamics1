import { useEffect, useRef, useState } from "react";
import { apiGet } from "../api/client";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import { Table, Th, Td, Tr } from "../ui/Table";
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
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Table>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Клиент</Th>
                  <Th>Статус</Th>
                  <Th>Позиций</Th>
                  <Th>Обновлено</Th>
                  <Th className="text-right">Действия</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
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
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((q) => (
              <Card key={q.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">КП #{q.id}</span>
                  <Badge color={statusBadgeColor(q.status)}>
                    {statusLabel(q.status)}
                  </Badge>
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">
                  {q.customer_name || "Клиент не указан"}
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{q.items_count} поз. · {fmtDate(q.updated_at)}</span>
                  <Button variant="primary" size="sm" onClick={() => onOpenQuote(q.id)}>
                    Открыть
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
