import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NAUKA INVENTRA - Sistem Operasional Bisnis untuk UMKM",
  description: "Sistem operasional bisnis yang dirancang khusus untuk UMKM dan bisnis berkembang. Kelola stok, pembelian, penjualan, customer, supplier, dan laporan bisnis dalam satu sistem.",
  keywords: ["Inventra", "UMKM", "inventory", "stok", "penjualan", "pembelian", "bisnis"],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23059669'/><text x='50' y='68' font-size='50' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'>I</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
