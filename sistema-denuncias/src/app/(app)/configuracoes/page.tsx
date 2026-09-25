import { Badge, Button, Card, DemoNotice, PageHeader } from "@/components/ui";

const sections = [
  { title: "Preferências gerais", description: "Idioma, fuso horário e preferências de exibição.", status: "Pendente" },
  { title: "Marcas", description: "Configuração futura de NOW Foods, Swanson e seus aliases.", status: "Pendente" },
  { title: "Integrações", description: "Conexões externas e credenciais controladas pelo servidor.", status: "Não configurado" },
  { title: "Usuários e permissões", description: "Administração futura de admins, operadores e revisores.", status: "Não configurado" },
  { title: "Sistema", description: "Informações de ambiente, versão e diagnóstico técnico.", status: "Local" },
];

export default function SettingsPage() {
  return <><PageHeader eyebrow="Administração" title="Configurações" description="Centralize preferências, acessos e integrações do sistema."/><DemoNotice/><div className="settings-grid">{sections.map(section => <Card key={section.title} className="settings-card"><div><h2>{section.title}</h2><p>{section.description}</p></div><Badge>{section.status}</Badge><Button variant="secondary" disabled>Configurar</Button></Card>)}</div><Card className="integration-card"><div className="section-heading"><div><span className="eyebrow">EXTENSÃO</span><h2>Extensão Nubimetrics</h2></div><Badge tone="warning">Não conectada</Badge></div><p>A extensão continuará operando separadamente até que autenticação e API de importação sejam implementadas.</p><div className="integration-details"><div><span>Última sincronização</span><strong>—</strong></div><div><span>Última importação</span><strong>—</strong></div><div><span>Versão conectada</span><strong>—</strong></div><div><span>Ambiente</span><strong>Não configurado</strong></div></div><Button variant="secondary" disabled>Conectar extensão</Button></Card></>;
}
