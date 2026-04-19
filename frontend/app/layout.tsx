import type { ReactNode } from "react";
import type { Metadata } from "next";
import "@/src/styles/index.css";

export const metadata: Metadata = {
  title: "SAIP",
  description: "Smart AI Civic Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
