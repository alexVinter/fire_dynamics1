import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../api/client";

interface Technique {
  id: number;
  manufacturer: string;
  model: string;
  series: string | null;
  active: boolean;
}

export default function AdminTechniques() {
  const [items, setItems] = useState<Technique[]>([]);
  const [mfr, setMfr] = useState("");
  const [model, setModel] = useState("");
  const [series, setSeries] = useState("");

  const load = () => apiGet<Technique[]>("/techniques").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    await apiPost("/techniques", { manufacturer: mfr, model, series: series || null });
    setMfr(""); setModel(""); setSeries("");
    load();
  }

  async function toggleActive(t: Technique) {
    await apiPatch(`/techniques/${t.id}`, { active: !t.active });
    load();
  }

  return (
    <div>
      <h3>Техника</h3>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="Производитель" value={mfr} onChange={e => setMfr(e.target.value)} required />
        <input placeholder="Модель" value={model} onChange={e => setModel(e.target.value)} required />
        <input placeholder="Серия" value={series} onChange={e => setSeries(e.target.value)} />
        <button type="submit">Добавить</button>
      </form>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead><tr>{["ID","Производитель","Модель","Серия","Активен",""].map(h => <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 4 }}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map(t => (
            <tr key={t.id} style={{ opacity: t.active ? 1 : 0.5 }}>
              <td style={{ padding: 4 }}>{t.id}</td>
              <td style={{ padding: 4 }}>{t.manufacturer}</td>
              <td style={{ padding: 4 }}>{t.model}</td>
              <td style={{ padding: 4 }}>{t.series ?? "—"}</td>
              <td style={{ padding: 4 }}>{t.active ? "Да" : "Нет"}</td>
              <td style={{ padding: 4 }}><button onClick={() => toggleActive(t)}>{t.active ? "Откл" : "Вкл"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
