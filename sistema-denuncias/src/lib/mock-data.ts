import type {
  ComplaintRecord,
  ImportRecord,
  ListingRecord,
} from "@/types/domain";

export const DEMO_MODE = true;

export const demoImports: ImportRecord[] = [
  {
    id: "demo-import-001",
    fileName: "arquivo-demonstrativo.xlsx",
    brand: "NOW Foods",
    source: "Demonstração",
    recordCount: null,
    validCount: null,
    issueCount: null,
    importedAt: "Aguardando dados reais",
    status: "Pendente",
    user: "—",
  },
];

export const demoListings: ListingRecord[] = [
  {
    id: "demo-listing-001",
    title: "Anúncio demonstrativo — dados ainda não importados",
    listingId: "MLB-DEMO",
    brand: "NOW Foods",
    seller: "Seller demonstrativo",
    sellerId: "ID-DEMO",
    price: "—",
    currency: "BRL",
    stock: "—",
    exposure: "—",
    officialStore: null,
    condition: "—",
    daysListed: "—",
    link: null,
    decision: "Não definida",
    status: "Não analisado",
    importId: "demo-import-001",
  },
];

export const demoComplaints: ComplaintRecord[] = [];

export const dashboardMetrics = [
  { label: "Anúncios analisados", value: "—", hint: "Aguardando importações" },
  { label: "Para verificar", value: "—", hint: "Regras ainda não configuradas" },
  { label: "Para denúncia", value: "—", hint: "Classificação indisponível" },
  { label: "Não denunciáveis", value: "—", hint: "Classificação indisponível" },
  { label: "Denúncias pendentes", value: "—", hint: "Sem dados" },
  { label: "Denúncias enviadas", value: "—", hint: "Sem dados" },
];
