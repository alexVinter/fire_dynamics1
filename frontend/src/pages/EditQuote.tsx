import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPut } from "../api/client";
import EngineSelect from "../components/EngineSelect";
import TechniquePicker from "../components/TechniquePicker";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import { statusLabel, statusBadgeColor } from "../utils/status";

interface Zone { id: number; code: string; title_ru: string }

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
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
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
        setStatus(q.status);
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
    setForbidden(false);

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
      const msg = String(err);
      if (msg.includes("403") || msg.includes("409")) {
        setForbidden(true);
        setError("Редактирование этого КП запрещено. Возможно, статус был изменён или у вас нет прав.");
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadingQuote) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-[var(--color-text-secondary)]">Загрузка КП…</p>
      </div>
    );
  }

  const editable = status === "draft" || status === "rework";

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5 pb-28 md:pb-0">
      {/* Status banner */}
      {status && (
        <Card flat className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Статус:</span>
            <Badge color={statusBadgeColor(status)}>
              {statusLabel(status)}
            </Badge>
          </div>
          {!editable && !forbidden && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Редактирование доступно только для черновиков и КП на доработке
            </p>
          )}
        </Card>
      )}

      {forbidden && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {/* Client & comment */}
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Клиент"
            placeholder="Название компании"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={!editable}
          />
          <Input
            label="Комментарий"
            placeholder="Примечание к КП"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!editable}
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
          {editable && (
            <Button type="button" variant="ghost" size="sm" onClick={addRow} disabled={items.length >= 100}>
              + Добавить
            </Button>
          )}
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
                  {editable && <th className="w-10 px-3 py-2.5" />}
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
                        disabled={!editable}
                        className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) => updateItem(row.key, { qty: e.target.value })}
                        disabled={!editable}
                        className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                      />
                    </td>
                    {editable && (
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
                    )}
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
                {editable && items.length > 1 && (
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
                    disabled={!editable}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Кол-во"
                    value={row.qty}
                    onChange={(e) => updateItem(row.key, { qty: e.target.value })}
                    disabled={!editable}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                </div>
              </div>
            </div>
          ))}

          {editable && (
            <Button type="button" variant="secondary" size="sm" onClick={addRow} disabled={items.length >= 100} className="self-start">
              + Добавить технику
            </Button>
          )}
        </div>
      </Card>

      {/* Zones */}
      <Card>
        <h3 className="mb-3 text-base font-semibold">Зоны тушения</h3>
        {allZones.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Нет доступных зон</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {allZones.map((z) => (
              <label
                key={z.code}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  editable ? "cursor-pointer hover:bg-gray-50" : "cursor-default opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedZones.has(z.code)}
                  onChange={() => toggleZone(z.code)}
                  disabled={!editable}
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
        {editable && (
          <Button type="submit" variant="primary" disabled={saving || forbidden}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onCancel}>
          {editable ? "Отмена" : "Назад"}
        </Button>
        {error && !forbidden && <span className="text-sm text-[var(--color-danger)]">{error}</span>}
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-14 z-30 flex items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 shadow-[0_-2px_6px_rgba(0,0,0,.06)] md:hidden">
        {editable ? (
          <>
            <Button type="submit" variant="primary" disabled={saving || forbidden} className="flex-1">
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Отмена
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Назад
          </Button>
        )}
      </div>

      {error && !forbidden && (
        <p className="text-center text-sm text-[var(--color-danger)] md:hidden">{error}</p>
      )}
    </form>
  );
}
