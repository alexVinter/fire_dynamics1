import { type FormEvent, useState } from "react";
import { apiPost } from "../api/client";

interface Props {
  onGoLogin: () => void;
}

export default function Register({ onGoLogin }: Props) {
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiPost("/auth/register", { login, email, password });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-card__title">Регистрация</div>
          <div className="login-card__sub" style={{ marginBottom: 16 }}>
            Проверьте почту — мы отправили ссылку для подтверждения email.
          </div>
          <button className="btn btn--primary" style={{ width: "100%" }} onClick={onGoLogin}>
            Перейти ко входу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-card__title">Регистрация</div>
        <div className="login-card__sub">Создайте учётную запись</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Логин</label>
            <input
              className="form-input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              autoFocus
              placeholder="Придумайте логин"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@mail.ru"
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
              minLength={6}
              placeholder="Минимум 6 символов"
            />
          </div>
          {error && <div className="alert alert--error mb-12">{error}</div>}
          <button type="submit" disabled={submitting} className="btn btn--primary" style={{ width: "100%" }}>
            {submitting ? "Регистрация…" : "Зарегистрироваться"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
          Уже есть аккаунт?{" "}
          <button
            onClick={onGoLogin}
            style={{ color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "inherit" }}
          >
            Войти
          </button>
        </p>
      </div>
    </div>
  );
}
