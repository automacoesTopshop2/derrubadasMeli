import Link from "next/link";
import { DataTable, type TableColumn } from "@/components/data-table";
import { BrandFilter, FilterBar, StatusFilter } from "@/components/filters";
import { DemoNotice, EmptyState, PageHeader, Pagination, Select, StatusBadge } from "@/components/ui";
import { demoListings } from "@/lib/mock-data";
import type { ListingRecord } from "@/types/domain";

const columns: TableColumn<ListingRecord>[] = [
  { key: "title", label: "Anúncio", render: row => <div className="primary-cell wide-cell"><Link href={`/anuncios/${row.id}`}>{row.title}</Link><small>{row.listingId}</small></div> },
  { key: "brand", label: "Marca", render: row => row.brand ?? "—" },
  { key: "seller", label: "Seller", render: row => <div className="primary-cell"><span>{row.seller}</span><small>{row.sellerId}</small></div> },
  { key: "price", label: "Preço", render: row => row.price },
  { key: "stock", label: "Estoque", render: row => row.stock },
  { key: "exposure", label: "Exposição", render: row => row.exposure },
  { key: "store", label: "Loja oficial", render: row => row.officialStore ?? "—" },
  { key: "condition", label: "Condição", render: row => row.condition },
  { key: "days", label: "Dias", render: row => row.daysListed },
  { key: "decision", label: "Decisão", render: row => <StatusBadge status={row.decision}/> },
  { key: "status", label: "Status", render: row => <StatusBadge status={row.status}/> },
];

export default function ListingsPage() {
  return <><PageHeader eyebrow="Catálogo operacional" title="Anúncios" description="Consulte anúncios importados e acompanhe seu estado de análise."/><DemoNotice/><FilterBar searchPlaceholder="Buscar título, listing ID, seller ou seller ID"><BrandFilter/><Select label="Decisão" defaultValue="all"><option value="all">Todas</option><option>Denunciar</option><option>Verificar</option><option>Não denunciar</option><option>Não definida</option></Select><StatusFilter options={["Não analisado", "Para verificar", "Analisado"]}/></FilterBar><div className="table-card"><DataTable columns={columns} rows={demoListings} getRowKey={row => row.id} empty={<EmptyState title="Nenhum anúncio" description="Importe um arquivo para começar a visualizar anúncios."/>}/><Pagination/></div></>;
}
