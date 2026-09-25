import { BrandFilter, FilterBar, StatusFilter } from "@/components/filters";
import { Button, DemoNotice, EmptyState, PageHeader } from "@/components/ui";

export default function RulesPage() {
  return <><PageHeader eyebrow="Classificação" title="Regras" description="Estruture critérios por marca sem misturar regras de negócio aos componentes visuais." actions={<Button disabled>Nova regra</Button>}/><DemoNotice/><FilterBar searchPlaceholder="Buscar nome ou descrição" withDate={false}><BrandFilter/><StatusFilter options={["Ativa", "Inativa"]}/></FilterBar><div className="table-card"><div className="table-wrap"><table><thead><tr><th>Regra</th><th>Marca</th><th>Descrição</th><th>Prioridade</th><th>Status</th><th>Última atualização</th><th></th></tr></thead></table></div><EmptyState title="Regras ainda não configuradas" description="Nenhum critério de denúncia foi definido. As regras serão cadastradas após validação do negócio."/></div></>;
}
