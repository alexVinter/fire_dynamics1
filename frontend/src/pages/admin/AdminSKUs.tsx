import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../api/client";
import type { ColumnDef } from "../../hooks/useTableData";
import { useTableData } from "../../hooks/useTableData";
import { Table, Td, Tr } from "../../ui/Table";
import { SortableTh, FilterRow, PaginationBar } from "../../ui/TableControls";

interface SKU {
  id: number;
  code: string;
  name: string;
  unit: string;
  active: boolean;
  version_tag: string | null;
}

const COLUMNS: ColumnDef<SKU>[] = [
  { key: "id", sortable: true },
  { key: "code", sortable: true, filterable: true },
  { key: "name", sortable: true, filterable: true },
  { key: "unit", sortable: true },
  {
    key: "active",
    sortable: true,
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "true", label: "Да" },
      { value: "false", label: "Нет" },
    ],
  },
];

export default function AdminSKUs() {
  const [items, setItems] = useState<SKU[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("шт");

  const {
    view, sort, toggleSort, filters, setFilter,
    page, setPage, pageSize, setPageSize,
    totalPages, totalFiltered, totalRows,
  } = useTableData(items, COLUMNS);

  const load = () => apiGet<SKU[]>("/skus").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    await apiPost("/skus", { code, name, unit });
    setCode(""); setName(""); setUnit("шт");
    load();
  }

  async function toggleActive(s: SKU) {
    await apiPatch(`/skus/${s.id}`, { active: !s.active });
    load();
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="Код" value={code} onChange={e => setCode(e.target.value)} required />
        <input placeholder="Название" value={name} onChange={e => setName(e.target.value)} required />
        <input placeholder="Ед.изм." value={unit} onChange={e => setUnit(e.target.value)} required style={{ width: 60 }} />
        <button type="submit">Добавить</button>
      </form>
      <Table>
        <thead>
          <tr>
            <SortableTh columnKey="id" sort={sort} onSort={toggleSort}>ID</SortableTh>
            <SortableTh columnKey="code" sort={sort} onSort={toggleSort}>Код</SortableTh>
            <SortableTh columnKey="name" sort={sort} onSort={toggleSort}>Название</SortableTh>
            <SortableTh columnKey="unit" sort={sort} onSort={toggleSort}>Ед.</SortableTh>
            <SortableTh columnKey="active" sort={sort} onSort={toggleSort}>Активен</SortableTh>
            <th className="border-b border-[var(--color-border)] bg-gray-50 px-4 py-3" />
          </tr>
          <FilterRow columns={COLUMNS} filters={filters} onFilter={setFilter}>
            <th className="border-b border-[var(--color-border)] bg-gray-50/60 px-4 py-1.5" />
          </FilterRow>
        </thead>
        <tbody>
          {view.map(s => (
            <Tr key={s.id} className={s.active ? "" : "opacity-50"}>
              <Td>{s.id}</Td>
              <Td>{s.code}</Td>
              <Td>{s.name}</Td>
              <Td>{s.unit}</Td>
              <Td>{s.active ? "Да" : "Нет"}</Td>
              <Td>
                <button className="text-xs text-[var(--color-accent)] hover:underline" onClick={() => toggleActive(s)}>
                  {s.active ? "Откл" : "Вкл"}
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
