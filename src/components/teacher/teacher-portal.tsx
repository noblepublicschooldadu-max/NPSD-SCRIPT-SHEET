"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TEACHER_SECTIONS, validateAttendanceBatch, validateMarks, type AttendanceStatus } from "@/lib/teacher/contracts";
import { teacherRequest, TeacherApiError } from "@/lib/teacher/service";
import { enqueueAttendance, listQueuedAttendance, removeQueuedAttendance, updateQueuedAttendance, type QueuedAttendance } from "@/lib/attendance/offline-queue";
import { createAttendanceOperationId, validateSchoolDate } from "@/lib/attendance/contracts";
import { validateAssignmentDates, type AssignmentRecord } from "@/lib/homework/contracts";
import { validateMarksEntry, uniqueMarkStudentIds } from "@/lib/examinations/contracts";
import { NoticeFeed } from "@/components/notices/notice-feed";
import { useLanguage } from "@/components/language-provider";

type SectionSlug = typeof TEACHER_SECTIONS[number]["slug"];
type LiveData = Record<string, unknown>;
const sectionCopy: Record<string, { title: string; subtitle: string; operation: string }> = {
  "": { title: "Teacher dashboard", subtitle: "Your teaching day at a glance, using school records only.", operation: "dashboard" },
  classes: { title: "My classes", subtitle: "Only classes and subjects assigned to your authenticated staff account.", operation: "classes" },
  timetable: { title: "My timetable", subtitle: "Published periods returned for your authenticated teacher session only.", operation: "timetable" },
  attendance: { title: "Attendance", subtitle: "Review the authorized roster, mark each status explicitly, then review before submission.", operation: "attendance" },
  homework: { title: "Homework & assignments", subtitle: "Create and manage assignments only for your assigned classes and subjects.", operation: "homework" },
  examinations: { title: "Examinations", subtitle: "Review assigned examinations and enter marks within configured limits.", operation: "examinations" },
  results: { title: "Marks & results", subtitle: "Review marks and submission status. Final results are controlled by authorized staff.", operation: "results" },
  notices: { title: "School notices", subtitle: "Published school announcements and teacher-specific information.", operation: "notices" },
  profile: { title: "My profile", subtitle: "View your authenticated staff profile and approved account settings.", operation: "profile" },
};
function humanize(code: string) { return code.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function TeacherPortal({ sectionPath = [] }: { sectionPath?: string[] }) {
  const { locale } = useLanguage();
  const section = sectionPath[0] ?? "";
  const known = Object.prototype.hasOwnProperty.call(sectionCopy, section);
  const copy = known ? sectionCopy[section] : { title: "Page not found", subtitle: "Choose a teacher portal section from the navigation.", operation: "dashboard" };
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code: string; status: number } | null>(null);
  const [data, setData] = useState<LiveData | null>(null);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examId, setExamId] = useState("");
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [homeworkInstructions, setHomeworkInstructions] = useState("");
  const [homeworkStatus, setHomeworkStatus] = useState<"draft"|"published">("draft");
  const [homeworkQuery, setHomeworkQuery] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewAttendance, setReviewAttendance] = useState(false);
  const [reviewMarks, setReviewMarks] = useState(false);
  const [confirmedMarks, setConfirmedMarks] = useState(false);
  const [maxMarks, setMaxMarks] = useState("100");
  const [isOnline, setIsOnline] = useState(true);
  const [queuedBatches, setQueuedBatches] = useState<QueuedAttendance[]>([]);

  useEffect(() => {
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    const online = () => { setIsOnline(true); setQueuedBatches(listQueuedAttendance()); };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);
  useEffect(() => { setQueuedBatches(listQueuedAttendance()); }, []);
  const load = useCallback(async () => {
    setLoading(true); setError(null); setMessage("");
    try {
      const params = new URLSearchParams();
      if (classId) params.set("classId", classId);
      if (date) params.set("date", date);
      const suffix = params.size ? `?${params.toString()}` : "";
      const result = await teacherRequest<LiveData>(`${copy.operation}${suffix}`);
      setData(result);
    } catch (cause) {
      const e = cause instanceof TeacherApiError ? cause : new TeacherApiError("The school service is unavailable.", 0, "UNAVAILABLE");
      setData(null); setError({ message: e.message, code: e.code, status: e.status });
    } finally { setLoading(false); }
  }, [classId, copy.operation, date]);
  useEffect(() => { void load(); }, [load]);

  const nav = useMemo(() => TEACHER_SECTIONS.map((item) => ({ ...item, href: item.slug ? `/teacher/${item.slug}` : "/teacher", active: item.slug === section })), [section]);
  const roster = Array.isArray(data?.students) ? data.students as Array<{ studentId: string; name: string; grNumber?: string }> : [];
  const assignedClasses = Array.isArray(data?.classes) ? data.classes as Array<{ classId: string; label: string; section?: string; sectionId?: string; subjects?: string[] }> : [];
  const assignedSubjects = Array.isArray(data?.subjects) ? data.subjects as Array<{ subjectId: string; name: string }> : [];
  const assignments = Array.isArray(data?.assignments) ? data.assignments.filter((item): item is AssignmentRecord => Boolean(item) && typeof item === "object" && typeof (item as AssignmentRecord).id === "string" && typeof (item as AssignmentRecord).title === "string") : [];
  const filteredAssignments = assignments.filter((item) => `${item.title} ${item.subject ?? ""} ${item.className ?? ""}`.toLowerCase().includes(homeworkQuery.toLowerCase()));
  const filteredRoster = roster.filter((student) => `${student.name} ${student.grNumber ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const selectedCount = Object.keys(attendance).length;
  const statuses: Array<{ value: AttendanceStatus; label: string }> = [{ value: "present", label: "Present" }, { value: "absent", label: "Absent" }, { value: "late", label: "Late" }, { value: "excused", label: "Excused" }];

  async function loadExamRoster() {
    if (!examId || !classId || !subjectId) { setMessage("Select an examination, assigned class and subject."); return; }
    setLoading(true); setError(null); setMessage("");
    try { const p = new URLSearchParams({ classId }); const result = await teacherRequest<LiveData>(`examinations/${examId}/subjects/${subjectId}/roster?${p.toString()}`); setData(result); }
    catch (cause) { const e = cause instanceof TeacherApiError ? cause : new TeacherApiError("The school service is unavailable.",0,"UNAVAILABLE"); setError({message:e.message,code:e.code,status:e.status}); setData(null); }
    finally { setLoading(false); }
  }

  async function submit(operation: string, body: unknown) {
    if (busy) return;
    setBusy(true); setMessage("");
    let queuedOperationId = "";
    try {
      let payload = body as Record<string, unknown>;
      if (operation === "attendance/batch") {
        const batch = { ...(body as { classId: string; date: string; entries: Array<{studentId: string; status: AttendanceStatus}> }), operationId: createAttendanceOperationId() };
        const dateError = validateSchoolDate(batch.date);
        if (dateError) { setMessage(dateError); return; }
        payload = batch;
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          enqueueAttendance(batch); setQueuedBatches(listQueuedAttendance()); setReviewAttendance(false);
          setMessage("Saved in this page's temporary memory — not yet synced to the school server. Do not close or refresh this page; pending work will be lost.");
          return;
        }
        queuedOperationId = batch.operationId;
      }
      await teacherRequest(operation, { method: "POST", body: JSON.stringify(payload) });
      if (queuedOperationId) removeQueuedAttendance(queuedOperationId);
      setQueuedBatches(listQueuedAttendance()); setReviewAttendance(false); setReviewMarks(false); await load(); setMessage("The school service confirmed the save.");
    } catch (cause) {
      const e = cause instanceof TeacherApiError ? cause : new TeacherApiError("The school service is unavailable.", 0, "UNAVAILABLE");
      if (operation === "attendance/batch" && e.code === "NETWORK_ERROR") {
        const payload = body as {classId:string;date:string;entries:Array<{studentId:string;status:AttendanceStatus}>};
        const batch = { ...payload, operationId: queuedOperationId || (createAttendanceOperationId()) };
        enqueueAttendance(batch); setQueuedBatches(listQueuedAttendance()); setReviewAttendance(false);
        setMessage("Connection failed. Attendance changes are held in temporary page memory and are NOT synced. Check batch status before retrying; do not refresh or close this page.");
      } else setMessage(`${e.message} No success was recorded.`);
    } finally { setBusy(false); }
  }

  async function retryQueuedBatch(item: QueuedAttendance) {
    if (busy || !isOnline) return;
    setBusy(true); setMessage(""); updateQueuedAttendance(item.batch.operationId, { state: "syncing" }); setQueuedBatches(listQueuedAttendance());
    try {
      const status = await teacherRequest<{ status: string }>(`attendance/batch-status?operationId=${encodeURIComponent(item.batch.operationId)}`);
      if (status.status === "saved" || status.status === "committed") {
        removeQueuedAttendance(item.batch.operationId); setMessage("Server confirmed this batch was already saved."); setQueuedBatches(listQueuedAttendance()); return;
      }
      if (status.status === "conflict") throw new TeacherApiError("Attendance changed on the server. Review the latest records before retrying.", 409, "CONFLICT");
      await teacherRequest("attendance/batch", { method: "POST", body: JSON.stringify(item.batch) });
      removeQueuedAttendance(item.batch.operationId); setQueuedBatches(listQueuedAttendance()); setMessage("The school service confirmed the queued batch.");
    } catch (cause) {
      const e = cause instanceof Error ? cause : new Error("Retry failed.");
      updateQueuedAttendance(item.batch.operationId, { state: "failed", lastError: e.message }); setQueuedBatches(listQueuedAttendance());
      setMessage(`Pending batch was not confirmed: ${e.message}. It remains in temporary memory only.`);
    } finally { setBusy(false); }
  }

  return <div className="teacher-app">
    {menuOpen && <button aria-label="Close navigation overlay" className="teacher-backdrop" onClick={() => setMenuOpen(false)} />}
    <aside className={`teacher-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Teacher navigation">
      <Link href="/teacher" className="teacher-brand" onClick={() => setMenuOpen(false)}><span className="teacher-brand-mark">S</span><span><strong>SEF School</strong><small>Teacher portal</small></span></Link>
      <p className="teacher-nav-label">TEACHING WORKSPACE</p>
      <nav className="teacher-nav">{nav.map((item) => <Link key={item.slug} href={item.href} onClick={() => setMenuOpen(false)} className={`teacher-nav-link ${item.active ? "active" : ""}`} aria-current={item.active ? "page" : undefined}><span className="teacher-nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</nav>
      <div className="teacher-sidebar-foot"><span className="teacher-status-dot" /> School records only · no demo data</div>
    </aside>
    <main className="teacher-main">
      <header className="teacher-topbar"><button className="teacher-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation">☰ <span>Menu</span></button><div className="teacher-breadcrumb"><span>Teacher portal</span><span aria-hidden="true">/</span><strong>{section === "notices" ? (locale === "ur" ? "اسکول کے اعلانات" : locale === "sd" ? "اسڪول جا اعلان" : copy.title) : copy.title}</strong></div><div className="teacher-top-right"><span className="teacher-session-pill">● Auth required</span><Link href="/login" className="teacher-account-link">Sign in</Link></div></header>
      <div className="teacher-content">
        <div className="teacher-page-heading"><div><p className="teacher-eyebrow">SEF PRIMARY SCHOOL · CLASSES 1–8</p><h1>{section === "notices" ? (locale === "ur" ? "اسکول کے اعلانات" : locale === "sd" ? "اسڪول جا اعلان" : copy.title) : copy.title}</h1><p>{section === "notices" ? (locale === "ur" ? "اساتذہ کے لیے منظور شدہ شائع شدہ اعلانات۔" : locale === "sd" ? "استادن لاءِ منظور ٿيل شايع ٿيل اعلان." : copy.subtitle) : copy.subtitle}</p></div><button className="teacher-button teacher-button-light" onClick={() => void load()} disabled={loading}>↻ Refresh</button></div>
        {error && <div className="teacher-alert" role="status"><span className="teacher-alert-icon">!</span><div><strong>{error.code === "NOT_CONFIGURED" || error.status === 503 ? "School backend not configured" : error.code === "SESSION_EXPIRED" || error.status === 401 ? "Please sign in again" : "Unable to load school data"}</strong><p>{error.message}</p><p>Protected information and write actions remain unavailable until the backend confirms your identity and permissions.</p></div></div>}
        {message && <div className="teacher-feedback" role="status">{message}</div>}
        <div className="teacher-feedback" role="status">Network: {isOnline ? "online" : "offline"} · Offline attendance uses temporary memory only; it is lost on refresh or close.</div>
        {queuedBatches.length > 0 && <div className="teacher-confirm-panel"><strong>Unsynced attendance batches: {queuedBatches.length}</strong><p>These changes are not saved to the school server. Check each operation status before retrying to avoid overwriting newer records.</p>{queuedBatches.map((item) => <div key={item.batch.operationId} className="teacher-list-row"><div><strong>{item.batch.date} · {item.batch.entries.length} statuses</strong><p>{item.state === "syncing" ? "Syncing…" : item.state === "failed" ? item.lastError || "Retry failed" : "Saved on this device — not yet synced"}</p></div><button className="teacher-button teacher-button-light" disabled={busy || !isOnline} onClick={() => void retryQueuedBatch(item)}>Check status & retry</button></div>)}</div>}
        {loading ? <div className="teacher-state-card" aria-live="polite"><span className="teacher-state-icon">◌</span><strong>Loading school records…</strong><p>Fetching only records for the current teacher session.</p></div> : error ? <div className="teacher-state-card"><span className="teacher-state-icon">⌁</span><h2>No records loaded</h2><p>No sample classes, students, timetable, attendance or assignments are shown. Retry after the authorized school API is configured.</p><button className="teacher-button" onClick={() => void load()}>Try again</button></div> : <>
          {section === "" && <>
            <div className="teacher-welcome"><div><span className="teacher-welcome-label">YOUR TEACHING SPACE</span><h2>{typeof data?.teacherName === "string" ? `Welcome, ${data.teacherName}` : "Welcome to your teaching space"}</h2><p>Today’s overview is based on the records linked to your account.</p></div><div className="teacher-welcome-mark" aria-hidden="true">✦</div></div>
            <div className="teacher-metric-grid">{[{ label: "Assigned classes", key: "assignedClassCount", icon: "▦" }, { label: "Assigned subjects", key: "assignedSubjectCount", icon: "▤" }, { label: "Pending tasks", key: "pendingTaskCount", icon: "◷" }, { label: "Upcoming exams", key: "upcomingExamCount", icon: "▣" }].map((metric) => <div className="teacher-metric" key={metric.key}><span>{metric.icon}</span><small>{metric.label}</small><strong>{typeof data?.[metric.key] === "number" ? String(data[metric.key]) : "—"}</strong><em>{typeof data?.[metric.key] === "number" ? "From school records" : "Not available"}</em></div>)}</div>
            <div className="teacher-panel-grid"><Panel title="Today’s timetable" subtitle="Only if the school timetable is configured" empty={!Array.isArray(data?.timetable) || !(data.timetable as unknown[]).length} emptyText="No timetable entries returned."/><Panel title="Today’s attendance" subtitle="Your authorized class records" empty={!data?.todayAttendance} emptyText="Attendance status is not available."/><Panel title="Pending work" subtitle="Homework and marking tasks" empty={!Array.isArray(data?.pendingTasks) || !(data.pendingTasks as unknown[]).length} emptyText="No pending tasks returned."/><Panel title="School notices" subtitle="Published announcements" empty={!Array.isArray(data?.notices) || !(data.notices as unknown[]).length} emptyText="No published notices returned."/></div>
          </>}
          {section === "timetable" && <div className="teacher-panel"><PanelHeader title="My published timetable" subtitle="The server must derive your teacher identity from the authenticated session; this page does not submit a teacher ID."/>{Array.isArray(data?.timetable) && (data.timetable as Array<Record<string, unknown>>).filter(item => item.status === "published").length ? <div className="teacher-timetable-grid">{(data.timetable as Array<Record<string, unknown>>).filter(item => item.status === "published").sort((a,b)=>String(a.day||"").localeCompare(String(b.day||""))||String(a.startTime||"").localeCompare(String(b.startTime||""))).map((item,index)=><article className="teacher-timetable-card" key={String(item.id||`${item.day}-${item.period}-${index}`)}><div><strong>{String(item.day||"Day not specified")} · Period {String(item.period||"—")}</strong><small>{String(item.startTime||"—")}–{String(item.endTime||"—")}</small></div><p>{item.kind==="break"?String(item.label||"Break"):item.kind==="non_teaching"?String(item.label||"Non-teaching period"):String(item.subjectName||item.subject||"Subject not specified")}</p><span>{String(item.className||item.classLabel||item.classId||"Class")} · {String(item.sectionName||item.section||"Section not specified")}</span>{Boolean(item.room)&&<small>Room: {String(item.room)}</small>}</article>)}</div>:<Empty title="No published timetable" detail="Your timetable will appear after the school publishes verified entries for your authorized assignments. Drafts and other teachers' schedules are not shown."/>}<p className="teacher-note">Timetable access is read-only. Class/subject assignment checks and teacher identity enforcement must run on the server.</p></div>}
          {section === "classes" && <><Toolbar query={query} setQuery={setQuery} placeholder="Search classes or student name / GR number"/><div className="teacher-panel"><PanelHeader title="Assigned classes and sections" subtitle="Assignment list is supplied by the authenticated backend."/>{assignedClasses.length ? assignedClasses.map((item) => <div className="teacher-list-row" key={item.classId}><span className="teacher-list-icon">▦</span><div><strong>{item.label}</strong><p>{item.section ? `Section ${item.section}` : "Section not specified"} · {(item.subjects ?? []).join(", ") || "Subjects not specified"}</p></div></div>) : <Empty title="No assigned classes returned" detail="Ask the school administrator to verify your staff-to-class assignments."/>}<div className="teacher-note">Student roster is loaded only for a selected authorized class. Personal and guardian details are intentionally not displayed here.</div></div></>}
          {section === "attendance" && <><div className="teacher-toolbar"><label>Assigned class<select className="teacher-field" value={classId} onChange={(e) => { setClassId(e.target.value); setAttendance({}); setReviewAttendance(false); }}><option value="">Select class</option>{assignedClasses.map((item) => <option key={item.classId} value={item.classId}>{item.label}{item.section ? ` · ${item.section}` : ""}</option>)}</select></label><label>Date<input className="teacher-field" type="date" value={date} onChange={(e) => { setDate(e.target.value); setAttendance({}); setReviewAttendance(false); }}/></label><button className="teacher-button teacher-button-light" onClick={() => void load()} disabled={loading}>Load roster</button></div><div className="teacher-panel"><PanelHeader title="Attendance register" subtitle="Unmarked students remain unmarked. No absence is inferred."/><div className="teacher-inline-stats"><span>Roster <strong>{roster.length}</strong></span><span>Marked <strong>{selectedCount}</strong></span><span>Unmarked <strong>{Math.max(0, roster.length - selectedCount)}</strong></span></div>{!classId || !date ? <Empty title="Choose a class and date" detail="Only class assignments authorized by the school backend can be selected."/> : !roster.length ? <Empty title="No authorized roster loaded" detail="The school API must return the selected class roster before attendance can be entered."/> : <><div className="teacher-attendance-actions"><button className="teacher-button teacher-button-light" onClick={() => setAttendance(Object.fromEntries(roster.map((student) => [student.studentId, "present"] as const)))}>Mark all present</button><span>Review each entry before submitting.</span></div><div className="teacher-roster">{filteredRoster.map((student) => <div className="teacher-roster-row" key={student.studentId}><div><strong>{student.name}</strong><small>GR / Seat No: {student.grNumber || "Not provided"}</small></div><label className="teacher-status-select"><span className="sr-only">Attendance status for {student.name}</span><select className="teacher-field" value={attendance[student.studentId] ?? ""} onChange={(e) => setAttendance((old) => ({ ...old, [student.studentId]: e.target.value as AttendanceStatus }))}><option value="">Unmarked</option>{statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label></div>)}</div>{reviewAttendance ? <div className="teacher-confirm-panel"><strong>Review attendance submission</strong><p>{selectedCount} explicit statuses for {date}. Unmarked students will not be silently set to absent.</p><button className="teacher-button" disabled={busy || !selectedCount} onClick={() => void submit("attendance/batch", { classId, date, entries: Object.entries(attendance).map(([studentId, status]) => ({ studentId, status })) })}>{busy ? "Submitting…" : "Confirm and submit"}</button><button className="teacher-button teacher-button-light" onClick={() => setReviewAttendance(false)} disabled={busy}>Go back</button></div> : <button className="teacher-button" disabled={!selectedCount || busy} onClick={() => { const validation = validateAttendanceBatch(Object.entries(attendance).map(([studentId, status]) => ({ studentId, status }))) ?? validateSchoolDate(date); if (validation) setMessage(validation); else setReviewAttendance(true); }}>Review submission ({selectedCount})</button>}</>}</div></>}
          {section === "homework" && <><div className="teacher-panel"><PanelHeader title="Create assignment" subtitle="The server must validate class and subject assignment before saving."/><form className="teacher-form" onSubmit={(e) => { e.preventDefault(); const dateError = validateAssignmentDates(date, dueDate); if (!classId || !subjectId || !homeworkTitle.trim() || !homeworkInstructions.trim() || dateError) { setMessage(dateError || "Enter a title, instructions, assigned class and subject."); return; } if (homeworkStatus === "published" && !window.confirm("Publish this assignment to students in the selected class and section?")) return; void submit("homework", { title: homeworkTitle.trim(), instructions: homeworkInstructions.trim(), classId, subjectId, assignedDate: date, dueDate, status: homeworkStatus, idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}` }); }}><label>Title<input className="teacher-field" value={homeworkTitle} onChange={(e) => setHomeworkTitle(e.target.value)} maxLength={160} required/></label><label>Assigned class<select className="teacher-field" value={classId} onChange={(e) => setClassId(e.target.value)} required><option value="">Select class</option>{assignedClasses.map((item) => <option key={item.classId} value={item.classId}>{item.label}</option>)}</select></label><label>Subject<select className="teacher-field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required><option value="">Select subject</option>{assignedSubjects.map((item) => <option key={item.subjectId} value={item.subjectId}>{item.name}</option>)}</select></label><label>Assigned date<input className="teacher-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} required/></label><label>Due date<input className="teacher-field" type="date" min={date || undefined} value={dueDate} onChange={(e) => setDueDate(e.target.value)} required/></label><label>Status<select className="teacher-field" value={homeworkStatus} onChange={(e) => setHomeworkStatus(e.target.value as "draft"|"published")}><option value="draft">Save as draft</option><option value="published">Publish to students</option></select></label><label className="teacher-form-wide">Instructions<textarea className="teacher-field" rows={4} value={homeworkInstructions} onChange={(e) => setHomeworkInstructions(e.target.value)} maxLength={5000} required/></label><div className="teacher-form-wide teacher-homework-preview"><strong>Preview</strong><h3>{homeworkTitle.trim() || "Assignment title"}</h3><p>{homeworkInstructions.trim() || "Assignment instructions will appear here."}</p><small>{subjectId ? assignedSubjects.find(x=>x.subjectId===subjectId)?.name || "Selected subject" : "Subject not selected"} · Due {dueDate || "date not selected"} · {homeworkStatus}</small></div><button className="teacher-button" disabled={busy}>{busy ? "Saving…" : homeworkStatus === "published" ? "Confirm & publish" : "Save draft"}</button></form></div><div className="teacher-panel"><PanelHeader title="Existing assignments" subtitle="Only persisted records returned by the authorized backend are shown."/><label className="teacher-homework-search">Search assignments<input className="teacher-field" value={homeworkQuery} onChange={e=>setHomeworkQuery(e.target.value)} placeholder="Title, subject or class"/></label>{filteredAssignments.length ? <div className="teacher-homework-list">{filteredAssignments.map(item=><article key={item.id}><div><strong>{item.title}</strong><p>{item.subject || "Subject not returned"} · {item.className || item.classId || "Class not returned"}{item.section ? ` · ${item.section}` : ""}</p><small>Assigned {item.assignedDate || "—"} · Due {item.dueDate || "—"}</small></div><span className="teacher-homework-status">{item.status || "Status unavailable"}</span></article>)}</div> : <Empty title="No assignments returned" detail={error ? "The service did not return assignment records. Check the connection and try again." : "No assignments match this search, or the connected service returned an empty list. No sample assignments are shown."}/>}</div></>}
          {section === "examinations" && <><div className="teacher-panel"><PanelHeader title="Assigned examinations" subtitle="Only examinations returned for your authenticated teacher assignment are eligible."/><div className="teacher-toolbar"><label>Examination ID<input className="teacher-field" value={examId} onChange={e=>setExamId(e.target.value)} placeholder="Use ID from assigned examination list"/></label><label>Class<select className="teacher-field" value={classId} onChange={e=>{setClassId(e.target.value);setMarks({});}}><option value="">Select assigned class</option>{assignedClasses.map(x=><option key={x.classId} value={x.classId}>{x.label}</option>)}</select></label><label>Subject<select className="teacher-field" value={subjectId} onChange={e=>{setSubjectId(e.target.value);setMarks({});}}><option value="">Select assigned subject</option>{assignedSubjects.map(x=><option key={x.subjectId} value={x.subjectId}>{x.name}</option>)}</select></label><button className="teacher-button teacher-button-light" onClick={()=>void loadExamRoster()} disabled={loading||!examId||!classId||!subjectId}>Load authorized roster</button></div><div className="teacher-note">The server must return the assigned exam, configured maximum marks and eligible roster. Do not enter a maximum marks value in the browser as a substitute for official exam configuration.</div>{!examId||!classId||!subjectId?<Empty title="Select an assigned examination" detail="Choose the exam ID, class and subject from records provided by the school backend."/>:!roster.length?<Empty title="No authorized roster returned" detail={error?"The school service is unavailable; marks cannot be entered.":"The service has not returned a verified roster for this exam, class and subject."}/>:<><div className="teacher-inline-stats"><span>Students <strong>{roster.length}</strong></span><span>Entered <strong>{Object.values(marks).filter(v=>v!=="").length}</strong></span><span>Incomplete <strong>{roster.length-Object.values(marks).filter(v=>v!=="").length}</strong></span></div><div className="teacher-roster">{filteredRoster.map(student=><div className="teacher-roster-row" key={student.studentId}><div><strong>{student.name}</strong><small>GR / Seat No: {student.grNumber||"Not provided"}</small></div><label className="teacher-status-select"><span className="sr-only">Marks for {student.name}</span><input className="teacher-field" type="number" min="0" max={typeof data?.maximumMarks==="number"?data.maximumMarks:undefined} value={marks[student.studentId]??""} onChange={e=>setMarks(old=>({...old,[student.studentId]:e.target.value}))} placeholder="Leave blank if missing"/></label></div>)}</div><p className="teacher-helper">Maximum marks: {typeof data?.maximumMarks==="number"?data.maximumMarks:"Not returned by backend"}. Blank marks remain missing, never converted to zero.</p><div className="teacher-attendance-actions"><button className="teacher-button teacher-button-light" disabled={busy||typeof data?.maximumMarks!=="number"||!roster.length} onClick={()=>{const entries=roster.map(st=>({studentId:st.studentId,obtainedMarks:marks[st.studentId]===""||marks[st.studentId]===undefined?null:Number(marks[st.studentId])}));const invalid=entries.map(e=>validateMarksEntry(e.obtainedMarks,Number(data?.maximumMarks))).find(Boolean);if(invalid){setMessage(invalid);return}if(!uniqueMarkStudentIds(entries)){setMessage("Duplicate or invalid student identifiers were returned.");return}setReviewMarks(true)}}>Review marks batch</button></div>{reviewMarks&&<div className="teacher-confirm-panel"><strong>Review marks submission</strong><p>{Object.values(marks).filter(v=>v!=="").length} entries filled; {roster.length-Object.values(marks).filter(v=>v!=="").length} remain missing. Confirm whether to save draft or submit for Admin review.</p><button className="teacher-button teacher-button-light" disabled={busy} onClick={()=>void submit(`examinations/${examId}/subjects/${subjectId}/marks/batch`,{classId,entries:roster.map(st=>({studentId:st.studentId,obtainedMarks:marks[st.studentId]===""||marks[st.studentId]===undefined?null:Number(marks[st.studentId])})),expectedVersion:data?.version,idempotencyKey:crypto.randomUUID(),action:"draft"})}>Save draft</button><button className="teacher-button" disabled={busy} onClick={()=>{if(!window.confirm("Submit this marks batch to Admin review? It will not publish student results."))return;void submit(`examinations/${examId}/subjects/${subjectId}/marks/batch`,{classId,entries:roster.map(st=>({studentId:st.studentId,obtainedMarks:marks[st.studentId]===""||marks[st.studentId]===undefined?null:Number(marks[st.studentId])})),expectedVersion:data?.version,idempotencyKey:crypto.randomUUID(),action:"submit"})}}>Submit for review</button><button className="teacher-button teacher-button-light" onClick={()=>setReviewMarks(false)} disabled={busy}>Cancel</button></div>}</>}</div></>}
          {section === "results" && <div className="teacher-panel"><PanelHeader title="Marks and results status" subtitle="Review the status of your permitted marks batches; only Admins may approve and publish final results."/><div className="teacher-toolbar"><label>Examination ID<input className="teacher-field" value={examId} onChange={e=>setExamId(e.target.value)}/></label><label>Class<select className="teacher-field" value={classId} onChange={e=>setClassId(e.target.value)}><option value="">All assigned classes</option>{assignedClasses.map(x=><option key={x.classId} value={x.classId}>{x.label}</option>)}</select></label><button className="teacher-button teacher-button-light" onClick={()=>void load()} disabled={loading}>Refresh status</button></div>{Array.isArray(data?.resultSets)&&data.resultSets.length?<div className="teacher-homework-list">{(data.resultSets as Array<{id:string;examName?:string;subjectName?:string;status?:string;submittedCount?:number;eligibleCount?:number}>).map(r=><article key={r.id}><div><strong>{r.examName||"Examination"}</strong><p>{r.subjectName||"Subject not returned"} · {r.submittedCount??"—"}/{r.eligibleCount??"—"} entries</p></div><span className="teacher-homework-status">{r.status||"Status unavailable"}</span></article>)}</div>:<Empty title="Marks status unavailable" detail={error?"The school API did not return a usable result status.":"No permitted marks batches were returned for your account. No sample status is shown."}/>}<p className="teacher-note">Final result calculation, approval and publication remain server-authorized. Teachers cannot publish results through this portal.</p></div>}
          {section === "notices" && <div className="teacher-panel"><PanelHeader title={locale === "ur" ? "شائع شدہ اسکول اعلانات" : locale === "sd" ? "شايع ٿيل اسڪول جا اعلان" : "Published school notices"} subtitle={locale === "ur" ? "صرف تصدیق شدہ استاد کے لیے مجاز اعلانات دکھائے جاتے ہیں۔" : locale === "sd" ? "صرف تصديق ٿيل استاد لاءِ مجاز اعلان ڏيکاريا وڃن ٿا." : "Only notices authorized for the authenticated teacher are eligible to display."}/><NoticeFeed items={Array.isArray(data?.notices) ? data.notices : []} scope="teacher" classIds={assignedClasses.map(item=>item.classId)} sectionIds={assignedClasses.map(item=>String(item.sectionId || "")).filter(Boolean)}/></div>}
          {section === "profile" && <div className="teacher-panel"><PanelHeader title="My staff profile" subtitle="Only the authenticated teacher's record may be returned."/><Empty title="Profile not available" detail="Sign-in and the backend session/profile operation are not configured. Official staff identifiers, roles and account status can only be changed through Admin approval."/><Link className="teacher-button teacher-button-light teacher-inline-link" href="/login">Go to sign in</Link></div>}
          {!known && <div className="teacher-panel"><Empty title="Section not found" detail="Select one of the available Teacher Portal routes."/></div>}
        </>}
        <footer className="teacher-page-foot">SEF Primary School Management System · Teacher workspace · Protected data requires server-side role and assignment checks.</footer>
      </div>
    </main>
  </div>;
}

function Panel({ title, subtitle, empty, emptyText }: { title: string; subtitle: string; empty: boolean; emptyText: string }) { return <section className="teacher-panel"><PanelHeader title={title} subtitle={subtitle}/>{empty ? <Empty title="Nothing to show yet" detail={emptyText}/> : <p className="teacher-helper">Live records loaded from the school service.</p>}</section>; }
function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) { return <div className="teacher-panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>; }
function Empty({ title, detail }: { title: string; detail: string }) { return <div className="teacher-empty"><span aria-hidden="true">◇</span><strong>{title}</strong><p>{detail}</p></div>; }
function Toolbar({ query, setQuery, placeholder }: { query: string; setQuery: (value: string) => void; placeholder: string }) { return <div className="teacher-toolbar"><label className="teacher-search-label">Search<input className="teacher-field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder}/></label></div>; }
