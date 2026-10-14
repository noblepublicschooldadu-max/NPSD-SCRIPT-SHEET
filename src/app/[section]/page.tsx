"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { SectionHeading } from "@/components/section-heading";
import { NoticeList } from "@/components/notice-list";
import { GalleryGrid } from "@/components/gallery-grid";
import { ContactForm } from "@/components/contact-form";

const allowed = ["about", "classes", "teachers", "notices", "gallery", "admissions", "contact", "admin", "teacher", "student"] as const;

export default function InfoPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  const { t } = useLanguage();
  if (!allowed.includes(section as typeof allowed[number])) notFound();
  if (["admin", "teacher", "student"].includes(section)) {
    const labels: Record<string, string> = { admin: "Administrator", teacher: "Teacher", student: "Student" };
    return <section className="container-shell min-h-[55vh] py-14 md:py-20"><div className="card mx-auto max-w-2xl p-7 md:p-10"><p className="text-sm font-bold uppercase tracking-[.16em] text-[var(--brand)]">Protected area</p><h1 className="mt-3 text-3xl font-black">{labels[section]} portal</h1><p className="muted mt-4 leading-7">This area is not available until backend authentication, server-side role authorization, and secure sessions are deployed. No role is assumed from a URL or browser state. Access is denied by default.</p><Link href="/login" className="btn btn-primary mt-6">Go to sign in</Link></div></section>;
  }
  const details: Record<string, { title: string; body: string }> = {
    about: { title: t.aboutTitle, body: t.aboutBody },
    classes: { title: t.classesTitle, body: t.classesPageBody },
    teachers: { title: t.teachersTitle, body: t.teachersPageBody },
    notices: { title: t.noticesTitle, body: t.noticesPageBody },
    gallery: { title: t.galleryTitle, body: t.galleryPageBody },
    admissions: { title: t.admissionsTitle, body: t.admissionsPageBody },
    contact: { title: t.contactTitle, body: t.contactPageBody },
  };
  return <section className="public-page container-shell">
    <SectionHeading eyebrow="School information" title={details[section].title} description={details[section].body} />
    {section === "classes" && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4,5,6,7,8].map(n => <div className="card p-5" key={n}><p className="muted text-xs">{t.classLabel}</p><h2 className="text-2xl font-black">{n}</h2><p className="muted mt-2 text-sm">{t.placeholder}</p></div>)}</div>}
    {section === "about" && <div className="grid gap-4 md:grid-cols-2"><article className="card p-6"><h2 className="text-xl font-extrabold">{t.missionTitle}</h2><p className="muted mt-3">{t.missionBody}</p></article><article className="card p-6"><h2 className="text-xl font-extrabold">{t.facilitiesTitle}</h2><p className="muted mt-3">{t.facilitiesBody}</p></article></div>}
    {section === "notices" && <NoticeList />}
    {section === "gallery" && <GalleryGrid />}
    {section === "teachers" && <div className="card p-6"><h2 className="font-bold">{t.placeholder}</h2><p className="muted mt-2">{t.teachersPageBody}</p></div>}
    {section === "admissions" && <div className="card max-w-3xl p-6"><p>{t.admissionsPageBody}</p><p className="muted mt-4 text-sm">{t.placeholder}</p></div>}
    {section === "contact" && <div className="grid gap-6 lg:grid-cols-2"><div className="card p-6"><h2 className="font-bold">{t.contactTitle}</h2><p className="muted mt-2">{t.placeholder}</p><p className="muted mt-4 text-sm">Phone: {t.placeholder}<br/>Email: {t.placeholder}<br/>Address: {t.placeholder}</p></div><ContactForm /></div>}
    <Link href="/" className="btn btn-secondary mt-8">← {t.nav.home}</Link>
  </section>;
}
