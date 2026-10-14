import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container-shell footer-main">
        <div className="footer-brand-block">
          <Link href="/" className="school-brand footer-brand" aria-label="Noble Public School Dadu home">
            <span className="school-brand-mark" aria-hidden="true"><span>N</span></span>
            <span className="school-brand-copy"><strong>Noble Public School Dadu</strong><small>Learning · Character · Community</small></span>
          </Link>
          <p>A place to build knowledge, confidence and the habits that support lifelong learning.</p>
          <span className="footer-location">Dadu, Sindh, Pakistan</span>
        </div>
        <div className="footer-links-group"><h2>Explore</h2><Link href="/about">About us</Link><Link href="/classes">Academics · Classes 1–8</Link><Link href="/gallery">Gallery</Link><Link href="/notices">News &amp; notices</Link></div>
        <div className="footer-links-group"><h2>Connect</h2><Link href="/admissions">Admissions enquiry</Link><Link href="/contact">Contact the school</Link><p>Official phone, email and office hours will be published after school verification.</p></div>
      </div>
      <div className="footer-bottom"><div className="container-shell"><span>© {new Date().getFullYear()} Noble Public School Dadu</span><span>School information for families and the community</span></div></div>
    </footer>
  );
}
