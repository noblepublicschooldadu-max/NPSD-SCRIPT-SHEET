"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { adminRequest } from "@/lib/admin/service";
import { isNoticeRecord, noticeOperationKey, uniqueNoticeIds, validateNoticeDraft, type NoticeAudience, type NoticeDraft, type NoticeRecord } from "@/lib/notices/contracts";

const ui = {
  en: { create:"Create notice", edit:"Edit draft", title:"Title", body:"Notice content", category:"Category", audience:"Audience", expiry:"Expiry date (optional)", classes:"Target class IDs (comma-separated; use authorized record IDs)", attachment:"Approved attachment ID (optional)", save:"Save draft", cancel:"Cancel", preview:"Preview", search:"Search notices", status:"Status", all:"All statuses", anyAudience:"All audiences", public:"Public website", teachers:"All teachers", students:"All students", classesAudience:"Selected classes/sections", admins:"Admins only", published:"Published", draft:"Draft", expired:"Expired", archived:"Archived", withdrawn:"Withdrawn", publish:"Publish now", withdraw:"Withdraw", archive:"Archive", history:"Publication history", unavailable:"Notices backend is unavailable. No changes have been saved.", empty:"No notices were returned by the school service.", attachmentNote:"Attachments are not uploaded here. Only backend-verified attachment references may be used.", scheduled:"Scheduled publication is shown only when the backend advertises support.", previewLabel:"Preview only — not published", creator:"Created", updated:"Updated", noHistory:"No publication history returned.", loadError:"Unable to load notices.", fromDate:"From date", toDate:"To date", records:"Notice records", recordSubtitle:"Draft, publication, withdrawal and archival history comes from the authorized backend.", serviceUnavailable:"Notice service unavailable", emptyDetail:"No examples are generated for this list." },
  ur: { create:"اعلان بنائیں", edit:"مسودہ ترمیم کریں", title:"عنوان", body:"اعلان کا متن", category:"زمرہ", audience:"کس کے لیے", expiry:"میعاد ختم ہونے کی تاریخ (اختیاری)", classes:"مطلوبہ کلاس IDs (کوما سے الگ؛ صرف مجاز ریکارڈ IDs)", attachment:"منظور شدہ منسلکہ ID (اختیاری)", save:"مسودہ محفوظ کریں", cancel:"منسوخ", preview:"پیش منظر", search:"اعلانات تلاش کریں", status:"حیثیت", all:"تمام حیثیتیں", anyAudience:"تمام سامعین", public:"عوامی ویب سائٹ", teachers:"تمام اساتذہ", students:"تمام طلبہ", classesAudience:"منتخب کلاسیں/سیکشن", admins:"صرف منتظمین", published:"شائع شدہ", draft:"مسودہ", expired:"میعاد ختم", archived:"محفوظ شدہ", withdrawn:"واپس لیا گیا", publish:"ابھی شائع کریں", withdraw:"واپس لیں", archive:"محفوظ کریں", history:"اشاعت کی تاریخ", unavailable:"اعلانات کی سروس دستیاب نہیں۔ کوئی تبدیلی محفوظ نہیں ہوئی۔", empty:"سروس سے کوئی اعلان موصول نہیں ہوا۔", attachmentNote:"یہاں فائل اپ لوڈ نہیں ہوتی۔ صرف بیک اینڈ سے تصدیق شدہ منسلکہ استعمال کریں۔", scheduled:"مقررہ اشاعت صرف بیک اینڈ کی معاونت پر دکھائی جائے گی۔", previewLabel:"صرف پیش منظر — شائع نہیں ہوا", creator:"تخلیق", updated:"تازہ کاری", noHistory:"اشاعت کی تاریخ دستیاب نہیں۔", loadError:"اعلانات لوڈ نہیں ہو سکے۔", fromDate:"تاریخ سے", toDate:"تاریخ تک", records:"اعلانات کے ریکارڈ", recordSubtitle:"مسودے، اشاعت اور واپسی کی تاریخ مجاز بیک اینڈ سے آتی ہے۔", serviceUnavailable:"اعلانات کی سروس دستیاب نہیں", emptyDetail:"اس فہرست کے لیے نمونے نہیں بنائے جاتے۔" },
  sd: { create:"اعلان ٺاهيو", edit:"مسودي ۾ ترميم", title:"عنوان", body:"اعلان جو متن", category:"قسم", audience:"ڪن لاءِ", expiry:"ختم ٿيڻ جي تاريخ (اختياري)", classes:"لاڳاپيل ڪلاس IDs (ڪاما سان جدا؛ مجاز رڪارڊ IDs)", attachment:"منظور ٿيل فائيل ID (اختياري)", save:"مسودو محفوظ ڪريو", cancel:"رد ڪريو", preview:"اڳواٽ ڏسو", search:"اعلان ڳوليو", status:"حالت", all:"سڀ حالتون", anyAudience:"سڀ پڙهندڙ", public:"عوامي ويب سائيٽ", teachers:"سڀ استاد", students:"سڀ شاگرد", classesAudience:"چونڊيل ڪلاس/سيڪشن", admins:"صرف منتظم", published:"شايع ٿيل", draft:"مسودو", expired:"مدو پورو", archived:"محفوظ ٿيل", withdrawn:"واپس ورتل", publish:"هاڻي شايع ڪريو", withdraw:"واپس وٺو", archive:"محفوظ ڪريو", history:"اشاعت جي تاريخ", unavailable:"اعلانن جي سروس موجود ناهي. ڪا تبديلي محفوظ نه ٿي.", empty:"سروس مان ڪو اعلان نه مليو.", attachmentNote:"هتي فائيل اپ لوڊ نٿو ٿئي. صرف تصديق ٿيل منسلڪ حوالو استعمال ڪريو.", scheduled:"مقرر اشاعت صرف بیک اينڊ جي سهڪار سان ظاهر ٿيندي.", previewLabel:"صرف جائزو — شايع ٿيل ناهي", creator:"ٺاهيو", updated:"تازو", noHistory:"اشاعت جي تاريخ موجود ناهي.", loadError:"اعلان لوڊ نه ٿي سگهيا.", fromDate:"تاريخ کان", toDate:"تاريخ تائين", records:"اعلانن جا رڪارڊ", recordSubtitle:"مسودن ۽ اشاعت جي تاريخ مجاز بيڪ اينڊ مان ايندي آهي.", serviceUnavailable:"اعلانن جي سروس موجود ناهي", emptyDetail:"هن فهرست لاءِ نمونا ناهن ٺاهيا ويندا." },
} as const;

function getNotices(result: unknown): NoticeRecord[] {
  const candidate = Array.isArray(result) ? result : result && typeof result === "object" ? (result as { notices?: unknown; items?: unknown }).notices ?? (result as { items?: unknown }).items : [];
  return Array.isArray(candidate) ? candidate.filter(isNoticeRecord) : [];
}
function dateLabel(value?: string) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString(); }

export function NoticeManagement() {
  const { locale } = useLanguage();
  const t = ui[locale];
  const [items, setItems] = useState<NoticeRecord[]>([]);
  const [history, setHistory] = useState<Array<{ id?: string; noticeId?: string; action: string; actor?: string; timestamp: string; reason?: string }>>([]);
  const [capabilities, setCapabilities] = useState<{ scheduledPublishing?: boolean; attachments?: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingId, setEditingId] = useState("");
  const [preview, setPreview] = useState<NoticeDraft | null>(null);
  const [historyNoticeId, setHistoryNoticeId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [audience, setAudience] = useState<NoticeAudience>("public");
  const [expiresAt, setExpiresAt] = useState("");
  const [classIdsText, setClassIdsText] = useState("");
  const [attachmentId, setAttachmentId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await adminRequest<unknown>("notices");
      setItems(getNotices(result));
      if (result && typeof result === "object") {
        const obj = result as { history?: unknown; capabilities?: unknown };
        setHistory(Array.isArray(obj.history) ? obj.history.filter((entry): entry is { id?: string; noticeId?: string; action: string; actor?: string; timestamp: string; reason?: string } => Boolean(entry) && typeof entry === "object" && typeof (entry as { action?: unknown }).action === "string" && typeof (entry as { timestamp?: unknown }).timestamp === "string") : []);
        setCapabilities(obj.capabilities && typeof obj.capabilities === "object" ? obj.capabilities as { scheduledPublishing?: boolean; attachments?: boolean } : {});
      }
    } catch (cause) { setItems([]); setError(cause instanceof Error ? cause.message : t.loadError); }
    finally { setLoading(false); }
  }, [t.loadError]);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => items.filter(item => {
    const searchMatch = `${item.title} ${item.body} ${item.category ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const recordDate = (item.publishedAt || item.createdAt || item.updatedAt || "").slice(0, 10);
    return searchMatch && (statusFilter === "all" || item.status === statusFilter) && (audienceFilter === "all" || item.audience === audienceFilter) && (!dateFrom || (recordDate && recordDate >= dateFrom)) && (!dateTo || (recordDate && recordDate <= dateTo));
  }), [items, query, statusFilter, audienceFilter, dateFrom, dateTo]);
  const reset = () => { setEditingId(""); setTitle(""); setBody(""); setCategory("General"); setAudience("public"); setExpiresAt(""); setClassIdsText(""); setAttachmentId(""); setScheduledAt(""); setPreview(null); };
  const startEdit = (item: NoticeRecord) => { setEditingId(item.id); setTitle(item.title); setBody(item.body); setCategory(item.category ?? "General"); setAudience(item.audience); setExpiresAt(item.expiresAt?.slice(0,10) ?? ""); setClassIdsText([...((item.classIds ?? []).map(id => `class:${id}`)), ...((item.sectionIds ?? []).map(id => `section:${id}`))].join(", ")); setAttachmentId(item.attachmentId ?? ""); setScheduledAt(item.scheduledAt ?? ""); setPreview(null); };
  const draft: NoticeDraft = { title, body, category, audience, ...(expiresAt ? { expiresAt } : {}), ...(audience === "classes" ? { classIds: uniqueNoticeIds(classIdsText.split(",").filter(value => value.trim().toLowerCase().startsWith("class:")).map(value => value.trim().slice(6))), sectionIds: uniqueNoticeIds(classIdsText.split(",").filter(value => value.trim().toLowerCase().startsWith("section:")).map(value => value.trim().slice(8))) } : {}), ...(attachmentId.trim() ? { attachmentId: attachmentId.trim() } : {}) };

  async function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setError("");
    const validation = validateNoticeDraft(draft);
    if (validation) { setError(validation); return; }
    if (scheduledAt && (!capabilities.scheduledPublishing || !Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt) <= Date.now())) { setError("Scheduled publication is not supported or the scheduled date must be in the future."); return; }
    if (audience === "public" && !window.confirm("Confirm this notice contains only school-approved public information and no private student or family data.")) return;
    const payload = { ...draft, ...(editingId ? { expectedVersion: items.find(item => item.id === editingId)?.version } : {}), idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    setBusy(true);
    try {
      const result = await adminRequest<unknown>(editingId ? `notices/${encodeURIComponent(editingId)}` : "notices", { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) });
      const returned = isNoticeRecord(result) ? result : result && typeof result === "object" && isNoticeRecord((result as { notice?: unknown }).notice) ? (result as { notice: NoticeRecord }).notice : null;
      if (!returned) throw new Error("The service did not confirm the saved notice record.");
      if (scheduledAt) {
        try {
          if (typeof returned.version !== "number") throw new Error("The service did not return a record version required for safe scheduling.");
          await adminRequest(`notices/${encodeURIComponent(returned.id)}/schedule`, { method: "POST", body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString(), expectedVersion: returned.version, idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}` }) });
          setMessage("The school service confirmed the draft and scheduled publication.");
        } catch (scheduleCause) {
          const scheduleError = `Draft was saved, but scheduled publication was not confirmed: ${scheduleCause instanceof Error ? scheduleCause.message : "schedule operation unavailable"}`;
          reset(); await load(); setError(scheduleError); return;
        }
      } else setMessage(editingId ? "Draft updated by the school service." : "Draft saved by the school service.");
      reset(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Draft was not saved."); }
    finally { setBusy(false); }
  }
  async function transition(item: NoticeRecord, action: "publish" | "withdraw" | "archive") {
    const label = action === "publish" ? "publish" : action === "withdraw" ? "withdraw" : "archive";
    if (!window.confirm(`Confirm ${label} for “${item.title}”?${action === "publish" && item.audience === "public" ? " Confirm this contains only approved public information and no private student/family details." : ""} This action will be recorded in the notice audit history.`)) return;
    const reason = action === "withdraw" || action === "archive" ? window.prompt("Enter a reason for this action:") : "";
    if ((action === "withdraw" || action === "archive") && !reason?.trim()) { setError("A reason is required. No change was sent."); return; }
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await adminRequest(`notices/${encodeURIComponent(item.id)}/${action}`, { method: "POST", body: JSON.stringify({ expectedVersion: item.version, operationKey: noticeOperationKey(item.id, action, item.version ?? -1), ...(reason ? { reason: reason.trim() } : {}) }) });
      setMessage(`The school service confirmed the notice was ${action === "publish" ? "published" : action === "withdraw" ? "withdrawn" : "archived"}.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The notice change was not confirmed."); }
    finally { setBusy(false); }
  }
  const selectedHistory = history.filter(event => event.noticeId === historyNoticeId || event.id === historyNoticeId);
  return <div className="admin-notice-workspace" dir={locale === "en" ? "ltr" : "rtl"}>
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>{editingId ? t.edit : t.create}</h2><p>Only server-confirmed changes are saved. Teachers are read-only unless school policy and the backend explicitly grant publishing permissions.</p></div><button className="admin-button admin-button-light" onClick={() => void load()} disabled={loading || busy}>↻ Refresh</button></div>
      {error && <p className="admin-schedule-error" role="alert">{error}</p>}{message && <p className="admin-schedule-notice" role="status">{message}</p>}
      <form className="admin-notice-form" onSubmit={saveDraft}>
        <label className="admin-schedule-field">{t.title}<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} required /></label>
        <label className="admin-schedule-field">{t.category}<select value={category} onChange={e=>setCategory(e.target.value)}><option>General</option><option>Academic</option><option>Examinations</option><option>Admissions</option><option>Events</option><option>Emergency</option><option>Administration</option></select></label>
        <label className="admin-schedule-field">{t.audience}<select value={audience} onChange={e=>setAudience(e.target.value as NoticeAudience)}><option value="public">{t.public}</option><option value="teachers">{t.teachers}</option><option value="students">{t.students}</option><option value="classes">{t.classesAudience}</option><option value="admins">{t.admins}</option></select></label>
        <label className="admin-schedule-field">{t.expiry}<input type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} /></label>
        {audience === "classes" && <label className="admin-schedule-field admin-notice-wide">{t.classes}<input value={classIdsText} onChange={e=>setClassIdsText(e.target.value)} placeholder="class:CLASS_ID, section:SECTION_ID" required/><small>Backend must resolve every ID and verify the current Admin session.</small></label>}
        <label className="admin-schedule-field admin-notice-wide">{t.body}<textarea value={body} onChange={e=>setBody(e.target.value)} rows={6} maxLength={12000} required /></label>
        <label className="admin-schedule-field admin-notice-wide">{t.attachment}<input value={attachmentId} onChange={e=>setAttachmentId(e.target.value)} maxLength={180} placeholder="Verified attachment reference, not a URL"/><small>{t.attachmentNote}</small></label>
        {capabilities.scheduledPublishing && <label className="admin-schedule-field">Schedule publication<input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label>}
        <div className="admin-notice-preview admin-notice-wide"><strong>{t.previewLabel}</strong><h3>{title.trim() || t.title}</h3><p>{body.trim() || t.body}</p><small>{category} · {audience} · {expiresAt ? `Expires ${expiresAt}` : "No expiry date"}</small></div>
        <div className="admin-schedule-form-actions admin-notice-wide"><button className="admin-button" type="submit" disabled={busy}>{busy ? "Saving…" : t.save}</button><button className="admin-button admin-button-light" type="button" onClick={()=>setPreview(draft)}>{t.preview}</button>{(editingId || title || body) && <button className="admin-button admin-button-light" type="button" onClick={reset} disabled={busy}>{t.cancel}</button>}</div>
      </form>
      {preview && <div className="admin-notice-preview" role="status"><strong>{t.previewLabel}</strong><h3>{preview.title}</h3><p>{preview.body}</p></div>}
      <p className="admin-small-muted">{t.scheduled} Email and WhatsApp delivery are not enabled by this interface.</p>
    </section>
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>{t.records}</h2><p>{t.recordSubtitle}</p></div><span className="admin-status-dot"/></div>
      <div className="admin-notice-filters"><label className="admin-schedule-field">{t.search}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title, body or category"/></label><label className="admin-schedule-field">{t.fromDate}<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label><label className="admin-schedule-field">{t.toDate}<input type="date" min={dateFrom || undefined} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label><label className="admin-schedule-field">{t.status}<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">{t.all}</option>{["draft","published","expired","archived","withdrawn"].map(s=><option key={s} value={s}>{t[s as keyof typeof t]}</option>)}</select></label><label className="admin-schedule-field">{t.audience}<select value={audienceFilter} onChange={e=>setAudienceFilter(e.target.value)}><option value="all">{t.anyAudience}</option>{["public","teachers","students","classes","admins"].map(s=><option key={s} value={s}>{t[s as keyof typeof t] as string}</option>)}</select></label></div>
      {loading ? <div className="admin-loading" role="status">Loading notices…</div> : error && !items.length ? <div className="admin-state-card"><h3>{t.serviceUnavailable}</h3><p>{error}</p><p className="admin-small-muted">No local or sample notices are substituted.</p></div> : visible.length ? <div className="admin-notice-list">{visible.map(item=><article key={item.id} className="admin-notice-row"><div className="admin-notice-row-main"><div className="admin-notice-meta"><span className={`admin-notice-status status-${item.status}`}>{t[item.status]}</span><span>{t[item.audience]}</span><span>{item.category || "General"}</span></div><h3>{item.title}</h3><p>{item.body}</p><small>{t.creator}: {item.creatorName || "—"} · {t.updated}: {dateLabel(item.updatedAt || item.createdAt)} · Expires: {item.expiresAt || "—"}</small>{item.attachmentId && <small>Attachment: {item.attachmentName || "Approved file reference"} · {item.attachmentAvailable ? "Backend reports available" : "Not available"}</small>}</div><div className="admin-notice-row-actions">{item.status === "draft" && <button className="admin-button admin-button-light" disabled={busy} onClick={()=>startEdit(item)}>{t.edit}</button>}{item.status === "draft" && <button className="admin-button" disabled={busy || typeof item.version !== "number"} onClick={()=>void transition(item,"publish")}>{t.publish}</button>}{item.status === "published" && <button className="admin-button admin-button-light" disabled={busy || typeof item.version !== "number"} onClick={()=>void transition(item,"withdraw")}>{t.withdraw}</button>}{item.status !== "archived" && item.status !== "published" && <button className="admin-button admin-button-light" disabled={busy || typeof item.version !== "number"} onClick={()=>void transition(item,"archive")}>{t.archive}</button>}<button className="admin-button admin-button-light" onClick={()=>setHistoryNoticeId(historyNoticeId===item.id?"":item.id)} aria-expanded={historyNoticeId===item.id}>{t.history}</button></div>{historyNoticeId===item.id && <div className="admin-notice-history"><strong>{t.history}</strong>{selectedHistory.length ? selectedHistory.map((event,index)=><p key={`${event.timestamp}-${index}`}>{event.action} · {event.actor || "—"} · {dateLabel(event.timestamp)} {event.reason ? `· ${event.reason}` : ""}</p>) : (item.history?.length ? item.history.map((event,index)=><p key={`${event.timestamp}-${index}`}>{event.action} · {event.actor || "—"} · {dateLabel(event.timestamp)} {event.reason ? `· ${event.reason}` : ""}</p>) : <p>{t.noHistory}</p>)}</div>}</article>)}</div> : <div className="admin-state-card"><h3>{t.empty}</h3><p>{t.emptyDetail}</p></div>}
    </section>
  </div>;
}
