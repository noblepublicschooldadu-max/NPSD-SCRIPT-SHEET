# Google Drive Setup and Private File Access

**Current state:** no Drive integration source, folder IDs, test files, permission list or deployed file endpoint was present in the supplied repository. No folders or sharing settings have been created or changed. The structure below is a proposal.

## Proposed folder structure

Create the root folder `SEF School Management System` under the school-controlled Google account, then create:

| Folder | Contents | Access policy |
|---|---|---|
| `01 Student Photos` | Approved student profile/card photos | Backend service owner; authorized Admin; scoped read only for the student's approved card/profile workflow. Never public. |
| `02 Admission Documents` | Applications and supporting documents | Backend service owner and authorized admission reviewers only. Students/public must not browse the folder. |
| `03 Homework and Assignments` | Assignment files and authorized submissions | Backend service owner; assigned Teacher and relevant Student through a permission-checking endpoint. No broad folder sharing. |
| `04 School Documents` | Approved school documents intended for staff or public distribution | Separate public-approved copies from private originals. Public items must be explicitly approved and published through a safe path. |
| `05 System Backups` | Encrypted or otherwise protected snapshots and manifests | Backend owner and designated recovery administrators only; never share publicly. |
| `06 Test and Recovery` | Synthetic test files, backup/restore drills and isolated recovery artifacts | Test operators only; no production student data unless a separately approved controlled recovery procedure requires it. |

Folder numbers are organizational suggestions, not required names. Do not create these folders in a production Drive until the school owner approves the structure and account.

## Access and upload rules

1. Keep the root and private child folders restricted; never use “Anyone with the link” for student, guardian, admission, homework-submission or backup content.
2. Apps Script should read the approved root folder ID from Script Properties. Do not accept folder IDs or arbitrary destinations from a browser request.
3. On upload, authorize the actor and record ownership first; allowlist categories; validate MIME type, extension, file size, file count and content policy; sanitize the original filename; generate a server-controlled name; store the resulting Drive ID only in `FileReferences`.
4. On download, resolve the `fileRefId` server-side, check record ownership/audience and current session/role, then stream or serve through an authenticated route where feasible. A Drive file ID is not authorization. Do not return public Drive URLs for private files.
5. Reject HTML/SVG and executable content unless a documented, reviewed use case requires it. Treat images and documents as untrusted; verify file signature where possible rather than trusting browser MIME alone.
6. Apply upload size limits and quota/rate limits. Log file reference, actor, action, request ID and outcome—not document contents, signed URLs or sensitive query strings.
7. For backups, write only into `System Backups`, verify read-back and integrity metadata, keep retention protected backups, and require an isolated restore drill before enabling restore in production.
8. Review inherited permissions, shared drives, link-sharing policies, editors, external collaborators and owner account recovery. The Apps Script deployment identity must have only the access required for its job.

## Manual Google Drive verification checklist

- [ ] Confirm the school owns the root folder and has at least two authorized recovery administrators.
- [ ] Confirm all private folders are restricted and no inherited public-link access exists.
- [ ] Confirm test files are synthetic and separated from production.
- [ ] Confirm Vercel and browser bundles contain no Drive IDs/secrets that grant access.
- [ ] Test an unauthorized user requesting a private file ID; response must not disclose file existence or contents.
- [ ] Test expired sessions, wrong student, wrong class, wrong admission reviewer and wrong file category.
- [ ] Test oversized, disallowed MIME, misleading extension and duplicate uploads.
- [ ] Test recovery administrator access and backup integrity only in the test folder.

No Drive state was inspected live; all checklist items remain unverified until an authorized operator checks the Google Drive UI and test deployment.
