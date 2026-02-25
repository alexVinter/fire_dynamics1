import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPut } from "../api/client";
import EngineSelect from "../components/EngineSelect";
import TechniquePicker from "../components/TechniquePicker";

interface Zone { id: number; code: string; title_ru: string; }

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
  status: string;
  customer_name: string | null;
  comment: string | null;
  zones: string[];
  items: QuoteItemOut[];
}

interface ItemRow {
  key: number;
  techniqueId: number | null;
  engineOptionId: number | null;
  engineText: string;
  year: string;
  qty: string;
}

function emptyRow(key: number): ItemRow {
  return { key, techniqueId: null, engineOptionId: null, engineText: "", year: "", qty: "1" };
}

function itemToRow(it: QuoteItemOut, key: number): ItemRow {
  return {
    key,
    techniqueId: it.technique_id,
    engineOptionId: it.engine_option_id,
    engineText: it.engine_text ?? "",
    year: it.year != null ? String(it.year) : "",
    qty: String(it.qty),
  };
}

interface Props {
  quoteId: number;
  onSaved: () => void;
  onCancel: () => void;
}

export default function EditQuote({ quoteId, onSaved, onCancel }: Props) {
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<ItemRow[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [nextKey, setNextKey] = useState(1);

  useEffect(() => {
    apiGet<Zone[]>("/zones").then(setAllZones).catch(() => {});
  }, []);

  useEffect(() => {
    apiGet<QuoteOut>(`/quotes/${quoteId}`)
      .then((q) => {
        setCustomerName(q.customer_name ?? "");
        setComment(q.comment ?? "");
        setSelectedZones(new Set(q.zones));
        let k = 1;
        setItems(q.items.map((it) => itemToRow(it, k++)));
        setNextKey(k);
      })
      .catch(() => setError("Не удалось загрузить КП"))
      .finally(() => setLoadingQuote(false));
  }, [quoteId]);

  function toggleZone(code: string) {
    setSelectedZones((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  function updateItem(key: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (items.length >= 100) return;
    setItems((prev) => [...prev, emptyRow(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeRow(key: number) {
    setItems((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");

    const validItems = items.filter((r) => r.techniqueId !== null);
    if (validItems.length === 0) { setError("Добавьте хотя бы одну технику"); return; }

    setSaving(true);
    try {
      await apiPut(`/quotes/${quoteId}`, {
        customer_name: customerName || null,
        comment: comment || null,
        zones: Array.from(selectedZones),
        items: validItems.map((r) => ({
          technique_id: r.techniqueId,
          engine_option_id: r.engineOptionId || null,
          engine_text: r.engineText || null,
          year: r.year ? Number(r.year) : null,
          qty: Math.max(1, Number(r.qty) || 1),
        })),
      });
      onSaved();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loadingQuote) return <p>Загрузка…</p>;

  return (
    <div>
      <h2>Редактировать КП #{quoteId}</h2>
      <form onSubmit={handleSave}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <input placeholder="Клиент" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ padding: 6, width: 240 }} />
          <input placeholder="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} style={{ padding: 6, flex: 1 }} />
        </div>

        <fieldset style={{ marginBottom: 16, padding: 12 }}>
          <legend>Зоны тушения</legend>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {allZones.map((z) => (
              <label key={z.code} style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={selectedZones.has(z.code)} onChange={() => toggleZone(z.code)} />{" "}
                {z.title_ru}
              </label>
            ))}
          </div>
        </fieldset>

        <h3>Позиции техники ({items.length}/100)</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
          {items.map((row, idx) => (
            <div key={row.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: 8, border: "1px solid #eee", borderRadius: 4 }}>
              <span style={{ minWidth: 24, fontWeight: 600 }}>{idx + 1}.</span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <TechniquePicker
                  value={row.techniqueId}
                  onChange={(id) => updateItem(row.key, { techniqueId: id, engineOptionId: null, engineText: "" })}
                />
              </div>
              <div style={{ minWidth: 180 }}>
                <EngineSelect
                  techniqueId={row.techniqueId}
                  engineOptionId={row.engineOptionId}
                  engineText={row.engineText}
                  onChangeOptionId={(id) => updateItem(row.key, { engineOptionId: id })}
                  onChangeText={(t) => updateItem(row.key, { engineText: t })}
                />
              </div>
              <input type="number" placeholder="Год" value={row.year} onChange={(e) => updateItem(row.key, { year: e.target.value })} style={{ width: 70, padding: 4 }} />
              <input type="number" min={1} placeholder="Кол-во" value={row.qty} onChange={(e) => updateItem(row.key, { qty: e.target.value })} style={{ width: 60, padding: 4 }} />
              {items.length > 1 && (
                <button type="button" onClick={() => removeRow(row.key)} style={{ color: "red" }}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={addRow} disabled={items.length >= 100}>+ Добавить технику</button>
          <button type="submit" disabled={saving} style={{ padding: "8px 24px", fontWeight: 600 }}>
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          <button type="button" onClick={onCancel}>Отмена</button>
        </div>

        {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}
      </form>
    </div>
  );
}
