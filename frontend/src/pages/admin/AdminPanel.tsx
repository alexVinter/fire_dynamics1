import { useState } from "react";
import AdminAliases from "./AdminAliases";
import AdminRules from "./AdminRules";
import AdminSKUs from "./AdminSKUs";
import AdminTechniques from "./AdminTechniques";
import AdminZones from "./AdminZones";

const TABS = [
  { key: "techniques", label: "Техника" },
  { key: "aliases", label: "Aliases" },
  { key: "zones", label: "Зоны" },
  { key: "skus", label: "SKU" },
  { key: "rules", label: "Правила" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_CONTENT: Record<TabKey, () => JSX.Element> = {
  techniques: AdminTechniques,
  aliases: AdminAliases,
  zones: AdminZones,
  skus: AdminSKUs,
  rules: AdminRules,
};

export default function AdminPanel() {
  const [tab, setTab] = useState<TabKey>("techniques");
  const Content = TAB_CONTENT[tab];

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "6px 14px",
              fontWeight: tab === t.key ? "bold" : "normal",
              borderBottom: tab === t.key ? "2px solid #333" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Content />
    </div>
  );
}
