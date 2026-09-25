import { BrandFilter, FilterBar, StatusFilter } from "@/components/filters";
import { Card, DemoNotice, EmptyState, PageHeader } from "@/components/ui";

const indicators = ["Pendentes", "Enviadas", "Aguardando retorno", "Resolvidas", "Rejeitadas"];

export default function FollowUpPage() {
  return <><PageHeader eyebrow="Pós-envio" title="Acompanhamento" description="Organize o acompanhamento manual das denúncias e seus retornos."/><DemoNotice/><div className="metric-grid compact-metrics">{indicators.map(label => <Card key={label} className="metric-card"><span>{label}</span><strong>—</strong><small>Sem dados conectados</small></Card>)}</div><FilterBar searchPlaceholder="Buscar denúncia ou anúncio"><BrandFilter/><StatusFilter options={indicators}/></FilterBar><Card><EmptyState title="Nenhum acompanhamento iniciado" description="As denúncias enviadas e seus retornos aparecerão nesta fila operacional."/></Card></>;
}
