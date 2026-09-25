import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monitor de Marcas",
  description: "Gerenciamento interno de anúncios e denúncias.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
