"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminApiError, adminRequest } from "@/lib/admin/service";
import { isReportPayload, reportToCsv, validateReportFilters, type ReportCategory, type ReportFilters, type ReportPayload } from "@/lib/reports/contracts";
import { useLanguage } from "@/components/language-provider";

type LoadState = "loading" | "ready" | "unavailable" | "error";
const initial: ReportFilters = { startDate: "", endDate: "", academicYearId: "", classId: "", sectionId: "", category: "overview" };
const categories: Array<{ value: ReportCategory; label: Record<string, string> }> = [
  { value: "overview", label: { en: "School overview", ur: "اسکول کا خلاصہ", sd: "اسڪول جو جائزو" } },
  { value: "attendance", label: { en: "Attendance", ur: "حاضری", sd: "حاضري" } },
  { value: "enrollment", label: { en: "Enrollment", ur: "داخل ٿيل شاگرد", sd: "داخلا" } },
  { value: "admissions", label: { en: "Admission applications", ur: "داخلہ درخواستیں", sd: "داخلا درخواستون" } },
  { value: "examinations", label: { en: "Examinations & results", ur: "امتحانات اور نتائج", sd: "امتحان ۽ نتيجا" } },
];
export function ReportsManagement({ compact = false }: { compact?: boolean }) {
  const { locale } = useLanguage();
  const [filters, setFilters] = useState<ReportFilters>(initial);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(initial);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const rtl = locale === "ur" || locale === "sd";
  const t = (en: string, ur: string, sd: string) => locale === "ur" ? ur : locale === "sd" ? sd : en;
  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(appliedFilters).forEach(([key, value]) => { if (value) p.set(key, value); });
    return p.toString();
  }, [filters]);
  const load = useCallback(async () => {
    const invalid = validateReportFilters(appliedFilters);
    if (invalid) { setFilterError(invalid); setState("error"); setError(""); return; }
    setFilterError(""); setState("loading"); setError("");
    try {
      const result = await adminRequest<unknown>(`reports/summary${query ? `?${query}` : ""}`);
      if (!isReportPayload(result)) throw new Error("The reporting service returned incomplete or invalid data.");
      setReport(result); setState("ready");
    } catch (e) {
      setReport(null); setError(e instanceof Error ? e.message : "Unable to load report data.");
      setState(e instanceof AdminApiError && e.status === 503 ? "unavailable" : "error");
    }
  }, [appliedFilters, query]);
  useEffect(() => { void load(); }, [load, refreshKey]);
  function change<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) { setFilters((current) => ({ ...current, [key]: value, ...(key === "classId" && !value ? { sectionId: "" } : {}) })); }
  function exportCsv() {
    if (!report || exporting) return;
    setExporting(true);
    try {
      const csv = reportToCsv(report);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `school-report-${filters.category}-${report.generatedAt.slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
    } catch { setError(t("CSV export failed. Please retry.", "CSV برآمد ناکام ہوئی۔ دوبارہ کوشش کریں۔", "CSV برآمد ناڪام ٿي. ٻيهر ڪوشش ڪريو.")); }
    finally { setExporting(false); }
  }
  return <div className={`admin-reports ${rtl ? "is-rtl" : ""}`} dir={rtl ? "rtl" : "ltr"}>
    {!compact && <section className="admin-panel admin-report-filters"><div className="admin-panel-heading"><div><h2>{t("Report filters", "رپورٹ فلٹرز", "رپورٽ فلٽر")}</h2><p>{t("Filters are sent to the authorized reporting API.", "فلٹرز مجاز رپورٹنگ API کو بھیجے جاتے ہیں۔", "فلٽر مجاز رپورٽنگ API ڏانهن موڪليا وڃن ٿا.")}</p></div></div>
      <form className="admin-report-filter-grid" onSubmit={(event) => { event.preventDefault(); const invalid = validateReportFilters(filters); setFilterError(invalid ?? ""); if (!invalid) setAppliedFilters(filters); }}>
        <label>{t("Report category", "رپورٹ کی قسم", "رپورٽ جو قسم")}<select className="admin-search" value={filters.category} onChange={(e) => change("category", e.target.value as ReportCategory)}>{categories.map((c) => <option key={c.value} value={c.value}>{c.label[locale] ?? c.label.en}</option>)}</select></label>
        <label>{t("Start date", "آغاز کی تاریخ", "شروعاتي تاريخ")}<input className="admin-search" type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={(e) => change("startDate", e.target.value)} /></label>
        <label>{t("End date", "اختتامی تاریخ", "پڄاڻي جي تاريخ")}<input className="admin-search" type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={(e) => change("endDate", e.target.value)} /></label>
        <label>{t("Academic year ID", "تعلیمی سال کی شناخت", "تعليمي سال جي سڃاڻپ")}<input className="admin-search" value={filters.academicYearId} maxLength={100} onChange={(e) => change("academicYearId", e.target.value)} placeholder={t("Optional backend ID", "اختیاری شناخت", "اختياري سڃاڻپ")} /></label>
        <label>{t("Class ID", "کلاس کی شناخت", "ڪلاس جي سڃاڻپ")}<input className="admin-search" value={filters.classId} maxLength={100} onChange={(e) => change("classId", e.target.value)} placeholder={t("Optional backend ID", "اختیاری شناخت", "اختياري سڃاڻپ")} /></label>
        <label>{t("Section ID", "سیکشن کی شناخت", "سيڪشن جي سڃاڻپ")}<input className="admin-search" value={filters.sectionId} maxLength={100} disabled={!filters.classId} onChange={(e) => change("sectionId", e.target.value)} placeholder={t("Requires class ID", "کلاس کی شناخت درکار", "ڪلاس جي سڃاڻپ گهربل")} /></label>
        <div className="admin-report-filter-actions"><button className="admin-button" type="submit" disabled={state === "loading"}>{t("Apply filters", "فلٹر لاگو کریں", "فلٽر لاڳو ڪريو")}</button><button className="admin-button admin-button-light" type="button" onClick={() => { setFilters(initial); setAppliedFilters(initial); setFilterError(""); setRefreshKey((n) => n + 1); }}>{t("Reset", "ری سیٹ", "ري سيٽ")}</button></div>
      </form>{filterError && <p className="admin-report-error" role="alert">{filterError}</p>}
    </section>}
    {state === "loading" && <div className="admin-panel admin-loading" role="status">{t("Loading verified report data…", "تصدیق شدہ رپورٹ ڈیٹا لوڈ ہو رہا ہے…", "تصديق ٿيل رپورٽ ڊيٽا لوڊ ٿي رهيو آهي…")}</div>}
    {(state === "unavailable" || state === "error") && <div className="admin-panel admin-state-card" role="alert"><span className="admin-state-icon">!</span><h2>{state === "unavailable" ? t("Reporting service not configured", "رپورٹنگ سروس ترتیب نہیں دی گئی", "رپورٽنگ سروس ترتيب ڏنل ناهي") : t("Report data could not be loaded", "رپورٹ ڈیٹا لوڈ نہیں ہو سکا", "رپورٽ ڊيٽا لوڊ نه ٿي سگهيو")}</h2><p>{error || t("No figures are displayed because no verified response was received.", "تصدیق شدہ جواب نہ ملنے کی وجہ سے اعداد و شمار نہیں دکھائے گئے۔", "تصديق ٿيل جواب نه ملڻ سبب انگ نه ڏيکاريا ويا آهن.")}</p><p className="admin-small-muted">{t("Missing data is not interpreted as zero. No demo values or charts are shown.", "غائب ڈیٹا کو صفر نہیں سمجھا جاتا۔ فرضی اعداد نہیں دکھائے جاتے۔", "گم ٿيل ڊيٽا کي صفر نٿو سمجهيو وڃي. فرضي انگ نه ڏيکاريا وڃن ٿا.")}</p><button className="admin-button" onClick={() => setRefreshKey((n) => n + 1)}>{t("Retry", "دوبارہ کوشش", "ٻيهر ڪوشش")}</button></div>}
    {state === "ready" && report && <>
      {report.partialData && <div className="admin-alert" role="status"><strong>{t("Partial data", "جزوی ڈیٹا", "جزوي ڊيٽا")}</strong><p>{(report.warnings ?? []).join(" ") || t("Some report sources did not return data.", "کچھ ذرائع سے ڈیٹا موصول نہیں ہوا۔", "ڪجهه ذريعن کان ڊيٽا نه ملي.")}</p></div>}
      <div className="admin-report-meta"><span>{t("Source", "ماخذ", "ذريعو")}: <strong>{report.source}</strong></span><span>{t("Last successful refresh", "آخری کامیاب تازہ کاری", "آخري ڪامياب ريفريش")}: <time>{report.refreshedAt}</time></span><span>{t("Generated", "تیار کیا گیا", "تيار ڪيو ويو")}: <time>{report.generatedAt}</time></span></div>
      {report.period && <><p className="admin-report-period">{t("Reporting period", "رپورٹنگ مدت", "رپورٽنگ مدت")}: {report.period.startDate ?? "—"} – {report.period.endDate ?? "—"}{report.period.academicYearLabel ? ` · ${report.period.academicYearLabel}` : ""}</p><p className="admin-report-period">{t("Applied filters", "لاگو فلٹرز", "لاڳو ڪيل فلٽر")}: {Object.entries(report.appliedFilters).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => `${key}: ${String(value)}`).join(" · ") || t("No additional filters", "مزید فلٹر نہیں", "وڌيڪ فلٽر نه آهن")}</p></>}
      <div className="admin-stat-grid">{report.metrics.map((metric) => <article className="admin-stat-card" key={metric.key}><span className="admin-stat-symbol blue" aria-hidden="true">◈</span><span className="admin-stat-label">{metric.label}</span><strong>{metric.value.toLocaleString()}</strong>{metric.unit && <small>{metric.unit}</small>}{metric.definition && <small>{metric.definition}</small>}</article>)}</div>
      {!!report.series?.length && <section className="admin-panel admin-report-chart" aria-label={t("Report chart data", "رپورٹ چارٹ ڈیٹا", "رپورٽ چارٽ ڊيٽا")}><div className="admin-panel-heading"><div><h2>{t("Breakdown", "تفصیل", "تفصيل")}</h2><p>{t("Bars are scaled to the values returned by the reporting service.", "بارز رپورٹنگ سروس کے اصل اعداد کے مطابق ہیں۔", "بار رپورٽنگ سروس جي موڪليل انگن مطابق آهن.")}</p></div></div><div className="admin-report-bars">{report.series.map((item) => <div className="admin-report-bar-row" key={item.key}><span>{item.label}</span><div className="admin-report-bar-track"><div className="admin-report-bar-fill" style={{ width: `${Math.max(0, Math.min(100, report.series!.reduce((max, s) => Math.max(max, s.value), 0) ? item.value / report.series!.reduce((max, s) => Math.max(max, s.value), 0) * 100 : 0))}%` }} /></div><strong>{item.value.toLocaleString()}</strong></div>)}</div></section>}
      {(report.tables ?? []).map((table) => <section className="admin-panel admin-report-table-panel" key={table.title}><div className="admin-panel-heading"><div><h2>{table.title}</h2></div></div><div className="admin-report-table-scroll"><table className="admin-report-table"><thead><tr>{table.columns.map((column, index) => <th key={`${column}-${index}`} scope="col">{column}</th>)}</tr></thead><tbody>{table.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell == null ? "—" : String(cell)}</td>)}</tr>)}</tbody></table>{table.rows.length === 0 && <p className="admin-small-muted">{t("No rows were returned for these filters.", "ان فلٹرز کے لیے کوئی ریکارڈ نہیں ملا۔", "انهن فلٽرن لاءِ ڪو رڪارڊ نه مليو.")}</p>}</div></section>)}
      <div className="admin-report-export"><button className="admin-button admin-button-light admin-report-print-button" onClick={() => window.print()}>{t("Print / Save as PDF", "پرنٹ / PDF محفوظ کریں", "پرنٽ / PDF محفوظ ڪريو")}</button><button className="admin-button" onClick={exportCsv} disabled={exporting}>{exporting ? t("Preparing CSV…", "CSV تیار ہو رہی ہے…", "CSV تيار ٿي رهي آهي…") : t("Export displayed report as CSV", "رپورٹ CSV میں برآمد کریں", "رپورٽ CSV طور برآمد ڪريو")}</button><span>{t("Only fields returned by this authorized report response are included.", "صرف مجاز رپورٹ میں واپس آنے والے خانے شامل ہیں۔", "صرف مجاز رپورٽ ۾ موڪليل خانا شامل آهن.")}</span></div>
    </>}
  </div>;
}
