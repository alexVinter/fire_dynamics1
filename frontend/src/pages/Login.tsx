import { type FormEvent, useState } from "react";

interface Props {
  onLogin: (login: string, password: string) => Promise<void>;
}

export default function Login({ onLogin }: Props) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onLogin(login, password);
    } catch {
      setError("Неверный логин или пароль");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-card__title">Динамика Огня</div>
        <div className="login-card__sub">Система подбора пожаротушения</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Логин</label>
            <input
              className="form-input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              autoFocus
              placeholder="Введите логин"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Введите пароль"
            />
          </div>
          {error && <div className="alert alert--error mb-12">{error}</div>}
          <button type="submit" disabled={submitting} className="btn btn--primary" style={{ width: "100%" }}>
            {submitting ? "Вход…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
