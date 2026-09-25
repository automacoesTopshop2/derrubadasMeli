import type { ReactNode } from "react";
import { Button, DateFilter, SearchInput, Select } from "./ui";

export function FilterBar({ searchPlaceholder, children, withDate = true }: { searchPlaceholder: string; children?: ReactNode; withDate?: boolean }) {
  return <div className="filter-bar"><div className="filter-search"><SearchInput placeholder={searchPlaceholder}/></div>{children}{withDate && <DateFilter/>}<Button variant="secondary">Filtrar</Button></div>;
}

export function BrandFilter() {
  return <Select label="Marca" defaultValue="all"><option value="all">Todas</option><option>NOW Foods</option><option>Swanson</option></Select>;
}

export function StatusFilter({ options }: { options: string[] }) {
  return <Select label="Status" defaultValue="all"><option value="all">Todos</option>{options.map(option => <option key={option}>{option}</option>)}</Select>;
}
