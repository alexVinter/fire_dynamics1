import { useState } from "react";
import AuthGuard from "./auth/AuthGuard";
import { useAuth } from "./auth/useAuth";
import AppShell from "./layout/AppShell";
import AdminPanel from "./pages/admin/AdminPanel";
import CreateQuote from "./pages/CreateQuote";
import Dashboard from "./pages/Dashboard";
import EditQuote from "./pages/EditQuote";
import QuoteDetail from "./pages/QuoteDetail";
import Warehouse from "./pages/Warehouse";

type Page = "dashboard" | "calc" | "admin" | "warehouse";

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [page, setPage] = useState<Page>("dashboard");
  const [openQuoteId, setOpenQuoteId] = useState<number | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);

  function handleNav(p: string) {
    setPage(p as Page);
    setOpenQuoteId(null);
    setEditingQuoteId(null);
  }

  if (loading || !user) {
    return <AuthGuard user={user} loading={loading} onLogin={login}><></></AuthGuard>;
  }

  const { breadcrumbs, title, subtitle } = pageHeader(page, openQuoteId, editingQuoteId);

  return (
    <AppShell
      user={user}
      currentPage={page}
      onNav={handleNav}
      onLogout={logout}
      breadcrumbs={breadcrumbs}
      title={title}
      subtitle={subtitle}
    >
      <PageContent
        page={page}
        role={user.role}
        openQuoteId={openQuoteId}
        onOpenQuote={setOpenQuoteId}
        editingQuoteId={editingQuoteId}
        onEditQuote={setEditingQuoteId}
        onNav={handleNav}
      />
    </AppShell>
  );
}

function pageHeader(page: Page, openId: number | null, editId: number | null) {
  const root = "Динамика Огня";

  if (page === "dashboard") {
    if (editId !== null) {
      return {
        breadcrumbs: [root, "История КП", `КП #${editId}`],
        title: "Редактирование КП",
        subtitle: `Черновик КП #${editId}`,
      };
    }
    if (openId !== null) {
      return {
        breadcrumbs: [root, "История КП"],
        title: `КП #${openId}`,
        subtitle: undefined,
      };
    }
    return {
      breadcrumbs: [root],
      title: "История КП",
      subtitle: "Все коммерческие предложения",
    };
  }

  if (page === "calc") {
    return {
      breadcrumbs: [root],
      title: "Новый расчёт",
      subtitle: "Подбор комплектации системы пожаротушения",
    };
  }

  if (page === "admin") {
    return {
      breadcrumbs: [root],
      title: "Админ-панель",
      subtitle: "Управление справочниками и пользователями",
    };
  }

  if (page === "warehouse") {
    return {
      breadcrumbs: [root],
      title: "Проверка склада",
      subtitle: "КП на проверке наличия",
    };
  }

  return { breadcrumbs: [root], title: "", subtitle: undefined };
}

function PageContent({
  page, role, openQuoteId, onOpenQuote, editingQuoteId, onEditQuote, onNav,
}: {
  page: Page; role: string;
  openQuoteId: number | null; onOpenQuote: (id: number | null) => void;
  editingQuoteId: number | null; onEditQuote: (id: number | null) => void;
  onNav: (p: string) => void;
}) {
  if (page === "admin" && role === "admin") return <AdminPanel />;
  if (page === "dashboard") {
    if (editingQuoteId !== null) {
      return (
        <EditQuote
          quoteId={editingQuoteId}
          onSaved={() => { onEditQuote(null); onOpenQuote(editingQuoteId); }}
          onCancel={() => { onEditQuote(null); onOpenQuote(editingQuoteId); }}
        />
      );
    }
    if (openQuoteId !== null) {
      return (
        <QuoteDetail
          quoteId={openQuoteId}
          role={role}
          onBack={() => onOpenQuote(null)}
          onEdit={(id) => { onEditQuote(id); }}
        />
      );
    }
    return <Dashboard onOpenQuote={onOpenQuote} onNav={onNav} />;
  }
  if (page === "calc") {
    return <CreateQuote onSaved={(id) => { onOpenQuote(id); onNav("dashboard"); }} />;
  }
  if (page === "warehouse") return <Warehouse />;
  return <div className="alert alert--error">Нет доступа.</div>;
}
