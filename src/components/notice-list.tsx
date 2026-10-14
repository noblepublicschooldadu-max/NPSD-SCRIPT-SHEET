"use client";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "./language-provider";
import { NoticeFeed } from "@/components/notices/notice-feed";
import { isNoticeRecord, type NoticeRecord } from "@/lib/notices/contracts";

export function NoticeList() {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<NoticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setUnavailable(false);
    try {
      const response = await fetch("/api/notices", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("NOT_CONFIGURED");
      const envelope = await response.json() as { ok?: boolean; data?: unknown; notices?: unknown };
      if (envelope.ok === false) throw new Error("NOT_CONFIGURED");
      const payload = envelope.data ?? envelope.notices ?? envelope;
      const records = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as { notices?: unknown }).notices) ? (payload as { notices: unknown[] }).notices : [];
      setItems(records.filter(isNoticeRecord));
    } catch { setItems([]); setUnavailable(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <div className="card p-6 sm:p-8" dir={locale === "en" ? "ltr" : "rtl"}>
    <div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--soft)] text-lg text-[var(--brand)]" aria-hidden="true">i</span><div className="min-w-0 flex-1"><h3 className="font-bold">{loading ? (locale === "ur" ? "اعلانات لوڈ ہو رہے ہیں…" : locale === "sd" ? "اعلان لوڊ ٿي رهيا آهن…" : "Loading official notices…") : unavailable ? (locale === "ur" ? "اعلانات کی سروس دستیاب نہیں" : locale === "sd" ? "اعلانن جي سروس موجود ناهي" : "Official notice service unavailable") : t.emptyNotices}</h3><p className="muted mt-2 text-sm">{unavailable ? (locale === "ur" ? "منظور شدہ اسکول بیک اینڈ منسلک ہونے تک کوئی اعلان نہیں دکھایا جا سکتا۔" : locale === "sd" ? "منظور ٿيل اسڪول بيڪ اينڊ ڳنڍجڻ تائين ڪو اطلاع ڏيکاري نٿو سگهجي." : "The approved school API is not connected. No sample or private notices are shown.") : t.noticesBody}</p></div></div>
    {!loading && !unavailable && <NoticeFeed items={items} scope="public"/>}
    {unavailable && <button className="btn btn-secondary mt-4" onClick={()=>void load()}>{locale === "ur" ? "دوبارہ کوشش کریں" : locale === "sd" ? "ٻيهر ڪوشش ڪريو" : "Try again"}</button>}
  </div>;
}
