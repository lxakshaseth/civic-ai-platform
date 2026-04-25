import type { ReactNode } from "react";
import type { Metadata } from "next";

// ✅ Correct global CSS import
import "../src/styles/index.css";

export const metadata: Metadata = {
  title: "SAIP",
  description: "Smart AI Civic Intelligence Platform",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}