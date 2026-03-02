import { type FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api/client";
import type { ColumnDef } from "../../hooks/useTableData";
import { useTableData } from "../../hooks/useTableData";
import { Table, Td, Tr } from "../../ui/Table";
import { SortableTh, FilterRow, PaginationBar } from "../../ui/TableControls";

interface AliasItem {
  id: number;
  alias_text: string;
  technique_id: number;
  note: string | null;
}

const COLUMNS: ColumnDef<AliasItem>[] = [
  { key: "id", sortable: true },
  { key: "alias_text", sortable: true, filterable: true },
  { key: "technique_id", sortable: true, filterable: true },
  { key: "note", sortable: true, filterable: true },
];

export default function AdminAliases() {
  const [items, setItems] = useState<AliasItem[]>([]);
  const [aliasText, setAliasText] = useState("");
  const [techId, setTechId] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const {
    view, sort, toggleSort, filters, setFilter,
    page, setPage, pageSize, setPageSize,
    totalPages, totalFiltered, totalRows,
  } = useTableData(items, COLUMNS);

  const load = () => apiGet<AliasItem[]>("/technique-aliases").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await apiPost("/technique-aliases", {
        alias_text: aliasText,
        technique_id: Number(techId),
        note: note || null,
      });
      setMsg(`Псевдоним «${aliasText}» создан`);
      setAliasText(""); setTechId(""); setNote("");
      load();
    } catch (err: unknown) {
      setMsg(String(err));
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <input placeholder="Текст псевдонима" value={aliasText} onChange={e => setAliasText(e.target.value)} required />
        <input placeholder="ID техники" type="number" value={techId} onChange={e => setTechId(e.target.value)} required />
        <input placeholder="Заметка" value={note} onChange={e => setNote(e.target.value)} />
        <button type="submit">Создать псевдоним</button>
      </form>
      {msg && <p style={{ fontSize: 13, marginBottom: 8 }}>{msg}</p>}

      {items.length > 0 && (
        <>
          <Table>
            <thead>
              <tr>
                <SortableTh columnKey="id" sort={sort} onSort={toggleSort}>ID</SortableTh>
                <SortableTh columnKey="alias_text" sort={sort} onSort={toggleSort}>Псевдоним</SortableTh>
                <SortableTh columnKey="technique_id" sort={sort} onSort={toggleSort}>ID техники</SortableTh>
                <SortableTh columnKey="note" sort={sort} onSort={toggleSort}>Заметка</SortableTh>
              </tr>
              <FilterRow columns={COLUMNS} filters={filters} onFilter={setFilter} />
            </thead>
            <tbody>
              {view.map(a => (
                <Tr key={a.id}>
                  <Td>{a.id}</Td>
                  <Td>{a.alias_text}</Td>
                  <Td>{a.technique_id}</Td>
                  <Td>{a.note ?? "—"}</Td>
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
    </div>
  );
}
