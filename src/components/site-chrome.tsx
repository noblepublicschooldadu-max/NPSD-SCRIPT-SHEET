"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

function isPrivateOrAuthPath(pathname: string) {
  return /^\/(admin|teacher|student)(\/|$)/.test(pathname)
    || ["/login", "/register", "/forgot-password"].includes(pathname);
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  if (isPrivateOrAuthPath(pathname)) {
    return <main id="main" className="portal-main">{children}</main>;
  }
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
