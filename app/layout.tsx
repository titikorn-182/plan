import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-thai";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบบริหารแผน",
  description: "ระบบบริหารแผน งบประมาณ โครงการ และตัวชี้วัดคุณภาพ",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
