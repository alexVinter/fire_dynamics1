import { useEffect, useRef, useState } from "react";
import { apiGet } from "../api/client";

interface QuoteListItem {
  id: number;
  created_by: number;
  status: string;
  customer_name: string | null;
  items_count: number;
  created_at: string;
  updated_at: string;
}

const STATUSES = [
  { value: "", label: "Все" },
  { value: "draft", label: "Черновик" },
  { value: "calculated", label: "Рассчитано" },
  { value: "approved", label: "Согласовано" },
  { value: "warehouse_check", label: "На проверке склада" },
  { value: "rework", label: "Доработка" },
  { value: "confirmed", label: "Подтверждено" },
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUSES.filter((s) => s.value).map((s) => [s.value, s.label]),
);

interface Props {
  onOpenQuote: (id: number) => void;
}

export default function Dashboard({ onOpenQuote }: Props) {
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

  function handleStatusChange(val: string) {
    setStatusFilter(val);
    load(search, val);
  }

  function handleSearchInput(val: string) {
    setSearch(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => load(val, statusFilter), 400);
  }

  return (
    <div>
      <h2>История КП</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} style={{ padding: 6 }}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          placeholder="Поиск по клиенту / технике…"
          value={search}
          onChange={(e) => handleSearchInput(e.target.value)}
          style={{ padding: 6, minWidth: 240 }}
        />
      </div>

      {loading && <p style={{ fontSize: 13 }}>Загрузка…</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {["ID", "Клиент", "Статус", "Позиций", "Создано", "Обновлено", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "6px 8px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "6px 8px" }}>{q.id}</td>
              <td style={{ padding: "6px 8px" }}>{q.customer_name || "—"}</td>
              <td style={{ padding: "6px 8px" }}>{STATUS_LABELS[q.status] ?? q.status}</td>
              <td style={{ padding: "6px 8px" }}>{q.items_count}</td>
              <td style={{ padding: "6px 8px" }}>{new Date(q.created_at).toLocaleDateString("ru")}</td>
              <td style={{ padding: "6px 8px" }}>{new Date(q.updated_at).toLocaleDateString("ru")}</td>
              <td style={{ padding: "6px 8px" }}>
                <button onClick={() => onOpenQuote(q.id)}>Открыть</button>
              </td>
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 16, color: "#888", textAlign: "center" }}>Нет КП</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
