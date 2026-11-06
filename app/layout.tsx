import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AskMokaButton } from "../components/ask-moka-button";
import { MokaStyles } from "../components/moka-mascot";
import { NavMenu } from "../components/nav-menu";
import { HeaderFallback, SiteHeader } from "../components/site-header";
import "./globals.css";

const description =
  "FetchFood delivers food from local restaurants, cafés and home kitchens to Lahore neighbourhoods that bigger apps overlook.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "FetchFood — Food delivery for neighbourhoods others skip",
    template: "%s | FetchFood",
  },
  description,
  openGraph: {
    title: "FetchFood — Food delivery for neighbourhoods others skip",
    description,
    siteName: "FetchFood",
    locale: "en_PK",
    type: "website",
  },
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
        <Suspense fallback={<HeaderFallback />}>
          <SiteHeader>
            <Suspense fallback={<span aria-hidden="true" className="h-10 w-10" />}>
              <NavMenu />
            </Suspense>
          </SiteHeader>
        </Suspense>
        {children}
        <Suspense fallback={null}>
          <AskMokaButton />
        </Suspense>
      </body>
    </html>
  );
}