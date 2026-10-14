import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { publicSiteContent as copy } from "@/lib/public-site/content";
import { GalleryGrid } from "@/components/gallery-grid";
import { NoticeList } from "@/components/notice-list";

const classes = Array.from({ length: 8 }, (_, index) => index + 1);

export default function HomePage() {
  return (
    <div className="public-home">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="container-shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark" aria-hidden="true" /> {copy.hero.eyebrow}</p>
            <h1 id="hero-title">{copy.hero.titleLineOne}<br /><span>{copy.hero.titleLineTwo}</span></h1>
            <p className="hero-description">{copy.hero.body}</p>
            <div className="hero-actions">
              <Link href="/about" className="btn btn-primary">Explore Our School <span aria-hidden="true">↗</span></Link>
              <Link href="/admissions" className="btn btn-outline">Admissions Enquiry <span aria-hidden="true">→</span></Link>
            </div>
            <div className="hero-note"><span className="hero-note-rule" aria-hidden="true" /> {copy.hero.note} <span aria-hidden="true">·</span> Classes 1–8</div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-frame">
              <Image
                src="/images/campus-photo-placeholder.svg"
                alt="{copy.hero.imageAlt}"
                width={1200}
                height={900}
                priority
                sizes="(max-width: 760px) 100vw, 52vw"
                className="hero-image"
              />
              <div className="photo-status"><span aria-hidden="true" /> {copy.hero.imageStatus}</div>
            </div>
            <div className="hero-visual-caption"><span className="caption-line" aria-hidden="true" /><span>{copy.identity.location}</span></div>
          </div>
        </div>
        <div className="hero-bottom-rule" aria-hidden="true" />
      </section>

      <section className="intro-section public-section" id="about" aria-labelledby="intro-title">
        <div className="container-shell intro-grid">
          <div className="intro-aside"><p className="eyebrow">{copy.introduction.eyebrow}</p><span className="intro-number" aria-hidden="true">01</span></div>
          <div className="intro-content">
            <h2 id="intro-title">{copy.introduction.title}</h2>
            <p className="intro-lead">{copy.introduction.lead}</p>
            <p className="muted">{copy.introduction.context}</p>
            <Link href="/about" className="text-link">Get to know our school <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="academics-section public-section" id="academics" aria-labelledby="academics-title">
        <div className="container-shell">
          <div className="section-topline"><p className="eyebrow">{copy.academics.eyebrow}</p><span className="section-index">01 / 03</span></div>
          <div className="section-heading-row"><h2 id="academics-title" className="section-title">{copy.academics.title}</h2><p className="muted">{copy.academics.description}</p></div>
          <div className="class-grid">
            {classes.map((grade) => (
              <Link key={grade} href="/classes" className="class-card">
                <span className="class-card-label">CLASS</span><span className="class-card-number">{String(grade).padStart(2, "0")}</span><span className="class-card-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          <div className="learning-bands">
            <article><span className="band-marker" aria-hidden="true">A</span><div><h3>{copy.academics.primaryTitle}</h3><p>{copy.academics.primaryDescription}</p></div></article>
            <article><span className="band-marker" aria-hidden="true">B</span><div><h3>{copy.academics.middleTitle}</h3><p>{copy.academics.middleDescription}</p></div></article>
          </div>
          <p className="content-note">{copy.academics.note}</p>
        </div>
      </section>

      <section className="values-section public-section" id="values" aria-labelledby="values-title">
        <div className="container-shell values-grid">
          <div className="values-heading"><p className="eyebrow">{copy.values.eyebrow}</p><h2 id="values-title" className="section-title">{copy.values.titleLineOne}<br /><span>{copy.values.titleLineTwo}</span></h2><p className="muted">{copy.values.note}</p></div>
          <div className="values-list">
            <article><span className="value-number">01</span><div>
          </div>
        </div>
      </section>

      <section className="environment-section public-section" id="facilities" aria-labelledby="environment-title">
        <div className="container-shell environment-inner">
          <div className="environment-copy"><p className="eyebrow">{copy.environment.eyebrow}</p><h2 id="environment-title" className="section-title">{copy.environment.title}</h2><p className="muted">{copy.environment.body}</p><Link href="/contact" className="text-link">Contact the school team <span aria-hidden="true">↗</span></Link></div>
          <div className="environment-art" aria-label="Campus illustration placeholder"><Image src="/images/campus-photo-placeholder.svg" alt="Illustrated placeholder for an approved campus or classroom photograph" width={1200} height={900} sizes="(max-width: 760px) 100vw, 40vw" /></div>
        </div>
      </section>

      <section className="notices-section public-section" id="notices" aria-labelledby="notices-title">
        <div className="container-shell">
          <div className="section-heading-row notices-heading"><div><p className="eyebrow">{copy.notices.eyebrow}</p><h2 id="notices-title" className="section-title">{copy.notices.title}</h2></div><Link href="/notices" className="text-link">All notices <span aria-hidden="true">↗</span></Link></div>
          <NoticeList />
        </div>
      </section>

      <section className="gallery-section public-section" id="gallery" aria-labelledby="gallery-title">
        <div className="container-shell">
          <div className="section-heading-row notices-heading"><div><p className="eyebrow">{copy.gallery.eyebrow}</p><h2 id="gallery-title" className="section-title">{copy.gallery.title}</h2><p className="muted">{copy.gallery.description}</p></div><Link href="/gallery" className="text-link">View gallery <span aria-hidden="true">↗</span></Link></div>
          <GalleryGrid />
        </div>
      </section>

      <section className="admissions-banner public-section" aria-labelledby="admissions-title">
        <div className="container-shell admissions-banner-inner"><div><p className="eyebrow">{copy.admissions.eyebrow}</p><h2 id="admissions-title">{copy.admissions.title}</h2><p>{copy.admissions.body}</p></div><Link href="/admissions" className="btn btn-gold">Admissions Enquiry <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className="enquiry-section public-section" id="enquiry" aria-labelledby="enquiry-title">
        <div className="container-shell enquiry-grid"><div><p className="eyebrow">Get in touch</p><h2 id="enquiry-title" className="section-title">{copy.enquiry.title}</h2><p className="muted">{copy.enquiry.body}</p><div className="contact-location"><span className="location-mark" aria-hidden="true">N</span><div><strong>Noble Public School Dadu</strong><p>{copy.identity.location}</p></div></div></div><ContactForm /></div>
      </section>
    </div>
  );
}
