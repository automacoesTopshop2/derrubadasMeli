import { DetailList } from "@/components/detail-list";
import { Button, Card, DemoNotice, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><PageHeader eyebrow="Denúncias / Detalhes" title="Detalhe da denúncia" description={`Referência: ${id}`} actions={<><Button variant="secondary" disabled>Alterar status</Button><Button disabled>Executar ação</Button></>}/><DemoNotice/><div className="detail-grid"><Card><h2>Anúncio e seller</h2><DetailList items={[{label:"Anúncio",value:"Dados ainda não disponíveis"},{label:"Listing ID",value:"—"},{label:"Seller",value:"—"},{label:"Seller ID",value:"—"}]}/></Card><Card><h2>Controle</h2><DetailList items={[{label:"Status",value:<StatusBadge status="Pendente"/>},{label:"Responsável",value:"—"},{label:"Criada em",value:"—"},{label:"Atualizada em",value:"—"}]}/></Card></div><div className="detail-grid"><Card><h2>Motivo e regra aplicada</h2><EmptyState title="Sem classificação" description="O motivo e a regra serão apresentados após a definição do motor de classificação."/></Card><Card><h2>Histórico</h2><EmptyState title="Sem eventos" description="Mudanças de status e ações manuais aparecerão aqui."/></Card></div></>;
}
