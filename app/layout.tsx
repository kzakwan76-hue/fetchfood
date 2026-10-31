import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AskMokaButton } from "../components/ask-moka-button";
import { MokaStyles } from "../components/moka-mascot";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FetchFood — Food delivery for neighbourhoods others skip",
    template: "%s | FetchFood",
  },
  description:
    "FetchFood delivers food from local restaurants, cafés and home kitchens to Lahore neighbourhoods that bigger apps overlook.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f97316",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <MokaStyles />
        {children}
        <Suspense fallback={null}>
          <AskMokaButton />
        </Suspense>
      </body>
    </html>
  );
}