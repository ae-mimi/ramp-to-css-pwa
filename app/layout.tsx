import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ramp to CSS",
  description:
    "Generate 9-step color ramps (100–900) using a Figma-style gradient stop method, then export CSS tokens.",
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "icon", url: "/icon.svg" }]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
