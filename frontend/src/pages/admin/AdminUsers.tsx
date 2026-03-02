import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiDelete } from "../../api/client";
import { Table, Th, Td, Tr } from "../../ui/Table";

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
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
      >
        <input
          className="w-full min-w-0 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 sm:w-auto sm:flex-1 sm:min-w-[100px]"
          placeholder="Логин"
          value={login}
          onChange={e => setLogin(e.target.value)}
          required
        />
        <input
          className="w-full min-w-0 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 sm:w-auto sm:flex-1 sm:min-w-[100px]"
          placeholder="Пароль"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <select
          className="w-full min-w-0 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 sm:w-auto sm:min-w-[120px]"
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Сохранение…" : "Добавить"}
        </button>
      </form>

      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Загрузка…</p>}

      {error && (
        <p className="text-sm text-[var(--color-danger)]">
          Не удалось загрузить список.{" "}
          <button type="button" onClick={load} className="underline">Повторить</button>
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)]">Нет пользователей</p>
      )}

      {!loading && !error && items.length > 0 && (
        <Table className="min-w-[520px]">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Логин</Th>
              <Th>Роль</Th>
              <Th>Активен</Th>
              <Th>Действия</Th>
            </tr>
          </thead>
          <tbody>
            {items.map(u => (
              <Tr key={u.id} className={u.is_active ? "" : "opacity-50"}>
                <Td>{u.id}</Td>
                <Td>{u.login}</Td>
                <Td>
                  <select
                    className="min-w-0 rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20"
                    value={u.role ?? ""}
                    onChange={e => changeRole(u, e.target.value)}
                  >
                    {u.role === null && <option value="" disabled>Без роли</option>}
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </Td>
                <Td>{u.is_active ? "Да" : "Нет"}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="rounded border border-[var(--color-border)] bg-white px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => toggleActive(u)}
                    >
                      {u.is_active ? "Откл" : "Вкл"}
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-xs text-[var(--color-danger)] hover:bg-red-50"
                      onClick={() => handleDelete(u)}
                    >
                      Удалить
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
