import { useState } from "react";
import AuthGuard, { useMenuItems } from "./auth/AuthGuard";
import { useAuth } from "./auth/useAuth";
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

  function handleNav(p: Page) {
    setPage(p);
    setOpenQuoteId(null);
    setEditingQuoteId(null);
  }

  if (loading || !user) {
    return <AuthGuard user={user} loading={loading} onLogin={login}><></></AuthGuard>;
  }

  return (
    <>
      <header className="app-header">
        <span className="app-header__logo">Динамика Огня</span>
        <span className="app-header__spacer" />
        <span className="app-header__user hide-mobile">
          {user.login} <span className="text-secondary">({user.role})</span>
        </span>
        <button className="btn btn--ghost btn--sm" onClick={logout}>Выйти</button>
      </header>
      <Nav role={user.role} current={page} onNav={handleNav} />
      <main className="app-main">
        <PageContent
          page={page}
          role={user.role}
          openQuoteId={openQuoteId}
          onOpenQuote={setOpenQuoteId}
          editingQuoteId={editingQuoteId}
          onEditQuote={setEditingQuoteId}
          onNav={handleNav}
        />
      </main>
    </>
  );
}

function Nav({ role, current, onNav }: { role: string; current: Page; onNav: (p: Page) => void }) {
  const items = useMenuItems(role);
  return (
    <nav className="app-nav">
      {items.map((item) => (
        <button
          key={item.key}
          className={`app-nav__item${current === item.key ? " app-nav__item--active" : ""}`}
          onClick={() => onNav(item.key as Page)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function PageContent({
  page, role, openQuoteId, onOpenQuote, editingQuoteId, onEditQuote, onNav,
}: {
  page: Page; role: string;
  openQuoteId: number | null; onOpenQuote: (id: number | null) => void;
  editingQuoteId: number | null; onEditQuote: (id: number | null) => void;
  onNav: (p: Page) => void;
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
    return <Dashboard onOpenQuote={onOpenQuote} />;
  }
  if (page === "calc") {
    return <CreateQuote onSaved={(id) => { onOpenQuote(id); onNav("dashboard"); }} />;
  }
  if (page === "warehouse") return <Warehouse />;
  return <div className="alert alert--error">Нет доступа.</div>;
}
