import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sarabun",
  fallback: ["Leelawadee UI", "Tahoma", "sans-serif"],
});

export const metadata: Metadata = {
  title: "ระบบบริหารแผน",
  description: "ระบบบริหารแผน งบประมาณ โครงการ และตัวชี้วัดคุณภาพ",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={sarabun.variable} lang="th">
      <body>{children}</body>
    </html>
  );
}
