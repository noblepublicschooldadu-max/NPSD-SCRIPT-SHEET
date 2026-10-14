# Proposed Google Sheets Schema — SEF School Management System

**Status: PROPOSED DESIGN ONLY.** No production workbook was available or inspected. These tab names and headers are not verified against a live sheet. Before creating tabs, inspect any existing workbook and reconcile it with this versioned schema; do not create duplicates or rename production tabs without an approved migration plan.

## Design rules

- Use opaque, immutable IDs (UUIDs or cryptographically random identifiers) as keys. A GR/Seat Number is a school identifier, not a login credential or a primary database key.
- Store ISO 8601 timestamps in UTC (`createdAt`, `updatedAt`); store school dates as `YYYY-MM-DD`. Display in `Asia/Karachi` at the UI boundary.
- Represent booleans explicitly; never infer absent attendance from a missing row.
- Empty marks mean unmarked, not zero. Zero is a valid mark only when explicitly recorded.
- Use status enums and optimistic `version` fields for mutable records. Use Apps Script `LockService` around duplicate-sensitive operations.
- Keep secrets, password hashes, session digests and recovery-token digests out of general student records and all client responses. If the school approves storing auth metadata in Sheets, restrict the workbook to the backend owner/admin operators and store only strong password hashes and token/session digests.
- Never put Drive download URLs with public access in a sheet. Store Drive file IDs in `FileReferences`; authorize every read on the server.
- Sheets are not a relational database. Enforce unique keys, foreign-key existence, idempotency and authorization in server code, not formulas or UI.

## Recommended tab count

**20 tabs for the complete planned feature set.** A smaller MVP can begin with 16 core tabs, adding optional workflow tabs only when the matching feature is actually implemented. This is a schema proposal, not a statement that any tabs currently exist.

### 1. `Users` — MVP

**Purpose:** account identity, role and lifecycle. Restrict entire tab/workbook access to the trusted backend and authorized administrators.

Headers, in exact order:
`userId,username,email,phone,role,linkedStudentId,linkedTeacherId,passwordHash,status,mustChangePassword,createdAt,updatedAt,lastLoginAt,failedLoginCount,lockedUntil,sessionVersion,version`

- Required: `userId`, `username`, `role`, `passwordHash`, `status`, `createdAt`, `updatedAt`, `sessionVersion`, `version`.
- Optional: `email`, `phone`, `linkedStudentId`, `linkedTeacherId`, `mustChangePassword`, `lastLoginAt`, `failedLoginCount`, `lockedUntil`.
- Unique key: `userId`; normalized `username` and non-empty email should also be unique.
- Relationships: `linkedStudentId` → `Students.studentId`; `linkedTeacherId` → `Teachers.teacherId`.
- Read/write: backend only; Admin may manage accounts through authorized operations. Never return `passwordHash` or auth fields to the browser.
- Note: implement password hashing in a vetted server-side runtime; never store plaintext passwords. Do not rely on GR number as authentication.

### 2. `Students` — MVP

Headers:
`studentId,grNumber,fullName,dateOfBirth,gender,classId,sectionId,academicYearId,admissionId,guardianName,guardianPhone,guardianEmail,address,photoFileRefId,enrollmentStatus,admissionDate,leavingDate,createdAt,updatedAt,version`

- Required: `studentId`, `fullName`, `classId`, `sectionId`, `academicYearId`, `enrollmentStatus`, `createdAt`, `updatedAt`, `version`.
- Optional: `grNumber`, `dateOfBirth`, `gender`, `admissionId`, guardian fields, `address`, `photoFileRefId`, `admissionDate`, `leavingDate`.
- Unique: `studentId`; `grNumber` unique when present and school-approved.
- Relationships: classes/sections/year, optional `Admissions.applicationId`, `FileReferences.fileRefId`.
- Read/write: Admin; Teacher only assigned class fields needed for teaching; Student only their own approved fields.

### 3. `Teachers` — MVP

Headers:
`teacherId,staffNumber,fullName,email,phone,designation,employmentStatus,photoFileRefId,createdAt,updatedAt,version`

- Required: `teacherId`, `fullName`, `employmentStatus`, `createdAt`, `updatedAt`, `version`.
- Optional: `staffNumber`, `email`, `phone`, `designation`, `photoFileRefId`.
- Unique: `teacherId`; staff number/email unique if present.
- Relationships: `TeacherAssignments.teacherId`, `Users.linkedTeacherId`, optional `FileReferences`.
- Read/write: Admin; Teacher only their own profile and assigned details.

### 4. `Classes` — MVP

Headers:
`classId,level,name,sectionName,academicYearId,capacity,status,createdAt,updatedAt,version`

- Required: `classId`, `level` (1–8), `name`, `sectionName`, `academicYearId`, `status`, `createdAt`, `updatedAt`, `version`.
- Optional: `capacity`.
- Unique: `classId`; unique combination `level + sectionName + academicYearId`.
- Relationships: `AcademicYears.academicYearId`; referenced by students, assignments, sessions, homework, timetable.
- Read/write: Admin; assigned Teacher sees only assigned classes; students see own class details.
- Decision: combine class and section in one tab for a single school of this size to avoid duplicate class/section tabs. Split later only if the approved data model needs section-level lifecycle/capacity independently.

### 5. `AcademicYears` — MVP

Headers:
`academicYearId,name,startDate,endDate,status,isCurrent,createdAt,updatedAt,version`

- Required: all except `isCurrent` may be derived; prefer exactly one active/current year enforced server-side.
- Unique: `academicYearId`, `name`.
- Relationships: referenced by Classes, Students, TeacherAssignments, AttendanceSessions, Homework, Examinations, Results and Timetable.
- Read/write: Admin; other roles read only where relevant.

### 6. `Subjects` — MVP

Headers:
`subjectId,code,name,classLevel,status,createdAt,updatedAt,version`

- Required: `subjectId`, `name`, `classLevel`, `status`, timestamps, `version`.
- Optional: `code`.
- Unique: `subjectId`; unique `code` when supplied; subject/class-level duplicate policy enforced server-side.
- Relationships: `TeacherAssignments`, `Homework`, `Examinations`, `Results`, `Timetable`.
- Read/write: Admin; assigned teachers read their assigned subjects.

### 7. `TeacherAssignments` — MVP

Headers:
`assignmentId,teacherId,classId,subjectId,academicYearId,status,assignedBy,createdAt,updatedAt,version`

- Required: all fields except `subjectId` only if a class-wide assignment is explicitly supported.
- Unique: `assignmentId`; unique active `(teacherId,classId,subjectId,academicYearId)`.
- Relationships: Teachers, Classes, Subjects, AcademicYears, Users.
- Read/write: Admin only; Teacher can read only their assignments. Every teacher operation must verify this row server-side.

### 8. `AttendanceSessions` — MVP

Headers:
`sessionId,classId,academicYearId,sessionDate,sessionType,status,openedBy,submittedAt,closedAt,operationKey,createdAt,updatedAt,version`

- Required: `sessionId`, `classId`, `academicYearId`, `sessionDate`, `sessionType`, `status`, `openedBy`, `createdAt`, `version`.
- Optional: `submittedAt`, `closedAt`, `operationKey`, `updatedAt`.
- Unique: `sessionId`; one active session per `(classId,sessionDate,sessionType,academicYearId)`.
- Relationships: Classes, AcademicYears, Users; child rows in Attendance.
- Read/write: Admin; assigned Teacher may open/submit for assigned class only. Corrections require Admin or explicit delegated permission and audit reason.

### 9. `Attendance` — MVP

Headers:
`attendanceId,sessionId,studentId,status,markedBy,markedAt,correctionReason,operationKey,createdAt,updatedAt,version`

- Required: `attendanceId`, `sessionId`, `studentId`, `status`, `markedBy`, `markedAt`, `createdAt`, `version`.
- Optional: `correctionReason`, `operationKey`, `updatedAt`.
- Allowed status: `present`, `absent`, `late`, `excused`; no row or blank status remains unmarked.
- Unique: `attendanceId`; unique `(sessionId,studentId)`; unique `operationKey` for retried batch operations where supported.
- Relationships: AttendanceSessions, Students, Users.
- Read/write: Admin; assigned Teacher within their class; Student reads only own attendance summary/details.

### 10. `Homework` — MVP

Headers:
`homeworkId,title,description,classId,subjectId,teacherId,academicYearId,assignedAt,dueAt,attachmentFileRefId,status,publishedAt,createdAt,updatedAt,version`

- Required: `homeworkId`, `title`, `classId`, `subjectId`, `teacherId`, `academicYearId`, `assignedAt`, `dueAt`, `status`, `createdAt`, `version`.
- Optional: `description`, attachment ref, `publishedAt`, `updatedAt`.
- Unique: `homeworkId`.
- Relationships: TeacherAssignments, Classes, Subjects, AcademicYears, FileReferences, Submissions.
- Read/write: assigned Teacher creates/updates own assigned work; students only see published work for their class.

### 11. `Submissions` — optional MVP extension

Headers:
`submissionId,homeworkId,studentId,submittedAt,textResponse,attachmentFileRefId,status,reviewedBy,reviewedAt,feedback,createdAt,updatedAt,version`

- Required: `submissionId`, `homeworkId`, `studentId`, `status`, `createdAt`, `version`.
- Optional: `submittedAt`, `textResponse`, attachment ref, review fields, feedback, `updatedAt`.
- Unique: `submissionId`; unique `(homeworkId,studentId)` if only one current submission is allowed; otherwise use submission revisions explicitly.
- Relationships: Homework, Students, FileReferences, Users.
- Read/write: Student only own submission; assigned Teacher reviews only assigned work.

### 12. `Examinations` — MVP

Headers:
`examId,name,examType,classId,subjectId,academicYearId,maxMarks,examDate,status,createdBy,reviewedBy,reviewedAt,publishedAt,createdAt,updatedAt,version`

- Required: `examId`, `name`, `classId`, `subjectId`, `academicYearId`, `maxMarks`, `status`, `createdBy`, `createdAt`, `version`.
- Optional: `examType`, `examDate`, review/publish fields, `updatedAt`.
- Unique: `examId`.
- Relationships: Classes, Subjects, AcademicYears, Users, Results.
- Read/write: Admin configures/reviews/publishes; assigned Teacher enters marks for authorized exam only. Publication is a distinct privileged state transition.

### 13. `Results` — MVP

Headers:
`resultId,examId,studentId,marks,markStatus,enteredBy,enteredAt,reviewedBy,reviewedAt,publishedAt,operationKey,createdAt,updatedAt,version`

- Required: `resultId`, `examId`, `studentId`, `markStatus`, `enteredBy`, `enteredAt`, `createdAt`, `version`.
- `marks` is numeric only when explicitly recorded; blank marks remain unmarked. `markStatus` should distinguish `unmarked`, `entered`, `reviewed`, `published` only if approved state model needs per-student status; exam-level publication must still gate student access.
- Optional: review/publish fields, operation key, `updatedAt`.
- Unique: `resultId`; unique `(examId,studentId)` for one current result.
- Relationships: Examinations, Students, Users.
- Read/write: assigned Teacher enters only allowed marks; Admin reviews/publishes; Student reads only published results for self.

### 14. `Timetable` — MVP

Headers:
`timetableEntryId,academicYearId,classId,dayOfWeek,periodNumber,startTime,endTime,entryType,subjectId,teacherId,room,status,publishedAt,createdAt,updatedAt,version`

- Required: `timetableEntryId`, `academicYearId`, `classId`, `dayOfWeek`, `periodNumber`, `startTime`, `endTime`, `entryType`, `status`, `createdAt`, `version`.
- Optional: `subjectId`, `teacherId`, `room`, `publishedAt`, `updatedAt`.
- Unique: `timetableEntryId`; enforce no overlapping class/section and teacher time slots server-side.
- Relationships: AcademicYears, Classes, Subjects, Teachers.
- Read/write: Admin manages and publishes; Teacher sees assigned schedule; Student sees own class published schedule.

### 15. `Notices` — MVP

Headers:
`noticeId,title,body,audienceType,classId,academicYearId,status,publishedAt,expiresAt,createdBy,updatedBy,createdAt,updatedAt,version`

- Required: `noticeId`, `title`, `body`, `audienceType`, `status`, `createdBy`, `createdAt`, `version`.
- Optional: class/year, publication/expiry and update fields.
- Unique: `noticeId`.
- Audience values: `public`, `all_authenticated`, `admin`, `teachers`, `students`, `class` (validate allowlist server-side).
- Relationships: Classes, AcademicYears, Users.
- Read/write: Admin publishes; public visitors see only approved `public` published notices; class audience requires verified membership.

### 16. `Admissions` — MVP

Headers:
`applicationId,publicReference,studentName,dateOfBirth,requestedClass,guardianName,guardianPhone,guardianEmail,address,documentFileRefIds,status,submittedAt,reviewedBy,reviewedAt,decisionReason,convertedStudentId,idempotencyKey,createdAt,updatedAt,version`

- Required: `applicationId`, `studentName`, `requestedClass`, `guardianName`, `guardianPhone`, `status`, `submittedAt`, `idempotencyKey`, `createdAt`, `version`.
- Optional: public reference, DOB, email, address, document refs, review/decision fields, conversion link, `updatedAt`.
- Unique: `applicationId`; unique high-entropy `publicReference` if public lookup is approved; unique `idempotencyKey` for submission and conversion operations.
- Relationships: FileReferences, Users for review, Students via `convertedStudentId`.
- Read/write: public may submit only minimum permitted fields; only authorized Admin can view/review/convert. Public lookup must not reveal private details. Conversion must be atomic/idempotent under a lock and must not create a login automatically.

### 17. `IDCards` — optional

Headers:
`idCardId,studentId,academicYearId,opaqueTokenHash,status,issuedAt,expiresAt,revokedAt,issuedBy,createdAt,version`

- Required: `idCardId`, `studentId`, `academicYearId`, `status`, `issuedAt`, `issuedBy`, `createdAt`, `version`.
- Optional: token hash, expiry/revocation fields.
- Unique: `idCardId`; token hash unique when used.
- Relationships: Students, AcademicYears, Users.
- Read/write: Admin issues/revokes; student views own card; public verification returns only minimum confirmation such as valid/invalid and approved display name only if school policy explicitly permits. QR token must be opaque, high entropy, revocable and not encode GR number/profile fields.

### 18. `FileReferences` — optional, required before any file feature is enabled

Headers:
`fileRefId,driveFileId,category,ownerType,ownerId,originalName,mimeType,sizeBytes,sha256,uploadedBy,createdAt,status,version`

- Required: `fileRefId`, `driveFileId`, `category`, `ownerType`, `ownerId`, `originalName`, `mimeType`, `sizeBytes`, `uploadedBy`, `createdAt`, `status`, `version`.
- Optional: `sha256` if calculated and verified.
- Unique: `fileRefId`; Drive file ID unique within this managed service.
- Relationships: Students/Admissions/Homework/Submissions through owner fields and explicit refs.
- Read/write: backend and authorized file service only; never use the stored Drive ID as proof of permission.

### 19. `AuditLogs` — MVP for sensitive writes

Headers:
`auditEventId,occurredAt,actorUserId,actorRole,action,entityType,entityId,requestId,operationKey,outcome,reason,changeSummary`

- Required: `auditEventId`, `occurredAt`, `actorUserId`, `actorRole`, `action`, `entityType`, `entityId`, `outcome`.
- Optional: request/operation IDs, reason, minimized change summary.
- Unique: `auditEventId`.
- Relationships: Users; entity IDs are polymorphic references.
- Read/write: backend appends events; authorized Admin/auditor reads. Do not store passwords, tokens, complete student records or sensitive payloads. Protect against edits/deletes through restricted workbook access and append-only service logic.

### 20. `BackupMetadata` — required before backups are enabled

Headers:
`backupId,createdAt,createdBy,status,schemaVersion,storageFileRefId,checksumAlgorithm,checksum,recordCountsJson,scopeJson,verificationStatus,verifiedAt,restoreStatus,retentionProtected,operationKey,errorCode`

- Required: `backupId`, `createdAt`, `createdBy`, `status`, `schemaVersion`, `verificationStatus`, `retentionProtected`.
- Optional: storage file ref, checksum details, counts/scope JSON, verification/restore fields, operation key and safe error code.
- Unique: `backupId`; `operationKey` unique when present.
- Relationships: Users and FileReferences.
- Read/write: backend and authorized Admin backup service only. Never expose private backup Drive IDs to public clients. Actual restore requires verified pre-restore snapshot and isolated rehearsal.

## MVP recommendation

Use 16 tabs initially: `Users`, `Students`, `Teachers`, `Classes`, `AcademicYears`, `Subjects`, `TeacherAssignments`, `AttendanceSessions`, `Attendance`, `Homework`, `Examinations`, `Results`, `Timetable`, `Notices`, `Admissions`, `AuditLogs`. Add `Submissions`, `IDCards`, `FileReferences`, and `BackupMetadata` when those respective backend capabilities are implemented; however, do not enable a file or backup feature before its reference/metadata requirements are in place. If student photos or admission documents are needed in the MVP, add `FileReferences` before accepting uploads.

## Manual setup

1. Create a **test-only** Google Spreadsheet owned by the school-controlled account. Do not use real student data during initial setup.
2. Inspect existing tabs first. If the workbook already exists, export its headers and map them before changing anything.
3. Add the approved tab names and header row exactly as specified above. Do not add demo rows.
4. Freeze row 1, enable filters, and protect the header row. Apply plain-text formatting to IDs, GR numbers, phone numbers and opaque tokens; date formatting alone must not change stored ISO values.
5. Restrict workbook sharing to the authorized school operators and backend owner. Do not enable “Anyone with the link”.
6. Add schema version/manifest in the Apps Script project (not as a user-editable data row), and have the backend validate required tabs/headers at startup/health check.
7. Test duplicate-key, foreign-key, date/status validation and concurrent operations with synthetic data. No migration or tab auto-creation should run against production without explicit approval and a tested backup.
