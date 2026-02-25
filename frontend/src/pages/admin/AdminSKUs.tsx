import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../api/client";

interface SKU { id: number; code: string; name: string; unit: string; active: boolean; version_tag: string | null; }

export default function AdminSKUs() {
  const [items, setItems] = useState<SKU[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("шт");

  const load = () => apiGet<SKU[]>("/skus").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    await apiPost("/skus", { code, name, unit });
    setCode(""); setName(""); setUnit("шт");
    load();
  }

  async function toggleActive(s: SKU) {
    await apiPatch(`/skus/${s.id}`, { active: !s.active });
    load();
  }

  return (
    <div>
      <h3>Номенклатура (SKU)</h3>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="Код" value={code} onChange={e => setCode(e.target.value)} required />
        <input placeholder="Название" value={name} onChange={e => setName(e.target.value)} required />
        <input placeholder="Ед.изм." value={unit} onChange={e => setUnit(e.target.value)} required style={{ width: 60 }} />
        <button type="submit">Добавить</button>
      </form>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead><tr>{["ID","Код","Название","Ед.","Active",""].map(h => <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 4 }}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map(s => (
            <tr key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
              <td style={{ padding: 4 }}>{s.id}</td>
              <td style={{ padding: 4 }}>{s.code}</td>
              <td style={{ padding: 4 }}>{s.name}</td>
              <td style={{ padding: 4 }}>{s.unit}</td>
              <td style={{ padding: 4 }}>{s.active ? "Да" : "Нет"}</td>
              <td style={{ padding: 4 }}><button onClick={() => toggleActive(s)}>{s.active ? "Откл" : "Вкл"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
