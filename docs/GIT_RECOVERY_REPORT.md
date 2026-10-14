# Git Recovery Report

**Result: RECOVERED LOCALLY ONLY**  
**Audit date:** 2026-10-14

## 1. Actual source directory

`/mnt/data/npsd-phase17-work`

This is the verified Next.js application root. It contains `package.json`, `src/app/`, `src/components/`, `src/lib/`, TypeScript configuration, tests, documentation, and `.env.example`. The supplied project is not a Git working tree: there is no `.git/` directory and `git status` cannot run there.

## 2. Audit archive verification

Inspected `/mnt/data/npsd-school-project-audit.zip`. Its source root is `npsd-phase17-work/`. The archive contains 107 files. A SHA-256 comparison of every archived file against the local project (excluding the local TypeScript build-info cache) found:

- Archive-only files: none
- Local-only files: none
- Different file contents: none

Therefore, the current local source matches the source captured in the audit archive.

## 3. Remote repository and branch

- Repository: `noblepublicschooldadu-max/NPSD-SCRIPT-SHEET`
- Repository URL: https://github.com/noblepublicschooldadu-max/NPSD-SCRIPT-SHEET
- Visibility: public
- Default branch: `main`
- Only remote branch found: `main`
- Initial commit: `adeb915731c68f87d127c357439e06c722915cab` (`Initial commit`)
- Existing remote `README.md`: `# NPSD-SCRIPT-SHEET` (no trailing newline; blob `17ba83a2ff45c69debf75f01e580b283681664a5`)
- Remote mutations performed: none. The existing README, initial commit, and `main` branch remain untouched by this recovery attempt.

GitHub connector access confirmed repository metadata and read access. However, a direct Git transport test failed because this environment cannot resolve `github.com` (`Could not resolve host: github.com`). No clone was obtained, so no feature branch was created and no commit or push was attempted. The authenticated connector does not provide a safe direct transfer path from this local filesystem for the complete 107-file application tree; creating a report-only remote branch would not constitute source recovery and was deliberately avoided.

## 4. Files recovered / project inventory

The verified local project includes:

- `package.json`
- `src/app/` — Next.js App Router routes and API route handlers
- `src/components/` — public site, authentication forms, and admin/teacher/student UI components
- `src/lib/` and `src/types/` — application contracts, validation, and helpers
- `tests/` — 15 `.test.cjs` files
- `docs/` — audit, integration, readiness, pilot, setup, schema, and roadmap documents, including this report
- `README.md`, `API-CONTRACT.md`
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore`
- `.env.example` — placeholder configuration names only

Directory checks:

| Item | Finding |
|---|---|
| `package.json` | Present |
| `package-lock.json` | Absent |
| `pnpm-lock.yaml` | Absent |
| `yarn.lock` | Absent |
| `bun.lock` / `bun.lockb` | Absent |
| `src/` | Present; includes `src/app/` |
| root `app/` | Absent; the app is under `src/app/` |
| `public/` | Absent |
| `tests/` | Present; 15 test files |
| `docs/` | Present |
| `.env.example` | Present |
| real `.env` files | None found |
| `node_modules/` | Absent |
| `.next/`, `out/`, `dist/`, `build/` | None found |

## 5. Sensitive-file review and exclusions

A filesystem inventory and a limited marker scan were run against the project. No matches were found for common private-key headers, AWS access-key IDs, GitHub token patterns, Google API-key patterns, or OpenAI-style secret-key patterns. No likely private-data file extensions (`.csv`, `.xlsx`, `.xls`, `.sqlite`, `.db`, `.jsonl`) or credential files (`.pem`, `.key`, `.p12`, `.pfx`) were found. The only `.env*` file is `.env.example`.

This is a targeted scan, not a guarantee that every possible secret or personal datum has been detected. Review any future diffs before staging and use an additional secret scanner when a full Git working tree is available.

Deliberately excluded from recovery/archive commits:

- `tsconfig.tsbuildinfo` — generated TypeScript incremental build cache; it is present in the working directory but absent from the audit archive
- `.env`, `.env.local`, `.env.production`, and all other real environment files — none were found; keep excluded
- `node_modules/`, `.next/`, `out/`, `dist/`, `build/`, `coverage/`, `.vercel/` — ignored generated/dependency/build data; none were found in this source root
- credentials, private keys, database exports, and student-record exports — none were found
- ZIP archives and other audit packages — do not place them inside the Git source tree unless separately requested

The existing `.gitignore` excludes environment files (except `.env.example`), dependency/build output, `.vercel/`, and `*.tsbuildinfo`.

## 6. Dependency/package-manager findings

`package.json` declares scripts compatible with npm (`dev`, `build`, `start`, `lint`, `typecheck`, `test`), but has no `packageManager` field and there is no lockfile. Consequently, the exact package manager and resolved dependency versions cannot be established from this source snapshot. Do not claim reproducible dependency installation until a lockfile is intentionally generated and reviewed.

The manifest declares ranges, not exact installed versions: Next.js `^15.5.0`, React and React DOM `^19.1.0`, TypeScript `^5.8.0`, and the other listed dependencies in `package.json`. No installed dependency tree was present at audit time.

## 7. Commit and push evidence

- Local recovery report created: `docs/GIT_RECOVERY_REPORT.md`
- Recovery commit: none
- Recovery branch: none created
- Push: not attempted
- Remote branch verification after push: not applicable; no push occurred
- Remote `main` was not modified

## 8. Exact remaining manual steps

Run these steps on a machine with working GitHub network access and authentication. Keep the existing repository and `main` history intact.

1. Clone into a separate directory and verify the baseline:

   ```bash
   git clone https://github.com/noblepublicschooldadu-max/NPSD-SCRIPT-SHEET.git npsd-git-recovery
   cd npsd-git-recovery
   git switch main
   git log -1 --oneline
   git status --short --branch
   ```

   Confirm the initial commit is `adeb915731c68f87d127c357439e06c722915cab` (or inspect any legitimate remote updates before continuing). Do not reset or rewrite `main`.

2. Create a feature branch from the current remote `main`:

   ```bash
   git switch -c recovery/phase17-source-import
   ```

3. Copy the contents of `/mnt/data/npsd-phase17-work/` into the clone, excluding `.git/`, `tsconfig.tsbuildinfo`, any real `.env*` files, `node_modules/`, `.next/`, `out/`, `dist/`, `build/`, `coverage/`, `.vercel/`, credential files, data exports, and ZIP archives. The project root should have `package.json`, `src/`, `tests/`, `docs/`, and config files directly under it—not a nested `npsd-phase17-work/` directory.

4. Preserve the remote README. Do **not** overwrite its existing `README.md` blindly with the much larger local README. Merge useful project information into the existing README, or add the local detailed documentation as `docs/PROJECT_README.md` and link to it from the existing README. Keep the edit on the recovery branch.

5. Review the full staged diff and verify there are no secrets or student records:

   ```bash
   git status --short
   git diff --check
   git diff --stat
   git diff --cached --stat
   git diff --cached -- . ':!*.lock'
   git ls-files | grep -E '(^|/)(\.env($|\.)|.*\.(pem|key|p12|pfx|csv|xlsx|xls|sqlite|db|jsonl)$|tsconfig\.tsbuildinfo$|node_modules/|\.next/)'
   ```

   The last command should produce no tracked sensitive/generated paths; manually review all staged files too. If a secret is discovered, stop and remove it before committing.

6. Install dependencies only after intentionally choosing a package manager and reviewing the manifest. Generate and review that manager's lockfile rather than fabricating versions. Run tests and available lint/type/build checks; report failures accurately.

7. Commit and push **only the feature branch** after the diff is safe:

   ```bash
   git add .
   git status --short
   git diff --cached --check
   git commit -m "Recover SEF school management application source"
   git push -u origin recovery/phase17-source-import
   ```

   Do not push to `main` and do not force-push.

8. Verify the remote branch and commit:

   ```bash
   git ls-remote --heads origin recovery/phase17-source-import
   git fetch origin recovery/phase17-source-import
   git log -1 --oneline origin/recovery/phase17-source-import
   git status --short --branch
   ```

   Compare the remote SHA with the local recovery commit SHA. Only then change the result to **RECOVERED AND PUSHED**. Until then, the accurate result remains **RECOVERED LOCALLY ONLY**.

No application logic was changed, no Google services were accessed or modified, no backend was created, and no deployment was performed.
