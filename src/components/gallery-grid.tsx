 "use client";
import {useLanguage} from "./language-provider";
export function GalleryGrid(){const {t}=useLanguage();return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{["A","B","C"].map((key,i)=><div key={key} className="card flex min-h-48 flex-col items-center justify-center bg-white p-6 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--soft)] text-xl text-[var(--brand)]" aria-hidden="true">{["▧","✳","⌂"][i]}</div><p className="font-bold">{t.emptyGallery}</p><p className="muted mt-1 text-sm">{t.placeholder}</p></div>)}</div>}
