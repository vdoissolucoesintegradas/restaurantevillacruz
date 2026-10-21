import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Villa Cruz · Gestão",
  description: "Gestão financeira e operacional do Restaurante Villa Cruz",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
