import { type FormEvent, useState } from "react";
import { apiGet, apiPost } from "../../api/client";

interface RuleOut {
  id: number;
  technique_id: number;
  conditions: Record<string, unknown>;
  actions: unknown[];
  version: number;
  active_from: string | null;
  active_to: string | null;
  active: boolean;
}

export default function AdminRules() {
  const [techId, setTechId] = useState("");
  const [rules, setRules] = useState<RuleOut[]>([]);

  const [newTechId, setNewTechId] = useState("");
  const [conditions, setConditions] = useState('{}');
  const [actions, setActions] = useState('[{"sku_code":"","qty_expr":"1 * qty"}]');
  const [msg, setMsg] = useState("");

  async function handleLoad(e: FormEvent) {
    e.preventDefault();
    if (!techId) return;
    try {
      const data = await apiGet<RuleOut[]>(`/rules?technique_id=${techId}`);
      setRules(data);
    } catch { setRules([]); }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const c = JSON.parse(conditions);
      const a = JSON.parse(actions);
      if (!Array.isArray(a) || a.length === 0) { setMsg("actions должен быть непустым массивом"); return; }
      await apiPost("/rules", { technique_id: Number(newTechId), conditions: c, actions: a });
      setMsg("Правило создано");
    } catch (err: unknown) {
      setMsg(String(err));
    }
  }

  return (
    <div>
      <h3>Правила расчёта</h3>

      <form onSubmit={handleLoad} style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <input placeholder="Technique ID" type="number" value={techId} onChange={e => setTechId(e.target.value)} required />
        <button type="submit">Загрузить</button>
      </form>

      {rules.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
          <thead><tr>{["ID","Tech","Ver","Conditions","Actions","Active"].map(h => <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 4 }}>{h}</th>)}</tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id}>
                <td style={{ padding: 4 }}>{r.id}</td>
                <td style={{ padding: 4 }}>{r.technique_id}</td>
                <td style={{ padding: 4 }}>{r.version}</td>
                <td style={{ padding: 4, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{JSON.stringify(r.conditions)}</td>
                <td style={{ padding: 4, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{JSON.stringify(r.actions)}</td>
                <td style={{ padding: 4 }}>{r.active ? "Да" : "Нет"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4>Добавить правило</h4>
      <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 500 }}>
        <input placeholder="Technique ID" type="number" value={newTechId} onChange={e => setNewTechId(e.target.value)} required />
        <textarea placeholder='Conditions JSON: {"zones_included":["engine"]}' rows={3} value={conditions} onChange={e => setConditions(e.target.value)} />
        <textarea placeholder='Actions JSON: [{"sku_code":"MOD_A","qty_expr":"1 * qty"}]' rows={3} value={actions} onChange={e => setActions(e.target.value)} />
        <button type="submit">Создать</button>
      </form>
      {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
    </div>
  );
}
