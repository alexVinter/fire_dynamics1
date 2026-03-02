import { type FormEvent, useState } from "react";
import { apiGet, apiPost } from "../../api/client";
import type { ColumnDef } from "../../hooks/useTableData";
import { useTableData } from "../../hooks/useTableData";
import { Table, Td, Tr } from "../../ui/Table";
import { SortableTh, FilterRow, PaginationBar } from "../../ui/TableControls";

interface RuleOut {
  id: number;
  technique_id: number;
  conditions: Record<string, unknown>;
  actions: unknown[];
  version: number;
  active_from: string | null;
  active_to: string | null;
  active: boolean;
}

const COLUMNS: ColumnDef<RuleOut>[] = [
  { key: "id", sortable: true },
  { key: "technique_id", sortable: true, filterable: true },
  { key: "version", sortable: true },
  { key: "conditions" },
  { key: "actions" },
  {
    key: "active",
    sortable: true,
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "true", label: "Активные" },
      { value: "false", label: "Неактивные" },
    ],
  },
];

export default function AdminRules() {
  const [techId, setTechId] = useState("");
  const [rules, setRules] = useState<RuleOut[]>([]);

  const [newTechId, setNewTechId] = useState("");
  const [conditions, setConditions] = useState('{}');
  const [actions, setActions] = useState('[{"sku_code":"","qty_expr":"1 * qty"}]');
  const [msg, setMsg] = useState("");

  const {
    view, sort, toggleSort, filters, setFilter,
    page, setPage, pageSize, setPageSize,
    totalPages, totalFiltered, totalRows,
  } = useTableData(rules, COLUMNS);

  async function handleLoad(e: FormEvent) {
    e.preventDefault();
    if (!techId) return;
    try {
      const data = await apiGet<RuleOut[]>(`/rules?technique_id=${techId}`);
      setRules(data);
    } catch { setRules([]); }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const c = JSON.parse(conditions);
      const a = JSON.parse(actions);
      if (!Array.isArray(a) || a.length === 0) { setMsg("Действия должны быть непустым массивом"); return; }
      await apiPost("/rules", { technique_id: Number(newTechId), conditions: c, actions: a });
      setMsg("Правило создано");
    } catch (err: unknown) {
      setMsg(String(err));
    }
  }

  return (
    <div>
      <form onSubmit={handleLoad} style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <input placeholder="ID техники" type="number" value={techId} onChange={e => setTechId(e.target.value)} required />
        <button type="submit">Загрузить</button>
      </form>

      {rules.length > 0 && (
        <>
          <Table>
            <thead>
              <tr>
                <SortableTh columnKey="id" sort={sort} onSort={toggleSort}>ID</SortableTh>
                <SortableTh columnKey="technique_id" sort={sort} onSort={toggleSort}>Техника</SortableTh>
                <SortableTh columnKey="version" sort={sort} onSort={toggleSort}>Версия</SortableTh>
                <th className="whitespace-nowrap border-b border-[var(--color-border)] bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Условия</th>
                <th className="whitespace-nowrap border-b border-[var(--color-border)] bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Действия</th>
                <SortableTh columnKey="active" sort={sort} onSort={toggleSort}>Активен</SortableTh>
              </tr>
              <FilterRow columns={COLUMNS} filters={filters} onFilter={setFilter} />
            </thead>
            <tbody>
              {view.map(r => (
                <Tr key={r.id}>
                  <Td>{r.id}</Td>
                  <Td>{r.technique_id}</Td>
                  <Td>{r.version}</Td>
                  <Td className="max-w-[200px] truncate">{JSON.stringify(r.conditions)}</Td>
                  <Td className="max-w-[200px] truncate">{JSON.stringify(r.actions)}</Td>
                  <Td>{r.active ? "Да" : "Нет"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <PaginationBar
            page={page} totalPages={totalPages} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={setPageSize}
            totalFiltered={totalFiltered} totalRows={totalRows}
          />
        </>
      )}

      <h4 style={{ marginTop: 16 }}>Добавить правило</h4>
      <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 500 }}>
        <input placeholder="ID техники" type="number" value={newTechId} onChange={e => setNewTechId(e.target.value)} required />
        <textarea placeholder='Условия JSON: {"zones_included":["engine"]}' rows={3} value={conditions} onChange={e => setConditions(e.target.value)} />
        <textarea placeholder='Действия JSON: [{"sku_code":"MOD_A","qty_expr":"1 * qty"}]' rows={3} value={actions} onChange={e => setActions(e.target.value)} />
        <button type="submit">Создать</button>
      </form>
      {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
    </div>
  );
}
