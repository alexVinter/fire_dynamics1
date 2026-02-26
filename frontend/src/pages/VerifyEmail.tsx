import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

interface Props {
  token: string;
  onGoLogin: () => void;
}

export default function VerifyEmail({ token, onGoLogin }: Props) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    apiGet(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Ошибка подтверждения");
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-card__title">Подтверждение email</div>

        {status === "loading" && (
          <p style={{ textAlign: "center", color: "#888", marginTop: 16 }}>Проверяем ссылку…</p>
        )}

        {status === "success" && (
          <>
            <p style={{ textAlign: "center", color: "var(--color-success)", marginTop: 16, marginBottom: 16 }}>
              Email успешно подтверждён!
            </p>
            <button className="btn btn--primary" style={{ width: "100%" }} onClick={onGoLogin}>
              Войти
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <p style={{ textAlign: "center", color: "var(--color-danger)", marginTop: 16, marginBottom: 16 }}>
              {errorMsg || "Ссылка недействительна или истекла"}
            </p>
            <button className="btn btn--primary" style={{ width: "100%" }} onClick={onGoLogin}>
              Перейти ко входу
            </button>
          </>
        )}
      </div>
    </div>
  );
}
