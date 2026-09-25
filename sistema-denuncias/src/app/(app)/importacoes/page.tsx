import Link from "next/link";
import { DataTable, type TableColumn } from "@/components/data-table";
import { BrandFilter, FilterBar, StatusFilter } from "@/components/filters";
import { DemoNotice, EmptyState, LinkButton, PageHeader, Pagination, StatusBadge } from "@/components/ui";
import { demoImports } from "@/lib/mock-data";
import type { ImportRecord } from "@/types/domain";

const columns: TableColumn<ImportRecord>[] = [
  { key: "file", label: "Arquivo", render: row => <div className="primary-cell"><Link href={`/importacoes/${row.id}`}>{row.fileName}</Link><small>{row.source}</small></div> },
  { key: "brand", label: "Marca", render: row => row.brand },
  { key: "records", label: "Registros", render: row => row.recordCount ?? "—" },
  { key: "date", label: "Data", render: row => row.importedAt },
  { key: "status", label: "Status", render: row => <StatusBadge status={row.status}/> },
  { key: "user", label: "Usuário", render: row => row.user },
  { key: "action", label: "", className: "action-cell", render: row => <Link className="row-action" href={`/importacoes/${row.id}`}>Detalhes</Link> },
];

export default function ImportsPage() {
  return <><PageHeader eyebrow="Entrada de dados" title="Importações" description="Controle os arquivos recebidos, sua origem e o resultado de cada processamento." actions={<LinkButton href="/importacoes/nova">Nova importação</LinkButton>}/><DemoNotice/><FilterBar searchPlaceholder="Buscar arquivo ou usuário"><BrandFilter/><StatusFilter options={["Pendente", "Concluída", "Com problemas"]}/></FilterBar><div className="table-card"><DataTable columns={columns} rows={demoImports} getRowKey={row => row.id} empty={<EmptyState title="Nenhuma importação" description="Quando um arquivo for importado, ele aparecerá aqui."/>}/><Pagination/></div></>;
}
