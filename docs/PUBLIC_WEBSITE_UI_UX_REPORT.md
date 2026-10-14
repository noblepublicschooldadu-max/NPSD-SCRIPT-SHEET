# Public Website UI/UX Redesign Report

**Project:** Noble Public School Dadu  
**Location:** Dadu, Sindh, Pakistan  
**Repository:** `noblepublicschooldadu-max/NPSD-SCRIPT-SHEET`  
**Scope:** Public website presentation and navigation only. Existing school-management APIs, data contracts, and protected portal route implementations were retained.

## 1. Inspection summary

The repository uses Next.js App Router, React 19, TypeScript, Tailwind CSS v4 and a shared global stylesheet. The existing public homepage was `src/app/page.tsx`; shared site chrome was in `src/components/site-header.tsx` and `src/components/site-footer.tsx`. Existing public sections use the `src/app/[section]/page.tsx` route, with a dedicated admissions page and application form.

The repository initially contained no `public/` image assets and no verified photograph of the actual campus. Existing notice and admissions endpoints explicitly return `503 NOT_CONFIGURED` while their trusted backend is unavailable. Those contracts were not changed.

## 2. Files changed or added

- `src/app/page.tsx` — redesigned public landing page and section hierarchy.
- `src/app/layout.tsx` — school-specific title/description/Open Graph metadata, viewport theme color, and pre-paint theme initialization.
- `src/app/globals.css` — scoped navy/blue/gold design tokens, light/dark public theme styling, responsive layout rules, focus states, reduced-motion support, and mobile header styles. Protected workspace styling was not globally recolored.
- `src/components/site-header.tsx` — school identity, desktop navigation, accessible mobile disclosure menu, admissions CTA, language selector and theme toggle; no public portal promotion.
- `src/components/site-footer.tsx` — school-branded footer and verified-location-only copy; removed the generic portal link.
- `src/components/site-chrome.tsx` — keeps public header/footer off authentication and admin/teacher/student routes while preserving those routes and their page components.
- `src/components/theme-toggle.tsx` — light/dark toggle, system-preference default, and persisted user selection.
- `src/components/contact-form.tsx` — client-side validation and honest unavailable state; removed the previous local-only fake success message.
- `src/components/gallery-grid.tsx` — replaced repeated decorative placeholders with one accessible empty state until approved images are supplied.
- `src/components/admissions/admissions-page-content.tsx` — applies the scoped public design tokens to admissions information.
- `src/app/[section]/page.tsx` — applies public styling to informational routes only; protected access-denied handling remains fail-closed.
- `src/app/sitemap.ts` — public-route sitemap, enabled when `NEXT_PUBLIC_SITE_URL` is configured with the verified site domain.
- `src/app/robots.ts` — robots rules that disallow indexing of authentication, API, admin, teacher and student paths.
- `public/images/campus-photo-placeholder.svg` — explicitly labeled illustration placeholder, not a claimed school photograph.

## 3. Design system and sections

- **Palette:** deep navy `#102A43`, royal blue `#2563EB`, warm gold `#D4A84F`, soft white `#F8FAFC`, and slate text `#172B4D`. Dark surfaces are scoped to public pages so portal-specific styles remain independent.
- **Typography:** system sans-serif stack with Arial/Helvetica and Noto fallbacks, high-contrast headings, consistent readable body sizes, and responsive type scaling.
- **Responsive layout:** split desktop hero, stacked mobile hero, class grid that collapses for tablets/phones, responsive enquiry/footer columns, and a mobile navigation disclosure.
- **Public sections:** hero, school introduction, Classes 1–8, primary/middle learning descriptions, editable school-value messaging, learning-environment content, news/notices, gallery empty state, admissions CTA, and enquiry form.
- **Motion/accessibility:** subtle entrance animation, reduced-motion handling, visible focus styling, semantic landmarks/headings, image alt text, labeled inputs, validation feedback, keyboard Escape handling for the mobile menu, and focus movement to the first mobile navigation link when opened.
- **Theme:** saved choice in `localStorage` under `npsd-public-theme`; first visit follows `prefers-color-scheme`. A small pre-paint initializer reduces theme flicker. The toggle changes public site chrome and public sections only.

## 4. Images and content verification

- **Authentic campus photos used:** none. No verified campus image was present in the repository at inspection time.
- **Placeholder:** `public/images/campus-photo-placeholder.svg`. It is an architectural illustration visibly labeled as a placeholder. The hero's alt text explicitly states it is not an actual campus photograph.
- **Owner action:** replace this placeholder with a school-approved photograph of the real campus at `public/images/campus-photo-placeholder.svg` (or update the image path and this report if using a differently named asset). Supply an appropriate crop and confirm publishing rights before adding any identifiable children's photos.
- No principal name/message/photo, school awards, ratings, testimonials, official curriculum affiliation, facilities, staff roster, school history, phone number, email address, or office hours were invented.
- The school-value copy is explicitly identified as proposed public-facing messaging for owner review.
- Gallery shows a transparent empty state until approved images exist. News continues to load from the existing notices endpoint and does not seed sample announcements.
- No real contact details were available to publish. The footer shows only the provided location: Dadu, Sindh, Pakistan.

## 5. Backend integrations and security boundaries

- Existing `/api/notices` integration remains in place. The route currently returns `503 NOT_CONFIGURED`; the UI presents an unavailable/empty state rather than fake notices.
- Existing admissions application form and `/api/admissions` contract were not replaced. That endpoint continues to validate and fail closed with `503 NOT_CONFIGURED` until the trusted backend is configured.
- The new homepage enquiry form validates fields in the browser but deliberately does **not** transmit or save them because no verified enquiry endpoint exists. It explicitly tells the visitor that the message was not sent or stored. Connecting this form requires a reviewed, rate-limited server-side endpoint and privacy handling.
- No Google Apps Script, Google Sheets, database, authentication, role authorization, student record, attendance, examination, result, backup or ID-card workflow was modified.
- Public chrome is omitted from `/login`, `/register`, `/forgot-password`, and admin/teacher/student route families. This does not implement or imply working authentication; existing portal fail-closed behavior remains.
- The sitemap stays empty until `NEXT_PUBLIC_SITE_URL` is configured to a verified domain. No deployment domain was assumed.

## 6. Verification results

| Check | Result |
| --- | --- |
| Repository structure and dependencies inspected through GitHub | Completed |
| Existing public routes, key page/components, API handlers and image paths inspected | Completed |
| Campus image availability | No approved image found; labeled placeholder added |
| `npm test` | Not run for this revision |
| `npm run lint` | Not run for this revision |
| `npm run typecheck` | Not run for this revision |
| `npm run build` | Not run for this revision |
| Local checkout / runtime verification | Blocked: the execution environment could not resolve `github.com`; no local dependency installation or build could be performed |
| Live browser/responsive testing | Not performed in this environment |
| Production deployment | Not performed |

These results must not be interpreted as a passing build. Run the four project checks in a network-enabled checkout with Node.js 20.9+ and the dependencies from `package.json` installed before merging or deploying.

## 7. Remaining owner and release checklist

1. Provide the actual campus photograph and, if desired, an approved school logo.
2. Review and approve the public-facing values copy, school description and primary/middle learning text.
3. Provide verified contact details and office hours through an authorized school representative.
4. Supply approved gallery photographs and written permission for any identifiable children.
5. Connect and independently review the secure Apps Script/Sheets-backed notice and admissions services; do not enable UI success states until durable backend acknowledgements exist.
6. Implement a dedicated, protected enquiry endpoint before enabling real enquiry delivery.
7. Set `NEXT_PUBLIC_SITE_URL` to the verified production domain, then verify `/sitemap.xml`, `/robots.txt`, canonical/OG behavior and deployment metadata.
8. Run tests, lint, typecheck and production build; inspect desktop, tablet, and 320–430px mobile layouts; verify keyboard navigation, theme persistence, reduced-motion behavior, and dark-mode contrast.
9. Have Urdu/Sindhi translations and RTL layouts reviewed by fluent speakers before claiming the whole site is fully localized.

**Status:** UI changes have been committed to the repository, but build/test and live-browser acceptance remain unverified in this environment.
