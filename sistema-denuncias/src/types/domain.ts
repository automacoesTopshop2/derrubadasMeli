export type Brand = "NOW Foods" | "Swanson";

export type ImportStatus = "Concluída" | "Pendente" | "Com problemas";
export type AnalysisStatus = "Não analisado" | "Para verificar" | "Analisado";
export type Decision = "Denunciar" | "Verificar" | "Não denunciar" | "Não definida";
export type ComplaintStatus =
  | "Pendente"
  | "Em análise"
  | "Enviada"
  | "Confirmada"
  | "Rejeitada"
  | "Encerrada";

export interface ImportRecord {
  id: string;
  fileName: string;
  brand: Brand;
  source: string;
  recordCount: number | null;
  validCount: number | null;
  issueCount: number | null;
  importedAt: string;
  status: ImportStatus;
  user: string;
}

export interface ListingRecord {
  id: string;
  title: string;
  listingId: string;
  brand: Brand | null;
  seller: string;
  sellerId: string;
  price: string;
  currency: string;
  stock: string;
  exposure: string;
  officialStore: string | null;
  condition: string;
  daysListed: string;
  link: string | null;
  decision: Decision;
  status: AnalysisStatus;
  importId: string;
}

export interface ComplaintRecord {
  id: string;
  listing: string;
  listingId: string;
  brand: Brand;
  seller: string;
  reason: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  owner: string;
}
