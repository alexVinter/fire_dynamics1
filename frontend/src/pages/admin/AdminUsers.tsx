import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiDelete } from "../../api/client";

interface UserItem {
  id: number;
  login: string;
  role: string | null;
  is_active: boolean;
}

const ROLES = ["manager", "admin", "warehouse"] as const;
const ROLE_LABEL: Record<string, string> = {
  admin: "Админ",
  manager: "Менеджер",
  warehouse: "Склад",
};

export default function AdminUsers() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("manager");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    apiGet<UserItem[]>("/admin/users")
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/admin/users", { login, password, role });
      setLogin(""); setPassword(""); setRole("manager");
      load();
    } catch { /* toast shown by client */ }
    finally { setSaving(false); }
  }

  async function toggleActive(u: UserItem) {
    try { await apiPatch(`/admin/users/${u.id}`, { is_active: !u.is_active }); load(); }
    catch { /* toast shown by client */ }
  }

  async function changeRole(u: UserItem, newRole: string) {
    try { await apiPatch(`/admin/users/${u.id}`, { role: newRole }); load(); }
    catch { /* toast shown by client */ }
  }

  async function handleDelete(u: UserItem) {
    if (!confirm(`Удалить пользователя «${u.login}»?`)) return;
    try { await apiDelete(`/admin/users/${u.id}`); load(); }
    catch { /* toast shown by client */ }
  }

  return (
    <div>
      <h3>Пользователи</h3>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="Логин" value={login} onChange={e => setLogin(e.target.value)} required />
        <input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        <select value={role} onChange={e => setRole(e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <button type="submit" disabled={saving}>{saving ? "Сохранение…" : "Добавить"}</button>
      </form>

      {loading && <p style={{ fontSize: 14, color: "#888" }}>Загрузка…</p>}

      {error && (
        <p style={{ fontSize: 14, color: "#dc2626" }}>
          Не удалось загрузить список.{" "}
          <button onClick={load} style={{ textDecoration: "underline", color: "inherit" }}>Повторить</button>
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p style={{ fontSize: 14, color: "#888" }}>Нет пользователей</p>
      )}

      {!loading && !error && items.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr>{["ID","Логин","Роль","Активен","Действия"].map(h => <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 4 }}>{h}</th>)}</tr></thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td style={{ padding: 4 }}>{u.id}</td>
                <td style={{ padding: 4 }}>{u.login}</td>
                <td style={{ padding: 4 }}>
                  <select value={u.role ?? ""} onChange={e => changeRole(u, e.target.value)}>
                    {u.role === null && <option value="" disabled>Без роли</option>}
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </td>
                <td style={{ padding: 4 }}>{u.is_active ? "Да" : "Нет"}</td>
                <td style={{ padding: 4, display: "flex", gap: 4 }}>
                  <button onClick={() => toggleActive(u)}>{u.is_active ? "Откл" : "Вкл"}</button>
                  <button onClick={() => handleDelete(u)} style={{ color: "#dc2626" }}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
