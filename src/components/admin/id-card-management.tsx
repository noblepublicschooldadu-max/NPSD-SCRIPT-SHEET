"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminRequest, AdminApiError } from "@/lib/admin/service";
import { isEligibleForCard, type IdCardRecord, type OfficialCardStudent } from "@/lib/id-cards/contracts";

type ApiData = { students?: OfficialCardStudent[]; cards?: IdCardRecord[]; academicYears?: string[] };
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="admin-state-card"><span className="admin-state-icon" aria-hidden="true">⌁</span><h2>{title}</h2><p>{text}</p></div>; }
export function IdCardManagement() {
  const [students, setStudents] = useState<OfficialCardStudent[]>([]);
  const [cards, setCards] = useState<IdCardRecord[]>([]);
  const [query, setQuery] = useState("");
  const [classLevel, setClassLevel] = useState("all");
  const [section, setSection] = useState("all");
  const [academicYear, setAcademicYear] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<OfficialCardStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(""); setUnavailable(false);
    try {
      const [studentData, cardData] = await Promise.all([
        adminRequest<ApiData>(`id-cards/students?q=${encodeURIComponent(query)}&classLevel=${encodeURIComponent(classLevel)}&section=${encodeURIComponent(section)}&academicYear=${encodeURIComponent(academicYear)}&page=1&pageSize=50`),
        adminRequest<ApiData>(`id-cards?academicYear=${encodeURIComponent(academicYear)}&page=1&pageSize=50`),
      ]);
      setStudents((studentData.students ?? []).filter(isEligibleForCard)); setCards(cardData.cards ?? []);
    } catch (cause) {
      setStudents([]); setCards([]);
      const e = cause instanceof AdminApiError ? cause : new AdminApiError("The school service could not be reached.", 0, "NETWORK_ERROR");
      setError(e.message); setUnavailable(e.status === 503 || e.code === "NOT_CONFIGURED");
    } finally { setLoading(false); }
  }, [query, classLevel, section, academicYear]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelected([]); }, [query, classLevel, section, academicYear]);
  const years = useMemo(() => Array.from(new Set([...students.map(s => s.academicYear), ...cards.map(c => c.academicYear)])).sort().reverse(), [students, cards]);
  const sections = useMemo(() => Array.from(new Set(students.filter(s => classLevel === "all" || s.className === `Class ${classLevel}` || s.className === classLevel).map(s => s.section))).sort(), [students, classLevel]);
  const activeFor = (student: OfficialCardStudent) => cards.find(card => card.studentRecordId === student.id && card.academicYear === student.academicYear && card.status === "active");
  const selectable = students.filter(s => !activeFor(s));
  const toggle = (id: string, checked: boolean) => setSelected(old => checked ? [...new Set([...old, id])] : old.filter(v => v !== id));
  const printPreview = () => { if (preview) window.print(); };
  return <section className="admin-idcards">
    <div className="admin-alert"><span className="admin-alert-icon">i</span><div><strong>{unavailable ? "Card service not configured" : "Official records only"}</strong><p>{unavailable ? "Generation, reprint, revocation, photo changes and QR verification remain disabled until the trusted backend is configured. No card records were fabricated." : "Only verified, currently enrolled students returned by the school backend can be selected. Issuance must be confirmed by the server."}</p></div></div>
    <div className="admin-idcards-toolbar">
      <label className="admin-search-label">Search student<input className="admin-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name or official GR/Seat Number" /></label>
      <label className="admin-filter-label">Class<select className="admin-search" value={classLevel} onChange={e => setClassLevel(e.target.value)}><option value="all">All classes</option>{Array.from({length:8},(_,i)=>String(i+1)).map(n=><option key={n} value={n}>Class {n}</option>)}</select></label>
      <label className="admin-filter-label">Section<select className="admin-search" value={section} onChange={e => setSection(e.target.value)}><option value="all">All sections</option>{sections.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="admin-filter-label">Academic year<select className="admin-search" value={academicYear} onChange={e => setAcademicYear(e.target.value)}><option value="all">All years</option>{years.map(y=><option key={y}>{y}</option>)}</select></label>
      <button className="admin-button admin-button-light" onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Refresh records"}</button>
    </div>
    <div className="admin-idcards-actions"><span>{selected.length} selected · {students.length} eligible records loaded</span><button className="admin-button" disabled title="Card issuance is unavailable until the trusted backend mutation is implemented">Generate selected cards (unavailable)</button><button className="admin-button admin-button-light" disabled={!preview} onClick={printPreview}>Print preview</button></div>
    {error && <p className="admin-idcards-error" role="alert">{error}</p>}
    {loading ? <div className="admin-panel admin-loading" role="status">Loading verified student records…</div> : unavailable ? <EmptyState title="Connect the secure card service" text="This workspace is ready to use the documented ID-card API. Until server-side authentication, student verification, audit logging and token issuance are connected, all record-changing controls remain unavailable." /> : students.length === 0 ? <EmptyState title="No eligible student records returned" text="No sample students are shown. Verify official student records and backend configuration, then refresh." /> : <div className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th><span className="sr-only">Select</span></th><th>Student</th><th>GR / Seat Number</th><th>Class / Section</th><th>Academic year</th><th>Card status</th><th>Actions</th></tr></thead><tbody>{students.map(student=>{const active=activeFor(student);return <tr key={student.id}><td><input type="checkbox" aria-label={`Select ${student.name}`} checked={selected.includes(student.id)} disabled={Boolean(active)} onChange={e=>toggle(student.id,e.target.checked)} /></td><td>{student.name}</td><td>{student.officialIdentifier}</td><td>{student.className} · {student.section}</td><td>{student.academicYear}</td><td><span className="admin-card-status">{active ? "Active card" : "No active card"}</span></td><td><button className="admin-table-action" onClick={()=>setPreview(student)}>Preview</button>{active&&<button className="admin-table-action" disabled title="Requires configured replacement API">Reprint / replace</button>}</td></tr>})}</tbody></table></div><p className="admin-small-muted">Results are server-paginated (50 per request). Selection is limited to the currently loaded page.</p></div>}
    {preview && <div className="admin-panel admin-card-preview-panel"><div className="admin-panel-heading"><div><h2>Print preview</h2><p>Preview uses only verified backend fields; missing school branding is labelled.</p></div><button className="admin-button admin-button-light" onClick={()=>setPreview(null)}>Close</button></div><div className="official-id-card" id="official-id-card"><div className="official-id-front"><header><div className="official-logo-placeholder">Logo<br/>placeholder</div><div><strong>Official school name</strong><small>School name provided by authorized settings</small></div></header><div className="official-card-main"><div className="official-photo-placeholder">Authorized<br/>photo unavailable</div><div className="official-card-details"><h3>{preview.name}</h3><p><span>GR / Seat Number</span><b>{preview.officialIdentifier}</b></p><p><span>Class / Section</span><b>{preview.className} · {preview.section}</b></p><p><span>Academic year</span><b>{preview.academicYear}</b></p></div></div><footer>Preview only · Not an issued or verified card</footer></div><div className="official-id-back"><header><strong>Card information</strong><small>Back of card</small></header><p>School contact details have not been configured by an authorized administrator.</p><p>If found, please return this card to the school office.</p><div className="official-qr-placeholder">QR verification unavailable<br/><small>Requires secure backend token</small></div><footer>Do not use as official identification until issued by the school.</footer></div></div><p className="admin-small-muted">Printing is for layout review only. It does not issue a card, create a PDF download, or create a QR token.</p></div>}
    <div className="admin-note"><strong>Security note:</strong> QR issuance, public verification, photo upload, revocation, replacement and batch PDF generation are unavailable until the server-side Google Apps Script operations are implemented. Do not manually encode student numbers into QR codes.</div>
  </section>;
}
