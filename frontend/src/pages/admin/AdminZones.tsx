import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../api/client";
import type { ColumnDef } from "../../hooks/useTableData";
import { useTableData } from "../../hooks/useTableData";
import { Table, Td, Tr } from "../../ui/Table";
import { SortableTh, FilterRow, PaginationBar } from "../../ui/TableControls";

interface Zone {
  id: number;
  code: string;
  title_ru: string;
  active: boolean;
}

const COLUMNS: ColumnDef<Zone>[] = [
  { key: "id", sortable: true },
  { key: "code", sortable: true, filterable: true },
  { key: "title_ru", sortable: true, filterable: true },
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

export default function AdminZones() {
  const [items, setItems] = useState<Zone[]>([]);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");

  const {
    view, sort, toggleSort, filters, setFilter,
    page, setPage, pageSize, setPageSize,
    totalPages, totalFiltered, totalRows,
  } = useTableData(items, COLUMNS);

  const load = () => apiGet<Zone[]>("/zones").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    await apiPost("/zones", { code, title_ru: title });
    setCode(""); setTitle("");
    load();
  }

  async function toggleActive(z: Zone) {
    await apiPatch(`/zones/${z.id}`, { active: !z.active });
    load();
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="Код (engine, tank…)" value={code} onChange={e => setCode(e.target.value)} required />
        <input placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} required />
        <button type="submit">Добавить</button>
      </form>
      <Table>
        <thead>
          <tr>
            <SortableTh columnKey="id" sort={sort} onSort={toggleSort}>ID</SortableTh>
            <SortableTh columnKey="code" sort={sort} onSort={toggleSort}>Код</SortableTh>
            <SortableTh columnKey="title_ru" sort={sort} onSort={toggleSort}>Название</SortableTh>
            <SortableTh columnKey="active" sort={sort} onSort={toggleSort}>Активен</SortableTh>
            <th className="border-b border-[var(--color-border)] bg-gray-50 px-4 py-3" />
          </tr>
          <FilterRow columns={COLUMNS} filters={filters} onFilter={setFilter}>
            <th className="border-b border-[var(--color-border)] bg-gray-50/60 px-4 py-1.5" />
          </FilterRow>
        </thead>
        <tbody>
          {view.map(z => (
            <Tr key={z.id} className={z.active ? "" : "opacity-50"}>
              <Td>{z.id}</Td>
              <Td>{z.code}</Td>
              <Td>{z.title_ru}</Td>
              <Td>{z.active ? "Да" : "Нет"}</Td>
              <Td>
                <button className="text-xs text-[var(--color-accent)] hover:underline" onClick={() => toggleActive(z)}>
                  {z.active ? "Откл" : "Вкл"}
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
