import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { SiteChrome } from "@/components/site-chrome";

const siteDescription = "Discover Noble Public School Dadu, a school community in Dadu, Sindh, Pakistan, serving primary and middle learning across Classes 1–8.";

export const metadata: Metadata = {
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
    card: "summary",
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
      <Script id="public-theme-init" strategy="beforeInteractive">
        {\`(()=>{try{const t=localStorage.getItem('npsd-public-theme');document.documentElement.dataset.publicTheme=(t==='light'||t==='dark')?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){document.documentElement.dataset.publicTheme='light'}})()\`}
      </Script>
      <body>
        <LanguageProvider>
          <SiteChrome>{children}</SiteChrome>
        </LanguageProvider>
      </body>
    </html>
  );
}
