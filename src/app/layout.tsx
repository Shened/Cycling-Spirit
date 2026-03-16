import type { Metadata } from "next";
import "./globals.css";
import NavigationLoader from "@/components/layout/NavigationLoader";

export const metadata: Metadata = {
  title: "Cycling Spirit — Track. Train. Dominate.",
  description: "A plataforma de ciclismo e treino para atletas sérios.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body>
        <NavigationLoader />
        {children}
      </body>
    </html>
  );
}