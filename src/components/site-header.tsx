"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { publicSiteContent as copy } from "@/lib/public-site/content";

const links = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Academics", href: "/classes" },
  { label: "Facilities", href: "/#facilities" },
  { label: "Gallery", href: "/gallery" },
  { label: "News & Notices", href: "/notices" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const firstMobileLink = useRef<HTMLAnchorElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (menuOpen) firstMobileLink.current?.focus();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="container-shell header-inner">
        <Link href="/" className="school-brand" aria-label={`${copy.identity.name} home`} onClick={closeMenu}>
          <span className="school-brand-mark" aria-hidden="true"><span>N</span></span>
          <span className="school-brand-copy"><strong>{copy.identity.name}</strong><small>{copy.identity.strapline}</small></span>
        </Link>

        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>

        <div className="header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/admissions" className="header-admissions">Admissions <span aria-hidden="true">↗</span></Link>
          <button
            ref={menuButton}
            className="mobile-menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-site-navigation"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" className={menuOpen ? "menu-glyph is-open" : "menu-glyph"}><i /><i /></span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-nav-wrap" id="mobile-site-navigation">
          <nav aria-label="Mobile navigation" className="mobile-nav">
            {links.map((link, index) => <Link key={link.href} href={link.href} ref={index === 0 ? firstMobileLink : undefined} onClick={closeMenu}>{link.label}</Link>)}
            <Link href="/admissions" className="mobile-nav-admissions" onClick={closeMenu}>Admissions Enquiry <span aria-hidden="true">↗</span></Link>
          </nav>
        </div>
      )}
    </header>
  );
}
