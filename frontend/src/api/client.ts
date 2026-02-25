import { toast } from "../ui/Toast";

const BASE = "/api";
const AUTH_LOGOUT_EVENT = "auth:logout";

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json();

  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (body.detail) message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
  } catch { /* no json body */ }

  if (res.status === 401) {
    toast("Сессия истекла, войдите заново", "error");
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
  } else if (res.status === 403) {
    toast("Нет доступа: " + message, "error");
  } else if (res.status === 409 || res.status === 422 || res.status === 400) {
    toast(message, "error");
  }

  throw new Error(message);
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  const h: Record<string, string> = {};
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}
