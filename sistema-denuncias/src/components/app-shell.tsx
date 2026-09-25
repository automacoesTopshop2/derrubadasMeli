"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon } from "./icons";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/importacoes", label: "Importações", icon: "import" },
  { href: "/anuncios", label: "Anúncios", icon: "listings" },
  { href: "/sellers", label: "Sellers", icon: "sellers" },
  { href: "/regras", label: "Regras", icon: "rules" },
  { href: "/denuncias", label: "Denúncias", icon: "complaints" },
  { href: "/acompanhamento", label: "Acompanhamento", icon: "follow" },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return <><aside className={`sidebar ${open ? "is-open" : ""}`}><div className="brand-lockup"><span className="brand-mark">N</span><div><strong>Monitor de marcas</strong><small>Operação interna</small></div><button className="mobile-close" onClick={onClose} aria-label="Fechar menu"><Icon name="close" width="20"/></button></div><nav aria-label="Navegação principal">{navigation.map(item => { const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={onClose}><Icon name={item.icon} width="20"/><span>{item.label}</span></Link>; })}</nav><div className="sidebar-footer"><Link href="/configuracoes" className={pathname.startsWith("/configuracoes") ? "active" : ""}><Icon name="settings" width="20"/><span>Configurações</span></Link><div className="environment"><span className="status-dot"/>Ambiente local</div></div></aside>{open && <button className="sidebar-scrim" onClick={onClose} aria-label="Fechar menu"/>}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="app-shell"><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)}/><div className="app-column"><header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Icon name="menu" width="22"/></button><div className="topbar-context"><span>Operação</span><strong>Análise de anúncios</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Notificações"><Icon name="bell" width="20"/></button><div className="user-chip"><span>OP</span><div><strong>Operador</strong><small>Sessão demonstrativa</small></div></div></div></header><main className="content">{children}</main></div></div>;
}
