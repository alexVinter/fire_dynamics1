import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";

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
      setLines(result.map((ln) => ({ ...ln, availability_status: "ok", availability_comment: "" })));
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

  if (selectedId !== null) {
    return (
      <div>
        <button onClick={() => setSelectedId(null)} style={{ marginBottom: 12 }}>← К списку</button>
        <h2>КП #{selectedId} — Проверка склада</h2>

        {message && <p style={{ color: message.startsWith("Error") ? "red" : "green" }}>{message}</p>}

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 16 }}>
          <thead>
            <tr>
              {["Код", "Название", "Ед.", "Кол-во", "Заметка", "Статус наличия", "Комментарий"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "4px 8px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((ln, idx) => (
              <tr key={ln.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "4px 8px" }}>{ln.sku_code ?? ln.sku_id}</td>
                <td style={{ padding: "4px 8px" }}>{ln.sku_name ?? "—"}</td>
                <td style={{ padding: "4px 8px" }}>{ln.sku_unit ?? "—"}</td>
                <td style={{ padding: "4px 8px" }}>{ln.qty}</td>
                <td style={{ padding: "4px 8px" }}>{ln.note ?? "—"}</td>
                <td style={{ padding: "4px 8px" }}>
                  <select
                    value={ln.availability_status}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, availability_status: val } : l)));
                    }}
                    style={{ padding: 2 }}
                  >
                    <option value="ok">В наличии</option>
                    <option value="order">Под заказ</option>
                    <option value="missing">Отсутствует</option>
                  </select>
                </td>
                <td style={{ padding: "4px 8px" }}>
                  <input
                    value={ln.availability_comment}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, availability_comment: val } : l)));
                    }}
                    placeholder="комментарий…"
                    style={{ width: "100%", padding: 2, boxSizing: "border-box" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginBottom: 12 }}>
          <label>Общий комментарий: </label>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ padding: 4, minWidth: 300 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => submit("confirmed")} disabled={busy}
            style={{ padding: "8px 20px", background: "#4caf50", color: "#fff", border: "none", cursor: "pointer" }}>
            Подтвердить
          </button>
          <button onClick={() => submit("rework")} disabled={busy}
            style={{ padding: "8px 20px", background: "#ff9800", color: "#fff", border: "none", cursor: "pointer" }}>
            В доработку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Склад — На проверке</h2>
      {quotes.length === 0 && <p style={{ color: "#888" }}>Нет КП на проверке</p>}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {["ID", "Клиент", "Позиций", "Создано", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "6px 8px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "6px 8px" }}>{q.id}</td>
              <td style={{ padding: "6px 8px" }}>{q.customer_name || "—"}</td>
              <td style={{ padding: "6px 8px" }}>{q.items_count}</td>
              <td style={{ padding: "6px 8px" }}>{new Date(q.created_at).toLocaleDateString("ru")}</td>
              <td style={{ padding: "6px 8px" }}>
                <button onClick={() => openQuote(q.id)}>Проверить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
