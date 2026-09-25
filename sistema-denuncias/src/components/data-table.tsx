import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({ columns, rows, getRowKey, empty }: { columns: TableColumn<T>[]; rows: T[]; getRowKey: (row: T) => string; empty?: ReactNode }) {
  if (!rows.length && empty) return <>{empty}</>;
  return <div className="table-wrap"><table><thead><tr>{columns.map(column => <th key={column.key} className={column.className}>{column.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={getRowKey(row)}>{columns.map(column => <td key={column.key} className={column.className}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}
