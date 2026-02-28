import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NYC Real Estate Agent",
    template: "%s | NYC Real Estate",
  },
  description:
    "Expert guidance for buying, selling, and renting in New York City",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
