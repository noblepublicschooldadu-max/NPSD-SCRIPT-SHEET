import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { GalleryGrid } from "@/components/gallery-grid";
import { NoticeList } from "@/components/notice-list";

const classes = Array.from({ length: 8 }, (_, index) => index + 1);

export default function HomePage() {
  return (
    <div className="public-home">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="container-shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark" aria-hidden="true" /> A school community in Dadu, Sindh</p>
            <h1 id="hero-title">Building knowledge.<br /><span>Inspiring futures.</span></h1>
            <p className="hero-description">At Noble Public School Dadu, learning is a journey of curiosity, confidence and care—helping children build strong foundations for the years ahead.</p>
            <div className="hero-actions">
              <Link href="/about" className="btn btn-primary">Explore Our School <span aria-hidden="true">↗</span></Link>
              <Link href="/admissions" className="btn btn-outline">Admissions Enquiry <span aria-hidden="true">→</span></Link>
            </div>
            <div className="hero-note"><span className="hero-note-rule" aria-hidden="true" /> Primary &amp; middle learning <span aria-hidden="true">·</span> Classes 1–8</div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-frame">
              <Image
                src="/images/campus-photo-placeholder.svg"
                alt="Illustrated campus placeholder, not a photograph of the actual Noble Public School Dadu campus"
                width={1200}
                height={900}
                priority
                sizes="(max-width: 760px) 100vw, 52vw"
                className="hero-image"
              />
              <div className="photo-status"><span aria-hidden="true" /> Campus photograph awaiting school approval</div>
            </div>
            <div className="hero-visual-caption"><span className="caption-line" aria-hidden="true" /><span>Dadu, Sindh, Pakistan</span></div>
          </div>
        </div>
        <div className="hero-bottom-rule" aria-hidden="true" />
      </section>

      <section className="intro-section public-section" id="about" aria-labelledby="intro-title">
        <div className="container-shell intro-grid">
          <div className="intro-aside"><p className="eyebrow">Welcome to our school</p><span className="intro-number" aria-hidden="true">01</span></div>
          <div className="intro-content">
            <h2 id="intro-title">Every child deserves a strong start.</h2>
            <p className="intro-lead">Noble Public School Dadu serves as a place to nurture the habits that help children learn: asking questions, practising new skills, showing respect and taking pride in their progress.</p>
            <p className="muted">Our public information is being prepared with the school community. Verified details about staff, campus facilities, school history and official policies will be added when supplied by the school.</p>
            <Link href="/about" className="text-link">Get to know our school <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="academics-section public-section" id="academics" aria-labelledby="academics-title">
        <div className="container-shell">
          <div className="section-topline"><p className="eyebrow">Learning pathways</p><span className="section-index">01 / 03</span></div>
          <div className="section-heading-row"><h2 id="academics-title" className="section-title">A foundation for every next step.</h2><p className="muted">Classes 1–8, with learning that grows alongside each student.</p></div>
          <div className="class-grid">
            {classes.map((grade) => (
              <Link key={grade} href="/classes" className="class-card">
                <span className="class-card-label">CLASS</span><span className="class-card-number">{String(grade).padStart(2, "0")}</span><span className="class-card-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          <div className="learning-bands">
            <article><span className="band-marker" aria-hidden="true">A</span><div><h3>Primary learning</h3><p>Classes 1–5 · Building literacy, numeracy, curiosity and the confidence to participate.</p></div></article>
            <article><span className="band-marker" aria-hidden="true">B</span><div><h3>Middle learning</h3><p>Classes 6–8 · Strengthening understanding, independent thinking and readiness for the next stage.</p></div></article>
          </div>
          <p className="content-note">These are broad learning-stage descriptions, not a published curriculum or an official syllabus statement.</p>
        </div>
      </section>

      <section className="values-section public-section" id="values" aria-labelledby="values-title">
        <div className="container-shell values-grid">
          <div className="values-heading"><p className="eyebrow">What learning can build</p><h2 id="values-title" className="section-title">Knowledge matters.<br /><span>Character matters, too.</span></h2><p className="muted">The values below describe the school's intended public-facing message; the school can edit or approve them before publication.</p></div>
          <div className="values-list">
            <article><span className="value-number">01</span><div><h3>Curiosity</h3><p>Encourage children to ask questions, explore ideas and keep learning.</p></div><span className="value-arrow" aria-hidden="true">↗</span></article>
            <article><span className="value-number">02</span><div><h3>Confidence</h3><p>Make room for practice, participation and steady personal progress.</p></div><span className="value-arrow" aria-hidden="true">↗</span></article>
            <article><span className="value-number">03</span><div><h3>Respect</h3><p>Support kindness, responsibility and positive relationships in school life.</p></div><span className="value-arrow" aria-hidden="true">↗</span></article>
            <article><span className="value-number">04</span><div><h3>Partnership</h3><p>Keep families informed through clear, respectful communication.</p></div><span className="value-arrow" aria-hidden="true">↗</span></article>
          </div>
        </div>
      </section>

      <section className="environment-section public-section" id="facilities" aria-labelledby="environment-title">
        <div className="container-shell environment-inner">
          <div className="environment-copy"><p className="eyebrow">Learning environment</p><h2 id="environment-title" className="section-title">A school story told with care.</h2><p className="muted">We will share photographs and details of classrooms, facilities and school life here once the school provides and approves the material. No unverified campus features are being advertised.</p><Link href="/contact" className="text-link">Contact the school team <span aria-hidden="true">↗</span></Link></div>
          <div className="environment-art" aria-label="Campus illustration placeholder"><Image src="/images/campus-photo-placeholder.svg" alt="Illustrated placeholder for an approved campus or classroom photograph" width={1200} height={900} sizes="(max-width: 760px) 100vw, 40vw" /></div>
        </div>
      </section>

      <section className="notices-section public-section" id="notices" aria-labelledby="notices-title">
        <div className="container-shell">
          <div className="section-heading-row notices-heading"><div><p className="eyebrow">From the school</p><h2 id="notices-title" className="section-title">News &amp; notices</h2></div><Link href="/notices" className="text-link">All notices <span aria-hidden="true">↗</span></Link></div>
          <NoticeList />
        </div>
      </section>

      <section className="gallery-section public-section" id="gallery" aria-labelledby="gallery-title">
        <div className="container-shell">
          <div className="section-heading-row notices-heading"><div><p className="eyebrow">A glimpse of school life</p><h2 id="gallery-title" className="section-title">Our gallery</h2><p className="muted">Only school-approved images will appear here.</p></div><Link href="/gallery" className="text-link">View gallery <span aria-hidden="true">↗</span></Link></div>
          <GalleryGrid />
        </div>
      </section>

      <section className="admissions-banner public-section" aria-labelledby="admissions-title">
        <div className="container-shell admissions-banner-inner"><div><p className="eyebrow">Admissions information</p><h2 id="admissions-title">Taking the next step starts with a conversation.</h2><p>Check the current admissions information and confirmed school contact channels before sharing personal details.</p></div><Link href="/admissions" className="btn btn-gold">Admissions Enquiry <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className="enquiry-section public-section" id="enquiry" aria-labelledby="enquiry-title">
        <div className="container-shell enquiry-grid"><div><p className="eyebrow">Get in touch</p><h2 id="enquiry-title" className="section-title">Questions about our school?</h2><p className="muted">Use this form to prepare an enquiry. Online delivery is not connected yet, so your message will not be sent or stored.</p><div className="contact-location"><span className="location-mark" aria-hidden="true">N</span><div><strong>Noble Public School Dadu</strong><p>Dadu, Sindh, Pakistan</p></div></div></div><ContactForm /></div>
      </section>
    </div>
  );
}
