import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../api/client";

interface Zone { id: number; code: string; title_ru: string; active: boolean; }

export default function AdminZones() {
  const [items, setItems] = useState<Zone[]>([]);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");

  const load = () => apiGet<Zone[]>("/zones").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    await apiPost("/zones", { code, title_ru: title });
    setCode(""); setTitle("");
    load();
  }

  async function toggleActive(z: Zone) {
    await apiPatch(`/zones/${z.id}`, { active: !z.active });
    load();
  }

  return (
    <div>
      <h3>Зоны тушения</h3>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="Код (engine, tank…)" value={code} onChange={e => setCode(e.target.value)} required />
        <input placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} required />
        <button type="submit">Добавить</button>
      </form>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead><tr>{["ID","Код","Название","Active",""].map(h => <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 4 }}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map(z => (
            <tr key={z.id} style={{ opacity: z.active ? 1 : 0.5 }}>
              <td style={{ padding: 4 }}>{z.id}</td>
              <td style={{ padding: 4 }}>{z.code}</td>
              <td style={{ padding: 4 }}>{z.title_ru}</td>
              <td style={{ padding: 4 }}>{z.active ? "Да" : "Нет"}</td>
              <td style={{ padding: 4 }}><button onClick={() => toggleActive(z)}>{z.active ? "Откл" : "Вкл"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
