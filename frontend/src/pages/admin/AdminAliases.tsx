import { type FormEvent, useState } from "react";
import { apiPost } from "../../api/client";

export default function AdminAliases() {
  const [aliasText, setAliasText] = useState("");
  const [techId, setTechId] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await apiPost("/technique-aliases", {
        alias_text: aliasText,
        technique_id: Number(techId),
        note: note || null,
      });
      setMsg(`Alias "${aliasText}" создан`);
      setAliasText(""); setTechId(""); setNote("");
    } catch (err: unknown) {
      setMsg(String(err));
    }
  }

  return (
    <div>
      <h3>Aliases техники</h3>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <input placeholder="Alias текст" value={aliasText} onChange={e => setAliasText(e.target.value)} required />
        <input placeholder="Technique ID" type="number" value={techId} onChange={e => setTechId(e.target.value)} required />
        <input placeholder="Заметка" value={note} onChange={e => setNote(e.target.value)} />
        <button type="submit">Создать alias</button>
      </form>
      {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
    </div>
  );
}
