import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface Ctx {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<Ctx>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/* Imperative API for use outside React (e.g. api/client.ts) */
const TOAST_EVENT = "app:toast";

export function toast(message: string, type: ToastType = "error") {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type } }));
}

/* Provider */
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const show = useCallback((message: string, type: ToastType = "error") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, 4500);
    timers.current.set(id, timer);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      show(message, type);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, [show]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 sm:bottom-6 sm:right-6">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="alert"
              className={`flex min-w-[280px] max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg animate-[slideUp_0.25s_ease-out] ${
                t.type === "error"
                  ? "border-red-200 bg-red-50 text-[var(--color-danger)]"
                  : t.type === "success"
                    ? "border-green-200 bg-green-50 text-[var(--color-success)]"
                    : "border-orange-200 bg-orange-50 text-orange-700"
              }`}
            >
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-1 shrink-0 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
