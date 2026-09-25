import { DetailList } from "@/components/detail-list";
import { Badge, Card, DemoNotice, EmptyState, PageHeader } from "@/components/ui";
import { demoImports, demoListings } from "@/lib/mock-data";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = demoListings.find(item => item.id === id) ?? demoListings[0];
  const source = demoImports.find(item => item.id === listing.importId);
  return <><PageHeader eyebrow="Anúncios / Detalhes" title={listing.title} description={`Listing ID: ${listing.listingId}`}/><DemoNotice/><div className="detail-grid"><Card><h2>Informações do anúncio</h2><DetailList items={[{label:"Título",value:listing.title},{label:"Listing ID",value:listing.listingId},{label:"Link",value:listing.link ? <a href={listing.link} target="_blank" rel="noreferrer">Abrir no Mercado Livre</a> : "Não disponível"},{label:"Preço",value:`${listing.currency} ${listing.price}`},{label:"Estoque",value:listing.stock},{label:"Condição",value:listing.condition},{label:"Exposição",value:listing.exposure},{label:"Dias anunciados",value:listing.daysListed}]}/></Card><Card><h2>Seller</h2><DetailList items={[{label:"Nickname",value:listing.seller},{label:"Seller ID",value:listing.sellerId},{label:"Loja oficial",value:listing.officialStore ?? "Não informada"}]}/><hr/><h2>Origem</h2><DetailList items={[{label:"Importação",value:source?.id ?? "—"},{label:"Arquivo",value:source?.fileName ?? "—"},{label:"Marca",value:listing.brand ?? "Não informada"},{label:"Data",value:source?.importedAt ?? "—"}]}/></Card></div><Card><div className="section-heading"><div><span className="eyebrow">CLASSIFICAÇÃO</span><h2>Análise</h2></div><Badge tone="neutral">Não analisado</Badge></div><EmptyState title="Ainda não analisado" description="Decisão, motivos, regra aplicada e histórico aparecerão aqui quando o mecanismo de classificação for definido."/></Card></>;
}
