"use client";

import { useLanguage } from "@/components/language-provider";

export function GalleryGrid() {
  const { t, locale } = useLanguage();
  return (
    <div className="gallery-empty-state" dir={locale === "en" ? "ltr" : "rtl"}>
      <div className="gallery-empty-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="5" width="24" height="22" rx="3"/><circle cx="12" cy="12" r="2.5"/><path d="m5 23 7-7 5 5 4-4 6 6"/></svg>
      </div>
      <div><h3>{t.emptyGallery}</h3><p className="muted">{locale === "ur" ? "اسکول کی منظور شدہ تصاویر دستیاب ہونے پر یہاں شامل کی جائیں گی۔" : locale === "sd" ? "اسڪول جون منظور ٿيل تصويرون ملڻ بعد هتي شامل ڪيون وينديون." : "No school-approved gallery images have been supplied yet. The gallery will appear here when the school provides images and confirms permission to publish them."}</p></div>
    </div>
  );
}
