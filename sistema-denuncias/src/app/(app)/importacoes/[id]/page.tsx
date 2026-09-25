import Link from "next/link";
import { DataTable, type TableColumn } from "@/components/data-table";
import { DetailList } from "@/components/detail-list";
import { Card, DemoNotice, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { demoImports, demoListings } from "@/lib/mock-data";
import type { ListingRecord } from "@/types/domain";

const columns: TableColumn<ListingRecord>[] = [
  { key: "title", label: "Título", render: row => <div className="primary-cell"><Link href={`/anuncios/${row.id}`}>{row.title}</Link><small>{row.listingId}</small></div> },
  { key: "seller", label: "Seller", render: row => <div className="primary-cell"><span>{row.seller}</span><small>{row.sellerId}</small></div> },
  { key: "brand", label: "Marca", render: row => row.brand ?? "—" },
  { key: "price", label: "Preço", render: row => row.price },
  { key: "stock", label: "Estoque", render: row => row.stock },
  { key: "link", label: "Link", render: row => row.link ? <a href={row.link} target="_blank" rel="noreferrer">Abrir anúncio</a> : "—" },
  { key: "status", label: "Análise", render: row => <StatusBadge status={row.status}/> },
];

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = demoImports.find(entry => entry.id === id) ?? demoImports[0];
  return <><PageHeader eyebrow="Importações / Detalhes" title={item.fileName} description="Resumo técnico da importação e dos anúncios associados."/><DemoNotice/><div className="detail-grid"><Card><h2>Importação</h2><DetailList items={[{label:"Marca",value:item.brand},{label:"Origem",value:item.source},{label:"Data",value:item.importedAt},{label:"Usuário",value:item.user}]}/></Card><Card><h2>Processamento</h2><DetailList items={[{label:"Registros",value:item.recordCount ?? "—"},{label:"Válidos",value:item.validCount ?? "—"},{label:"Com problemas",value:item.issueCount ?? "—"},{label:"Status",value:<StatusBadge status={item.status}/>} ]}/></Card></div><Card><div className="section-heading"><div><span className="eyebrow">CONTEÚDO</span><h2>Anúncios importados</h2></div></div><DataTable columns={columns} rows={demoListings.filter(row => row.importId === item.id)} getRowKey={row => row.id} empty={<EmptyState title="Sem anúncios importados" description="Os registros processados aparecerão aqui."/>}/></Card></>;
}
