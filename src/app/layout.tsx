import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const siteDescription = "Discover Noble Public School Dadu, a school community in Dadu, Sindh, Pakistan, serving primary and middle learning across Classes 1–8.";

export const metadata: Metadata = {
  metadataBase: new URL("https://noblepublicschooldadu-max.vercel.app"),
  title: {
    default: "Noble Public School Dadu | Building Knowledge, Inspiring Futures",
    template: "%s | Noble Public School Dadu",
  },
  description: siteDescription,
  applicationName: "Noble Public School Dadu",
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: "Noble Public School Dadu",
    title: "Noble Public School Dadu | Building Knowledge, Inspiring Futures",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Noble Public School Dadu",
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102A43",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
