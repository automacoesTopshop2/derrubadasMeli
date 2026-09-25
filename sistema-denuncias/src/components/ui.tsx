import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Icon } from "./icons";

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "quiet" }) {
  return <Link href={href} className={`button button-${variant}`}>{children}</Link>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "success" | "warning" | "danger" | "purple" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("confirm") || normalized.includes("conclu") || normalized.includes("resolvid")
    ? "success" : normalized.includes("rejeit") || normalized.includes("problema") || normalized.includes("bloque")
      ? "danger" : normalized.includes("pendent") || normalized.includes("verificar")
        ? "warning" : normalized.includes("enviad") || normalized.includes("análise")
          ? "info" : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div>;
}

export function SearchInput({ placeholder = "Buscar..." }: { placeholder?: string }) {
  return <label className="search-input"><Icon name="search" width="18"/><input type="search" placeholder={placeholder} aria-label={placeholder}/></label>;
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span><select {...props}>{children}</select></label>;
}

export function DateFilter() {
  return <label className="field"><span>Período</span><select defaultValue="all"><option value="all">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="custom">Personalizado</option></select></label>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="state-panel empty-state"><span className="state-icon">○</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function LoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return <div className="state-panel" role="status"><span className="spinner"/><p>{label}</p></div>;
}

export function ErrorState({ message = "Não foi possível carregar os dados." }: { message?: string }) {
  return <div className="state-panel state-error" role="alert"><strong>Ocorreu um erro</strong><p>{message}</p><Button variant="secondary">Tentar novamente</Button></div>;
}

export function SuccessState({ message }: { message: string }) {
  return <div className="inline-feedback success-feedback" role="status">✓ {message}</div>;
}

export function Pagination({ label = "Página 1 de 1" }: { label?: string }) {
  return <div className="pagination"><span>{label}</span><div><Button variant="quiet" disabled>Anterior</Button><Button variant="quiet" disabled>Próxima</Button></div></div>;
}

export function Modal({ open, title, children }: { open: boolean; title: string; children: ReactNode }) {
  if (!open) return null;
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-label={title}><h2>{title}</h2>{children}</div></div>;
}

export function DemoNotice() {
  return <div className="demo-notice"><Badge tone="purple">Modo demonstração</Badge><span>Estrutura visual com dados ilustrativos isolados; nenhuma operação é persistida.</span></div>;
}
