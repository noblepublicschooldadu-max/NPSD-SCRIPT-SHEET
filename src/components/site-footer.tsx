import Link from "next/link";
import { publicSiteContent as copy } from "@/lib/public-site/content";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container-shell footer-main">
        <div className="footer-brand-block">
          <Link href="/" className="school-brand footer-brand" aria-label={`${copy.identity.name} home`}>
            <span className="school-brand-mark" aria-hidden="true"><span>N</span></span>
            <span className="school-brand-copy"><strong>{copy.identity.name}</strong><small>{copy.identity.strapline}</small></span>
          </Link>
          <p>{copy.footer.body}</p>
          <span className="footer-location">{copy.identity.location}</span>
        </div>
        <div className="footer-links-group"><h2>{copy.footer.explore}</h2><Link href="/about">About us</Link><Link href="/classes">Academics · Classes 1–8</Link><Link href="/gallery">Gallery</Link><Link href="/notices">News &amp; notices</Link></div>
        <div className="footer-links-group"><h2>{copy.footer.connect}</h2><Link href="/admissions">Admissions enquiry</Link><Link href="/contact">Contact the school</Link><p>{copy.footer.contactDetailsNotice}</p></div>
      </div>
      <div className="footer-bottom"><div className="container-shell"><span>© {new Date().getFullYear()} {copy.identity.name}</span><span>{copy.footer.copyrightNote}</span></div></div>
    </footer>
  );
}
