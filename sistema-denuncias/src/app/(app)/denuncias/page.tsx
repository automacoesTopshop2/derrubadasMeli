import Link from "next/link";
import { DataTable, type TableColumn } from "@/components/data-table";
import { BrandFilter, FilterBar, StatusFilter } from "@/components/filters";
import { DemoNotice, EmptyState, PageHeader, Pagination, StatusBadge } from "@/components/ui";
import { demoComplaints } from "@/lib/mock-data";
import type { ComplaintRecord } from "@/types/domain";

const columns: TableColumn<ComplaintRecord>[] = [
  { key: "listing", label: "Anúncio", render: row => <div className="primary-cell"><Link href={`/denuncias/${row.id}`}>{row.listing}</Link><small>{row.listingId}</small></div> },
  { key: "brand", label: "Marca", render: row => row.brand },
  { key: "seller", label: "Seller", render: row => row.seller },
  { key: "reason", label: "Motivo", render: row => row.reason },
  { key: "status", label: "Status", render: row => <StatusBadge status={row.status}/> },
  { key: "date", label: "Data", render: row => row.createdAt },
  { key: "owner", label: "Responsável", render: row => row.owner },
  { key: "updated", label: "Atualização", render: row => row.updatedAt },
];

export default function ComplaintsPage() {
  return <><PageHeader eyebrow="Operação" title="Denúncias" description="Acompanhe o ciclo de denúncias quando as regras e o fluxo operacional forem habilitados."/><DemoNotice/><FilterBar searchPlaceholder="Buscar anúncio, seller ou motivo"><BrandFilter/><StatusFilter options={["Pendente", "Em análise", "Enviada", "Confirmada", "Rejeitada", "Encerrada"]}/></FilterBar><div className="table-card"><DataTable columns={columns} rows={demoComplaints} getRowKey={row => row.id} empty={<EmptyState title="Nenhuma denúncia registrada" description="Denúncias só serão criadas depois que regras e classificações forem formalmente definidas."/>}/><Pagination/></div></>;
}
