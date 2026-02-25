import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import EngineSelect from "../components/EngineSelect";
import TechniquePicker from "../components/TechniquePicker";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";

interface Zone { id: number; code: string; title_ru: string }

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
    <form onSubmit={handleSave} className="flex flex-col gap-5 pb-28 md:pb-0">
      {/* Client & comment */}
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Клиент"
            placeholder="Название компании"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Input
            label="Комментарий"
            placeholder="Примечание к КП"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </Card>

      {/* Technique items */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">
            Техника
            <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
              {items.length}/100
            </span>
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={addRow} disabled={items.length >= 100}>
            + Добавить
          </Button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-gray-50 text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  <th className="w-8 px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Техника</th>
                  <th className="px-3 py-2.5">Двигатель</th>
                  <th className="w-20 px-3 py-2.5">Год</th>
                  <th className="w-16 px-3 py-2.5">Кол-во</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.key} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <TechniquePicker
                        value={row.techniqueId}
                        onChange={(id) => updateItem(row.key, { techniqueId: id, engineOptionId: null, engineText: "" })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EngineSelect
                        techniqueId={row.techniqueId}
                        engineOptionId={row.engineOptionId}
                        engineText={row.engineText}
                        onChangeOptionId={(id) => updateItem(row.key, { engineOptionId: id })}
                        onChangeText={(t) => updateItem(row.key, { engineText: t })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        placeholder="Год"
                        value={row.year}
                        onChange={(e) => updateItem(row.key, { year: e.target.value })}
                        className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) => updateItem(row.key, { qty: e.target.value })}
                        className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-[var(--color-danger)]"
                          title="Удалить"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {items.map((row, idx) => (
            <div key={row.key} className="rounded-lg border border-[var(--color-border)] bg-gray-50/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Позиция {idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-[var(--color-danger)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <TechniquePicker
                  value={row.techniqueId}
                  onChange={(id) => updateItem(row.key, { techniqueId: id, engineOptionId: null, engineText: "" })}
                />
                <EngineSelect
                  techniqueId={row.techniqueId}
                  engineOptionId={row.engineOptionId}
                  engineText={row.engineText}
                  onChangeOptionId={(id) => updateItem(row.key, { engineOptionId: id })}
                  onChangeText={(t) => updateItem(row.key, { engineText: t })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Год"
                    value={row.year}
                    onChange={(e) => updateItem(row.key, { year: e.target.value })}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Кол-во"
                    value={row.qty}
                    onChange={(e) => updateItem(row.key, { qty: e.target.value })}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="secondary" size="sm" onClick={addRow} disabled={items.length >= 100} className="self-start">
            + Добавить технику
          </Button>
        </div>
      </Card>

      {/* Zones */}
      <Card>
        <h3 className="mb-3 text-base font-semibold">Зоны тушения</h3>
        {zones.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Нет доступных зон</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((z) => (
              <label
                key={z.code}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedZones.has(z.code)}
                  onChange={() => toggleZone(z.code)}
                  className="h-4 w-4 rounded border-gray-300 text-[var(--color-accent)] accent-[var(--color-accent)]"
                />
                <span>{z.title_ru}</span>
              </label>
            ))}
          </div>
        )}
      </Card>

      {/* Desktop actions */}
      <div className="hidden items-center gap-3 md:flex">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить черновик"}
        </Button>
        {error && <span className="text-sm text-[var(--color-danger)]">{error}</span>}
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 shadow-[0_-2px_6px_rgba(0,0,0,.06)] md:hidden">
        {error && <p className="mb-2 text-center text-sm text-[var(--color-danger)]">{error}</p>}
        <Button type="submit" variant="primary" disabled={saving} className="w-full">
          {saving ? "Сохранение…" : "Сохранить черновик"}
        </Button>
      </div>
    </form>
  );
}
