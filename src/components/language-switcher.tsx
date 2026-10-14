 "use client";
import {useLanguage} from "./language-provider";
export function LanguageSwitcher(){const {locale,setLocale}=useLanguage();return <label className="flex items-center gap-2 text-sm"><span className="sr-only">Website language</span><select aria-label="Website language" className="rounded-lg border border-[var(--border)] bg-white px-2 py-2" value={locale} onChange={e=>setLocale(e.target.value as "en"|"ur"|"sd")}><option value="en">English</option><option value="ur">اردو</option><option value="sd">سنڌي</option></select></label>}
