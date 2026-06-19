import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Facebook Poster",
  description: "AI-powered Facebook Page post generator and scheduler",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
