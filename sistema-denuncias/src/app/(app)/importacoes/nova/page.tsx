import { BrandFilter } from "@/components/filters";
import { Button, Card, PageHeader } from "@/components/ui";

export default function NewImportPage() {
  return <><PageHeader eyebrow="Importações / Nova" title="Nova importação" description="A integração real será adicionada em uma etapa posterior."/><Card className="form-card"><div className="form-section"><h2>Arquivo de origem</h2><p>Selecione a marca e prepare o envio manual de um CSV, XLS ou XLSX.</p></div><BrandFilter/><label className="file-drop"><input type="file" accept=".csv,.xls,.xlsx" disabled/><strong>Upload ainda não disponível</strong><span>A interface está preparada; nenhum arquivo será enviado nesta etapa.</span></label><div className="form-actions"><Button variant="secondary" disabled>Validar arquivo</Button><Button disabled>Criar importação</Button></div></Card></>;
}
