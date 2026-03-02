import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../api/client";
import type { ColumnDef } from "../../hooks/useTableData";
import { useTableData } from "../../hooks/useTableData";
import { Table, Td, Tr } from "../../ui/Table";
import { SortableTh, FilterRow, PaginationBar } from "../../ui/TableControls";

interface Technique {
  id: number;
  manufacturer: string;
  model: string;
  series: string | null;
  active: boolean;
}

const COLUMNS: ColumnDef<Technique>[] = [
  { key: "id", sortable: true },
  { key: "manufacturer", sortable: true, filterable: true },
  { key: "model", sortable: true, filterable: true },
  { key: "series", sortable: true, filterable: true },
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

export default function AdminTechniques() {
  const [items, setItems] = useState<Technique[]>([]);
  const [mfr, setMfr] = useState("");
  const [model, setModel] = useState("");
  const [series, setSeries] = useState("");

  const {
    view, sort, toggleSort, filters, setFilter,
    page, setPage, pageSize, setPageSize,
    totalPages, totalFiltered, totalRows,
  } = useTableData(items, COLUMNS);

  const load = () => apiGet<Technique[]>("/techniques").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    await apiPost("/techniques", { manufacturer: mfr, model, series: series || null });
    setMfr(""); setModel(""); setSeries("");
    load();
  }

  async function toggleActive(t: Technique) {
    await apiPatch(`/techniques/${t.id}`, { active: !t.active });
    load();
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="Производитель" value={mfr} onChange={e => setMfr(e.target.value)} required />
        <input placeholder="Модель" value={model} onChange={e => setModel(e.target.value)} required />
        <input placeholder="Серия" value={series} onChange={e => setSeries(e.target.value)} />
        <button type="submit">Добавить</button>
      </form>
      <Table>
        <thead>
          <tr>
            <SortableTh columnKey="id" sort={sort} onSort={toggleSort}>ID</SortableTh>
            <SortableTh columnKey="manufacturer" sort={sort} onSort={toggleSort}>Производитель</SortableTh>
            <SortableTh columnKey="model" sort={sort} onSort={toggleSort}>Модель</SortableTh>
            <SortableTh columnKey="series" sort={sort} onSort={toggleSort}>Серия</SortableTh>
            <SortableTh columnKey="active" sort={sort} onSort={toggleSort}>Активен</SortableTh>
            <th className="border-b border-[var(--color-border)] bg-gray-50 px-4 py-3" />
          </tr>
          <FilterRow columns={COLUMNS} filters={filters} onFilter={setFilter}>
            <th className="border-b border-[var(--color-border)] bg-gray-50/60 px-4 py-1.5" />
          </FilterRow>
        </thead>
        <tbody>
          {view.map(t => (
            <Tr key={t.id} className={t.active ? "" : "opacity-50"}>
              <Td>{t.id}</Td>
              <Td>{t.manufacturer}</Td>
              <Td>{t.model}</Td>
              <Td>{t.series ?? "—"}</Td>
              <Td>{t.active ? "Да" : "Нет"}</Td>
              <Td>
                <button className="text-xs text-[var(--color-accent)] hover:underline" onClick={() => toggleActive(t)}>
                  {t.active ? "Откл" : "Вкл"}
                </button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <PaginationBar
        page={page} totalPages={totalPages} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize}
        totalFiltered={totalFiltered} totalRows={totalRows}
      />
    </div>
  );
}
