import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../api/client";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { Table, Th, Td, Tr } from "../ui/Table";
import Tabs from "../ui/Tabs";
import { statusLabel, statusBadgeColor, availLabel, availBadgeColor, getAvailableTransitions } from "../utils/status";

interface QuoteItemOut {
  id: number;
  technique_id: number;
  engine_option_id: number | null;
  engine_text: string | null;
  year: number | null;
  qty: number;
}

interface QuoteOut {
  id: number;
  created_by: number;
  status: string;
  customer_name: string | null;
  comment: string | null;
  zones: string[];
  items: QuoteItemOut[];
  created_at: string;
  updated_at: string;
}

interface ResultLine {
  id: number;
  sku_id: number;
  sku_code: string | null;
  sku_name: string | null;
  sku_unit: string | null;
  qty: number;
  note: string | null;
  availability_status: string | null;
  availability_comment: string | null;
}

interface CalcResult {
  quote_id: number;
  status: string;
  lines: ResultLine[];
}

const EDITABLE = new Set(["draft", "rework"]);
const CALCULABLE = new Set(["draft", "rework"]);
const HAS_RESULT = new Set(["calculated", "approved", "warehouse_check", "rework", "confirmed"]);

const DETAIL_TABS = [
  { key: "spec", label: "Спецификация" },
  { key: "warehouse", label: "Комментарии склада" },
];

interface Props {
  quoteId: number;
  role: string | null;
  onBack: () => void;
  onEdit: (id: number) => void;
}

export default function QuoteDetail({ quoteId, role, onBack, onEdit }: Props) {
  const [quote, setQuote] = useState<QuoteOut | null>(null);
  const [resultLines, setResultLines] = useState<ResultLine[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("spec");

  function loadQuote() {
    apiGet<QuoteOut>(`/quotes/${quoteId}`).then(setQuote).catch(() => setQuote(null));
  }

  function loadResult() {
    apiGet<ResultLine[]>(`/quotes/${quoteId}/result`).then(setResultLines).catch(() => setResultLines([]));
  }

  useEffect(() => { loadQuote(); loadResult(); }, [quoteId]);

  async function handleCalculate() {
    setError("");
    setCalculating(true);
    try {
      const res = await apiPost<CalcResult>(`/quotes/${quoteId}/calculate`, {});
      setResultLines(res.lines);
      loadQuote();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setCalculating(false);
    }
  }

  async function handleExportXlsx() {
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/quotes/${quoteId}/export/xlsx`, { method: "POST", headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quote_${quoteId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(String(err));
    }
  }

  async function handleStatusChange(newStatus: string) {
    setError("");
    setChangingStatus(true);
    try {
      await apiPost(`/quotes/${quoteId}/status`, { status: newStatus });
      loadQuote();
      loadResult();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleLineQtyChange(line: ResultLine, newQty: number) {
    try {
      const updated = await apiPatch<ResultLine>(`/quotes/${quoteId}/result/${line.id}`, { qty: newQty });
      setResultLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err: unknown) {
      setError(String(err));
    }
  }

  async function handleLineNoteChange(line: ResultLine, newNote: string) {
    try {
      const updated = await apiPatch<ResultLine>(`/quotes/${quoteId}/result/${line.id}`, { note: newNote || null });
      setResultLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err: unknown) {
      setError(String(err));
    }
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleString("ru");

  if (!quote) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-[var(--color-text-secondary)]">Загрузка…</p>
      </div>
    );
  }

  const warehouseLines = resultLines.filter((l) => l.availability_status || l.availability_comment);

  return (
    <div className="flex flex-col gap-5">
      {/* Summary card */}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Статус</span>
            <div className="mt-1">
              <Badge color={statusBadgeColor(quote.status)}>
                {statusLabel(quote.status)}
              </Badge>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Клиент</span>
            <p className="mt-1 text-sm font-medium">{quote.customer_name || "—"}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Зоны</span>
            <p className="mt-1 text-sm">{quote.zones.length ? quote.zones.join(", ") : "—"}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Создано</span>
            <p className="mt-1 text-sm">{fmtDate(quote.created_at)}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Обновлено</span>
            <p className="mt-1 text-sm">{fmtDate(quote.updated_at)}</p>
          </div>
          {quote.comment && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Комментарий</span>
              <p className="mt-1 text-sm">{quote.comment}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Назад
        </Button>

        <div className="hidden h-5 w-px bg-[var(--color-border)] sm:block" />

        {EDITABLE.has(quote.status) && (
          <Button variant="secondary" size="sm" onClick={() => onEdit(quote.id)}>
            Редактировать
          </Button>
        )}
        {CALCULABLE.has(quote.status) && (
          <Button variant="primary" size="sm" onClick={handleCalculate} disabled={calculating}>
            {calculating ? "Расчёт…" : "Рассчитать"}
          </Button>
        )}
        {resultLines.length > 0 && (
          <Button variant="secondary" size="sm" onClick={handleExportXlsx}>
            Экспорт в Excel
          </Button>
        )}

        {quote && getAvailableTransitions(quote.status, role).length > 0 && (
          <>
            <div className="hidden h-5 w-px bg-[var(--color-border)] sm:block" />
            {getAvailableTransitions(quote.status, role).map((t) => (
              <Button
                key={t.to}
                variant={t.danger ? "ghost" : "primary"}
                size="sm"
                className={t.danger ? "text-[var(--color-danger)] hover:bg-red-50" : ""}
                disabled={changingStatus}
                onClick={() => handleStatusChange(t.to)}
              >
                {changingStatus ? "Смена…" : t.label}
              </Button>
            ))}
          </>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {/* Tabs: spec / warehouse */}
      {(resultLines.length > 0 || HAS_RESULT.has(quote.status)) && (
        <>
          <Tabs tabs={DETAIL_TABS} active={tab} onChange={setTab} />

          {tab === "spec" && (
            <>
              {resultLines.length === 0 ? (
                <Card className="py-10 text-center">
                  <p className="text-[var(--color-text-secondary)]">Нет результатов расчёта</p>
                  {CALCULABLE.has(quote.status) && (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Нажмите «Рассчитать» для формирования спецификации</p>
                  )}
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Код</Th>
                        <Th>Название</Th>
                        <Th>Ед.</Th>
                        <Th>Кол-во</Th>
                        <Th>Заметка</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultLines.map((ln) => (
                        <Tr key={ln.id}>
                          <Td className="whitespace-nowrap font-medium">{ln.sku_code ?? ln.sku_id}</Td>
                          <Td>{ln.sku_name ?? "—"}</Td>
                          <Td className="text-[var(--color-text-secondary)]">{ln.sku_unit ?? "—"}</Td>
                          <Td>
                            {role === "admin" ? (
                              <input
                                type="number"
                                min={0}
                                className="w-20 rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                                value={ln.qty}
                                onChange={(e) => handleLineQtyChange(ln, Number(e.target.value))}
                              />
                            ) : (
                              <span className="font-medium">{ln.qty}</span>
                            )}
                          </Td>
                          <Td>
                            <input
                              className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                              value={ln.note ?? ""}
                              placeholder="заметка…"
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (val !== (ln.note ?? "")) handleLineNoteChange(ln, val);
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                setResultLines((prev) => prev.map((l) => (l.id === ln.id ? { ...l, note: val } : l)));
                              }}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}

          {tab === "warehouse" && (
            <>
              {warehouseLines.length === 0 ? (
                <Card className="py-10 text-center">
                  <p className="text-[var(--color-text-secondary)]">Нет комментариев склада</p>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Комментарии появятся после проверки склада
                  </p>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Код</Th>
                        <Th>Название</Th>
                        <Th>Кол-во</Th>
                        <Th>Наличие</Th>
                        <Th>Комментарий склада</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseLines.map((ln) => (
                        <Tr key={ln.id}>
                          <Td className="font-medium">{ln.sku_code ?? ln.sku_id}</Td>
                          <Td>{ln.sku_name ?? "—"}</Td>
                          <Td>{ln.qty}</Td>
                          <Td>
                            <Badge color={availBadgeColor(ln.availability_status ?? "")}>
                              {availLabel(ln.availability_status ?? "—")}
                            </Badge>
                          </Td>
                          <Td className="text-sm">{ln.availability_comment || "—"}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
