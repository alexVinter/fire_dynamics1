import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../api/client";

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
}

interface CalcResult {
  quote_id: number;
  status: string;
  lines: ResultLine[];
}

const EDITABLE = new Set(["draft", "rework"]);
const CALCULABLE = new Set(["draft", "rework"]);
const HAS_RESULT = new Set(["calculated", "approved", "warehouse_check", "rework", "confirmed"]);

interface Props {
  quoteId: number;
  role: string;
  onBack: () => void;
  onEdit: (id: number) => void;
}

export default function QuoteDetail({ quoteId, role, onBack, onEdit }: Props) {
  const [quote, setQuote] = useState<QuoteOut | null>(null);
  const [resultLines, setResultLines] = useState<ResultLine[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");

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

  if (!quote) return <p>Загрузка…</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={onBack}>← Назад</button>
        {EDITABLE.has(quote.status) && (
          <button onClick={() => onEdit(quote.id)}>Редактировать</button>
        )}
        {CALCULABLE.has(quote.status) && (
          <button onClick={handleCalculate} disabled={calculating}>
            {calculating ? "Расчёт…" : "Рассчитать"}
          </button>
        )}
      </div>

      <h2>КП #{quote.id}</h2>
      <p>Статус: <b>{quote.status}</b> | Клиент: {quote.customer_name || "—"}</p>
      <p>Зоны: {quote.zones.length ? quote.zones.join(", ") : "—"}</p>
      {quote.comment && <p>Комментарий: {quote.comment}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h3>Позиции техники ({quote.items.length})</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 24 }}>
        <thead>
          <tr>
            {["#", "Technique ID", "Двигатель", "Год", "Кол-во"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "4px 8px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quote.items.map((it, idx) => (
            <tr key={it.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "4px 8px" }}>{idx + 1}</td>
              <td style={{ padding: "4px 8px" }}>{it.technique_id}</td>
              <td style={{ padding: "4px 8px" }}>{it.engine_text || (it.engine_option_id ? `option #${it.engine_option_id}` : "—")}</td>
              <td style={{ padding: "4px 8px" }}>{it.year ?? "—"}</td>
              <td style={{ padding: "4px 8px" }}>{it.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(resultLines.length > 0 || HAS_RESULT.has(quote.status)) && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Спецификация ({resultLines.length} позиций)</h3>
            {resultLines.length > 0 && (
              <button onClick={handleExportXlsx}>Экспорт в Excel</button>
            )}
          </div>
          {resultLines.length === 0
            ? <p style={{ color: "#888" }}>Нет результатов расчёта</p>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr>
                    {["Код", "Название", "Ед.", "Кол-во", "Заметка"].map((h) => (
                      <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "4px 8px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultLines.map((ln) => (
                    <tr key={ln.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "4px 8px" }}>{ln.sku_code ?? ln.sku_id}</td>
                      <td style={{ padding: "4px 8px" }}>{ln.sku_name ?? "—"}</td>
                      <td style={{ padding: "4px 8px" }}>{ln.sku_unit ?? "—"}</td>
                      <td style={{ padding: "4px 8px" }}>
                        {role === "admin" ? (
                          <input
                            type="number"
                            min={0}
                            value={ln.qty}
                            onChange={(e) => handleLineQtyChange(ln, Number(e.target.value))}
                            style={{ width: 60, padding: 2 }}
                          />
                        ) : (
                          ln.qty
                        )}
                      </td>
                      <td style={{ padding: "4px 8px" }}>
                        <input
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
                          style={{ width: "100%", padding: 2, boxSizing: "border-box" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </>
      )}

      <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
        Создано: {new Date(quote.created_at).toLocaleString("ru")} | Обновлено: {new Date(quote.updated_at).toLocaleString("ru")}
      </p>
    </div>
  );
}
