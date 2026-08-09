import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ForgeFit",
    template: "%s · ForgeFit",
  },
  description: "Suivi de musculation : séances, charges, progression et records.",
  applicationName: "ForgeFit",
};

export const viewport: Viewport = {
  themeColor: "#0a0b0e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Le zoom reste autorisé : le bloquer nuirait à l'accessibilité, et la
  // saisie en séance est déjà dimensionnée pour ne pas le nécessiter.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
