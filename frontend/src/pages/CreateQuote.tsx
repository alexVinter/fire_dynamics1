import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import EngineSelect from "../components/EngineSelect";
import TechniquePicker from "../components/TechniquePicker";

interface Zone { id: number; code: string; title_ru: string; }

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

interface Props {
  onSaved: (quoteId: number) => void;
}

export default function CreateQuote({ onSaved }: Props) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<ItemRow[]>([emptyRow(1)]);
  const [customerName, setCustomerName] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nextKey, setNextKey] = useState(2);

  useEffect(() => {
    apiGet<Zone[]>("/zones").then(setZones).catch(() => {});
  }, []);

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
      const body = {
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
      };
      const res = await apiPost<{ id: number }>("/quotes", body);
      onSaved(res.id);
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Новый расчёт</h2>
      <form onSubmit={handleSave}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <input placeholder="Клиент" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ padding: 6, width: 240 }} />
          <input placeholder="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} style={{ padding: 6, flex: 1 }} />
        </div>

        <fieldset style={{ marginBottom: 16, padding: 12 }}>
          <legend>Зоны тушения</legend>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {zones.map((z) => (
              <label key={z.code} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectedZones.has(z.code)}
                  onChange={() => toggleZone(z.code)}
                />{" "}
                {z.title_ru}
              </label>
            ))}
            {zones.length === 0 && <span style={{ color: "#888" }}>Нет зон</span>}
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
              <input
                type="number"
                placeholder="Год"
                value={row.year}
                onChange={(e) => updateItem(row.key, { year: e.target.value })}
                style={{ width: 70, padding: 4 }}
              />
              <input
                type="number"
                min={1}
                placeholder="Кол-во"
                value={row.qty}
                onChange={(e) => updateItem(row.key, { qty: e.target.value })}
                style={{ width: 60, padding: 4 }}
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeRow(row.key)} style={{ color: "red" }}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={addRow} disabled={items.length >= 100}>+ Добавить технику</button>
          <button type="submit" disabled={saving} style={{ padding: "8px 24px", fontWeight: 600 }}>
            {saving ? "Сохранение…" : "Сохранить черновик"}
          </button>
        </div>

        {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}
      </form>
    </div>
  );
}
