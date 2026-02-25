import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../api/client";

export interface TechniqueItem {
  id: number;
  manufacturer: string;
  model: string;
  series: string | null;
  active: boolean;
}

interface Props {
  value: number | null;
  onChange: (id: number | null) => void;
}

type Mode = "search" | "tree";

export default function TechniquePicker({ value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>("search");

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 4, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setMode("search")}
          style={{ fontWeight: mode === "search" ? "bold" : "normal" }}
        >
          Поиск
        </button>
        <button
          type="button"
          onClick={() => setMode("tree")}
          style={{ fontWeight: mode === "tree" ? "bold" : "normal" }}
        >
          Дерево
        </button>
        {value && (
          <span style={{ marginLeft: "auto", fontSize: 13, color: "#555" }}>
            ID: {value}
          </span>
        )}
      </div>
      {mode === "search" ? (
        <SearchMode value={value} onChange={onChange} />
      ) : (
        <TreeMode value={value} onChange={onChange} />
      )}
    </div>
  );
}

function SearchMode({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TechniqueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<TechniqueItem[]>(
        `/techniques?search=${encodeURIComponent(q)}`,
      );
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  }

  return (
    <div>
      <input
        placeholder="Введите марку / модель / alias…"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
      />
      {loading && <p style={{ fontSize: 13 }}>Поиск…</p>}
      {results.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "4px 0", maxHeight: 200, overflowY: "auto" }}>
          {results.map((t) => (
            <li
              key={t.id}
              onClick={() => { onChange(t.id); setResults([]); setQuery(`${t.manufacturer} ${t.model}`); }}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                background: t.id === value ? "#e0e7ff" : "transparent",
              }}
            >
              {t.manufacturer} — {t.model} {t.series ? `(${t.series})` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface TreeNode {
  label: string;
  children?: TreeNode[];
  techniqueId?: number;
}

function buildTree(items: TechniqueItem[]): TreeNode[] {
  const mfrs = new Map<string, Map<string, TechniqueItem[]>>();
  for (const t of items) {
    if (!mfrs.has(t.manufacturer)) mfrs.set(t.manufacturer, new Map());
    const models = mfrs.get(t.manufacturer)!;
    const key = t.series ? `${t.model} / ${t.series}` : t.model;
    if (!models.has(key)) models.set(key, []);
    models.get(key)!.push(t);
  }

  const tree: TreeNode[] = [];
  for (const [mfr, models] of mfrs) {
    const children: TreeNode[] = [];
    for (const [modelKey, techs] of models) {
      if (techs.length === 1) {
        children.push({ label: modelKey, techniqueId: techs[0].id });
      } else {
        children.push({
          label: modelKey,
          children: techs.map((t) => ({
            label: `ID ${t.id}`,
            techniqueId: t.id,
          })),
        });
      }
    }
    tree.push({ label: mfr, children });
  }
  return tree;
}

function TreeMode({ value, onChange }: Props) {
  const [all, setAll] = useState<TechniqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<TechniqueItem[]>("/techniques")
      .then(setAll)
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, []);

  const tree = useMemo(() => buildTree(all), [all]);

  if (loading) return <p style={{ fontSize: 13 }}>Загрузка…</p>;

  return (
    <div style={{ maxHeight: 260, overflowY: "auto", fontSize: 14 }}>
      {tree.map((node) => (
        <TreeBranch key={node.label} node={node} value={value} onChange={onChange} depth={0} />
      ))}
      {tree.length === 0 && <p style={{ color: "#888" }}>Нет техники</p>}
    </div>
  );
}

function TreeBranch({
  node, value, onChange, depth,
}: {
  node: TreeNode; value: number | null; onChange: (id: number | null) => void; depth: number;
}) {
  const [open, setOpen] = useState(false);

  if (node.techniqueId !== undefined) {
    return (
      <div
        onClick={() => onChange(node.techniqueId!)}
        style={{
          paddingLeft: depth * 16 + 8,
          padding: "2px 8px 2px " + (depth * 16 + 8) + "px",
          cursor: "pointer",
          background: node.techniqueId === value ? "#e0e7ff" : "transparent",
        }}
      >
        {node.label}
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        style={{
          paddingLeft: depth * 16 + 8,
          cursor: "pointer",
          fontWeight: 600,
          userSelect: "none",
        }}
      >
        {open ? "▾" : "▸"} {node.label}
      </div>
      {open && node.children?.map((ch) => (
        <TreeBranch key={ch.label + (ch.techniqueId ?? "")} node={ch} value={value} onChange={onChange} depth={depth + 1} />
      ))}
    </div>
  );
}
