import { useState } from "react";
import Card from "../../ui/Card";
import Tabs from "../../ui/Tabs";
import AdminAliases from "./AdminAliases";
import AdminRules from "./AdminRules";
import AdminSKUs from "./AdminSKUs";
import AdminTechniques from "./AdminTechniques";
import AdminUsers from "./AdminUsers";
import AdminZones from "./AdminZones";

const TABS = [
  { key: "users",      label: "Пользователи", hint: "Управление учётными записями и ролями" },
  { key: "techniques", label: "Техника",  hint: "Каталог техники и производителей" },
  { key: "aliases",    label: "Псевдонимы", hint: "Альтернативные названия для поиска" },
  { key: "zones",      label: "Зоны",     hint: "Зоны защиты (двигатель, бак и т.д.)" },
  { key: "skus",       label: "Номенклатура", hint: "Номенклатура оборудования" },
  { key: "rules",      label: "Правила",  hint: "Правила расчёта комплектации" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_CONTENT: Record<TabKey, () => React.ReactNode> = {
  users: AdminUsers,
  techniques: AdminTechniques,
  aliases: AdminAliases,
  zones: AdminZones,
  skus: AdminSKUs,
  rules: AdminRules,
};

export default function AdminPanel() {
  const [tab, setTab] = useState<TabKey>("users");
  const Content = TAB_CONTENT[tab];
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop tabs */}
      <div className="hidden sm:block">
        <Tabs
          tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />
      </div>

      {/* Mobile select */}
      <div className="sm:hidden">
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as TabKey)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm font-medium focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
        >
          {TABS.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <Card>
        <div className="mb-4 border-b border-[var(--color-border)] pb-3">
          <h3 className="text-base font-semibold">{current.label}</h3>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{current.hint}</p>
        </div>
        <Content />
      </Card>
    </div>
  );
}
