import { BrandFilter, FilterBar, StatusFilter } from "@/components/filters";
import { DemoNotice, EmptyState, PageHeader, Button } from "@/components/ui";

export default function SellersPage() {
  return <><PageHeader eyebrow="Governança" title="Sellers" description="Gerencie futuramente a identidade e a classificação operacional dos vendedores." actions={<Button disabled>Novo seller</Button>}/><DemoNotice/><FilterBar searchPlaceholder="Buscar seller ID ou nickname"><BrandFilter/><StatusFilter options={["Próprio", "Autorizado", "Desconhecido", "Suspeito", "Bloqueado"]}/></FilterBar><div className="table-card"><div className="table-wrap"><table><thead><tr><th>Seller ID</th><th>Nickname</th><th>Tipo</th><th>Marca</th><th>Status</th><th>Observações</th><th>Atualização</th></tr></thead></table></div><EmptyState title="Nenhum seller cadastrado" description="Não há listas de sellers próprios, autorizados ou suspeitos definidas. O cadastro será habilitado após a aprovação das regras."/></div></>;
}
