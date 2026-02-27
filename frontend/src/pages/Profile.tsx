import { type FormEvent, useState } from "react";
import { apiPatch } from "../api/client";
import { type UserMe, roleLabel } from "../auth/types";

interface Props {
  user: UserMe;
}

export default function Profile({ user }: Props) {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      await apiPatch("/auth/me", { current_password: currentPwd, new_password: newPwd });
      setMsg({ text: "Пароль успешно изменён", ok: true });
      setCurrentPwd("");
      setNewPwd("");
    } catch (err: unknown) {
      setMsg({ text: err instanceof Error ? err.message : "Ошибка", ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 24, padding: 16, background: "var(--color-bg-card)", borderRadius: 12, border: "1px solid var(--color-border)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Информация</h3>
        <p style={{ margin: 0, fontSize: 14 }}><b>Логин:</b> {user.login}</p>
        <p style={{ margin: "4px 0 0", fontSize: 14 }}><b>Роль:</b> {roleLabel(user.role)}</p>
      </div>

      <div style={{ padding: 16, background: "var(--color-bg-card)", borderRadius: 12, border: "1px solid var(--color-border)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Смена пароля</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Текущий пароль</label>
            <input
              type="password"
              className="form-input"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              required
              placeholder="Введите текущий пароль"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Новый пароль</label>
            <input
              type="password"
              className="form-input"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
              minLength={6}
              placeholder="Минимум 6 символов"
            />
          </div>
          {msg && (
            <p style={{ fontSize: 13, margin: 0, color: msg.ok ? "var(--color-success)" : "var(--color-danger)" }}>
              {msg.text}
            </p>
          )}
          <button type="submit" disabled={saving} className="btn btn--primary">
            {saving ? "Сохранение…" : "Сменить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
