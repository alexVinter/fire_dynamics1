import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { Table, Th, Td, Tr } from "../ui/Table";
import { statusLabel, statusBadgeColor } from "../utils/status";

interface QuoteListItem {
  id: number;
  customer_name: string | null;
  items_count: number;
  created_at: string;
}

interface ResultLine {
  id: number;
  sku_id: number;
  sku_code: string | null;
  sku_name: string | null;
  sku_unit: string | null;
  qty: number;
  note: string | null;
}

interface LineRow extends ResultLine {
  availability_status: string;
  availability_comment: string;
}

const AVAIL_OPTIONS = [
  { value: "in_stock", label: "В наличии", color: "green" as const },
  { value: "to_order", label: "Под заказ", color: "yellow" as const },
  { value: "absent", label: "Отсутствует", color: "red" as const },
];

export default function Warehouse() {
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiGet<QuoteListItem[]>("/quotes?status=warehouse_check")
      .then(setQuotes)
      .catch(() => setQuotes([]));
  }, []);

  async function openQuote(id: number) {
    setSelectedId(id);
    setComment("");
    setMessage("");
    try {
      const result = await apiGet<ResultLine[]>(`/quotes/${id}/result`);
      setLines(result.map((ln) => ({ ...ln, availability_status: "in_stock", availability_comment: "" })));
    } catch {
      setLines([]);
    }
  }

  async function submit(decision: "confirmed" | "rework") {
    if (selectedId === null) return;
    setBusy(true);
    setMessage("");
    try {
      await apiPost(`/quotes/${selectedId}/warehouse/confirm`, {
        decision,
        comment: comment || null,
        lines: lines.map((ln) => ({
          line_id: ln.id,
          availability_status: ln.availability_status,
          availability_comment: ln.availability_comment || null,
        })),
      });
      setMessage(decision === "confirmed" ? "Подтверждено" : "Отправлено на доработку");
      setQuotes((prev) => prev.filter((q) => q.id !== selectedId));
      setSelectedId(null);
    } catch (err: unknown) {
      setMessage(String(err));
    } finally {
      setBusy(false);
    }
  }

  function updateLine(idx: number, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ru");

  /* ── Quote list ── */
  const listPanel = (
    <div className="flex flex-col gap-3">
      {quotes.length === 0 && (
        <Card className="py-10 text-center">
          <p className="text-[var(--color-text-secondary)]">Нет КП на проверке</p>
        </Card>
      )}
      {quotes.map((q) => (
        <Card
          key={q.id}
          className={`cursor-pointer transition-shadow hover:shadow-md ${
            selectedId === q.id ? "ring-2 ring-[var(--color-accent)]" : ""
          }`}
          onClick={() => openQuote(q.id)}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">КП #{q.id}</span>
            <Badge color={statusBadgeColor("warehouse_check")}>{statusLabel("warehouse_check")}</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {q.customer_name || "Клиент не указан"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {q.items_count} поз. · {fmtDate(q.created_at)}
          </p>
        </Card>
      ))}
    </div>
  );

  /* ── Detail panel ── */
  const detailPanel = selectedId !== null && (
    <div className="flex flex-col gap-4">
      {/* Mobile back */}
      <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="self-start lg:hidden">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        К списку
      </Button>

      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold">КП #{selectedId}</h3>
        <Badge color={statusBadgeColor("warehouse_check")}>{statusLabel("warehouse_check")}</Badge>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          message.startsWith("Error") || message.startsWith("TypeError")
            ? "border-red-200 bg-red-50 text-[var(--color-danger)]"
            : "border-green-200 bg-green-50 text-[var(--color-success)]"
        }`}>
          {message}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table>
          <thead>
            <tr>
              <Th>Код</Th>
              <Th>Название</Th>
              <Th>Кол-во</Th>
              <Th>Наличие</Th>
              <Th>Комментарий</Th>
            </tr>
          </thead>
          <tbody>
            {lines.map((ln, idx) => (
              <Tr key={ln.id}>
                <Td className="whitespace-nowrap font-medium">{ln.sku_code ?? ln.sku_id}</Td>
                <Td>
                  <div>{ln.sku_name ?? "—"}</div>
                  {ln.note && <div className="text-xs text-[var(--color-text-secondary)]">{ln.note}</div>}
                </Td>
                <Td>{ln.qty} {ln.sku_unit}</Td>
                <Td>
                  <AvailSegment
                    value={ln.availability_status}
                    onChange={(v) => updateLine(idx, { availability_status: v })}
                  />
                </Td>
                <Td>
                  <input
                    value={ln.availability_comment}
                    onChange={(e) => updateLine(idx, { availability_comment: e.target.value })}
                    placeholder="комм…"
                    className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {lines.map((ln, idx) => (
          <Card key={ln.id} className="flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{ln.sku_name ?? "—"}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {ln.sku_code ?? ln.sku_id} · {ln.qty} {ln.sku_unit}
                </p>
                {ln.note && <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{ln.note}</p>}
              </div>
            </div>
            <AvailSegment
              value={ln.availability_status}
              onChange={(v) => updateLine(idx, { availability_status: v })}
            />
            <textarea
              value={ln.availability_comment}
              onChange={(e) => updateLine(idx, { availability_comment: e.target.value })}
              placeholder="Комментарий по позиции…"
              rows={2}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </Card>
        ))}
      </div>

      {/* General comment + actions */}
      <Card flat>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">Общий комментарий</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Комментарий ко всему КП…"
          rows={3}
          className="mb-4 w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" onClick={() => submit("confirmed")} disabled={busy}>
            Подтвердить
          </Button>
          <Button variant="secondary" onClick={() => submit("rework")} disabled={busy}>
            В доработку
          </Button>
        </div>
      </Card>
    </div>
  );

  /* ── Layout ── */
  return (
    <div>
      {/* Desktop: side-by-side */}
      <div className="hidden lg:grid lg:grid-cols-[300px_1fr] lg:gap-5">
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">{listPanel}</div>
        <div>
          {selectedId === null ? (
            <Card className="py-16 text-center">
              <p className="text-[var(--color-text-secondary)]">Выберите КП из списка слева</p>
            </Card>
          ) : (
            detailPanel
          )}
        </div>
      </div>

      {/* Mobile: list or detail */}
      <div className="lg:hidden">
        {selectedId === null ? listPanel : detailPanel}
      </div>
    </div>
  );
}

/* ── Segment buttons for availability ── */
function AvailSegment({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-gray-50 p-0.5">
      {AVAIL_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? opt.color === "green"
                ? "bg-green-500 text-white shadow-sm"
                : opt.color === "yellow"
                  ? "bg-yellow-400 text-yellow-900 shadow-sm"
                  : "bg-red-500 text-white shadow-sm"
              : "text-[var(--color-text-secondary)] hover:bg-gray-100"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
