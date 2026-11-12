# Feature Dependency Map

**Lift Spot-Check V2 (EMS problem statement 12b)**
Generated from: `IT Innovation Features.docx` (feature list F01-F08), the 12b brief and our prototype review of 28 Oct 2026. Diagrams: [workflow-diagram.md](workflow-diagram.md), [er-diagram.md](er-diagram.md), [screens.md](screens.md).

---

## Feature Ownership

Each person owns one end-to-end slice: tables, API, pages and tests. P0 load is 6-9 items each. Kwan's list is longest because it is the foundation everyone builds on, and two of its items (login and roles) already exist.

| Member | Scope | Features | Owns tables | Pages |
|--------|-------|----------|-------------|-------|
| Kwan | Lift and contractor records, bulk import, security | F04.1-F04.5, F01.1-F01.2 (lift search API and picker), F05.1, F05.2, F05.5, F07.1-F07.5, F06.4 (shared toasts), seed data, deployment, README | `lifts`, `contractors`, `users.contractor_id`, `defect_events` | Lifts (inspector home), Admin (lifts, contractors, users, import) |
| Kandha | Inspection (inspector) | F01.3-F01.12, F01.13 map link (P2), F05.3 inspection export, F06.5-F06.6 offline (P2) | `checklist_items`, `inspections`, `inspection_results` | Inspection checklist, Inspection history and report |
| Si Qi | Defect management and overview (EMS) | F02.1-F02.10, F05.4 defect export, F05.6 filtered reports, F08.1-F08.4 | `defects`, due-date rules | Defects by contractor, Overview |
| Jerald | Contractor rectification and sign-off | F03.1-F03.10 (includes F02.11), shared photo upload service (F01.7, F03.6), F05.7 scan import (P2) | `defect_updates`, `attachments`, `signoffs` | Contractor inbox, Defect detail (also where inspectors verify) |
| Group | Shared infrastructure | Auth (done), JWT + role guards (done), mobile layout (F06.1, F06.2 - each owner checks their own pages at 390px) | - | Login (done) |

### P0 count per member

| Member | P0 items |
|--------|----------|
| Kwan | F04.1, F04.2, F01.1, F01.2, F05.1, F07.1, F07.2, F07.4, F07.5 (9 - F07.1 and F07.2 exist) |
| Kandha | F01.3, F01.4, F01.6, F01.8, F01.10, F05.3 (6, but the largest UI) |
| Si Qi | F02.1, F02.2, F02.3, F02.4, F02.5, F02.6, F02.7, F05.4 (8) |
| Jerald | F03.1-F03.9 (9, each small) |

---

## Review of the Feature List

Changes to make in `IT Innovation Features.docx` before building. Most remove duplicate work, so the real scope is smaller than the 61 rows suggest.

| # | Type | Finding | Features | Fix |
|---|------|---------|----------|-----|
| 1 | Merge | Rejecting a repair is listed twice | F02.11, F03.8 | One "verify repair" action: approve closes, reject needs a reason and returns the defect to `in_progress` |
| 2 | Merge | Three separate history logs | F02.10, F03.10, F07.3 | One `defect_events` table. Every history screen reads from it |
| 3 | Merge | Auto-fill listed twice | F06.3 vs F01.2, F01.8 | Drop F06.3 as its own task; keep it as an acceptance check on F01 |
| 4 | Merge | Three overlapping report and export items | F01.12, F05.3, F05.6 | One report service with filters; the inspection report is its single-record view |
| 5 | Gap | Defect statuses never defined | F02.7, F03.9 | Fixed in [workflow-diagram.md](workflow-diagram.md) |
| 6 | Gap | Contractor accounts not linked to a company | F03.1, F03.2, F04.2 | Add `users.contractor_id`; the inbox filters by it |
| 7 | Gap | "Authorised user" and "manager" are not roles we have | F02.4, F08 | `admin` acts as the EMS officer. Auto-assign each defect to its lift's contractor, so admin only reassigns |
| 8 | Gap | No decision on photo storage | F01.7, F03.6 | One upload service used by both. Pick Supabase Storage or local disk; needs `multer` (new dependency) |
| 9 | Gap | No source for the checklist items | F01.3 | Seed Prototype 2's 25 items in 3 sections until EMS sends the official form |
| 10 | Priority | Due dates depend on severity, but severity is P1 | F02.5, F02.6 | Raise F02.6 to P0, unless EMS sets deadlines per contract |
| 11 | Priority | Paper-to-digital scan is AI scope creep; "no typing, no missing details" cannot be tested | F05.7 | P2. Reword: the scan pre-fills a form the inspector confirms |
| 12 | Priority | Map link is not in the brief; two items share the number F01.12 | F01.12 (map) | P2, as a Google Maps link from the lift address. Renumber it F01.13 |
| 13 | Priority | Offline storage and sync are costly | F06.5, F06.6 | P2 until EMS confirms motor rooms have no signal. Server drafts (F01.9) cover most of the need |
| 14 | Priority | Contract details are not needed for the core loop | F04.4 | P2 |

---

## Dependency Table

| Feature / What Needs It | Owned By | Depends On | Owned By | Type | Can Mock? |
|--------------------------|----------|-----------|----------|------|-----------|
| Lift picker, auto-filled lift and contractor (F01.1, F01.2) | Kandha | `lifts`, `contractors` tables + `GET /api/lifts?q=` | Kwan | DB + API | Yes - seed rows |
| Inspector ID and timestamp (F01.8) | Kandha | `req.user` from `authenticate` | Group | Auth | N/A - exists |
| Defect creation on submit (F02.1) | Si Qi | `inspections`, `inspection_results` tables | Kandha | DB | Yes - seed a submitted inspection |
| Inspection submit creates defects (F01.10) | Kandha | `defectService.createFromInspection()` | Si Qi | Service | Yes - no-op until Si Qi's service lands |
| Auto-assign to contractor (F02.4) | Si Qi | `lifts.contractor_id` | Kwan | DB | Yes - seed rows |
| Contractor inbox (F03.2) | Jerald | `users.contractor_id`, `defects` table | Kwan, Si Qi | DB | Yes - seed a contractor user + defects |
| Acknowledge, sign-off, verify (F03.3, F03.7, F03.8) | Jerald | `defectService.transition()` | Si Qi | Service | Yes - update status directly in dev only |
| Photo evidence on checklist (F01.7) | Kandha | Upload service + `attachments` table | Jerald | Service | Yes - skip photos until it lands |
| Defect history, sign-off history (F02.10, F03.10) | Si Qi, Jerald | `defect_events` table + `logEvent()` | Kwan | DB | Yes - skip log write in dev |
| Overview counts (F08) | Si Qi | `defects`, `inspections` read access | Si Qi, Kandha | DB (read) | Yes - seed data |
| Inspection export (F05.3) | Kandha | Report/export helper | Si Qi | Service | Yes - build own CSV first, merge later |
| All protected routes | Everyone | `authenticate` + `authorise(...roles)` | Group | Auth | N/A - exists |

---

## Shared Contracts (agree before coding)

### Defect status values

`open`, `acknowledged`, `in_progress`, `pending_verification`, `closed`. Transitions and who may make them are in [workflow-diagram.md](workflow-diagram.md). Si Qi owns `defectService.transition(defectId, toStatus, user, { note, reason })`; everyone else calls it.

### Severity and due dates

| Severity | Days until due |
|----------|----------------|
| `critical` | TBC with EMS (placeholder: 1) |
| `major` | TBC with EMS (placeholder: 7) |
| `minor` | TBC with EMS (placeholder: 14) |

The day counts live in one config object in Si Qi's service, so changing them after the EMS answer is a one-line edit.

### Display IDs

`INS-000123` for inspections and `DEF-000123` for defects, built from the primary key. Not stored as a separate column.

### Shared components

| Component | Builder | Used by |
|-----------|---------|---------|
| `LiftPicker` | Kwan | Kandha |
| Toasts (success / error after every action, F06.4) | Kwan | Everyone |
| `PhotoUpload` + `POST /api/attachments` | Jerald | Kandha, Jerald |
| `StatusBadge` (incl. overdue flag) | Si Qi | Si Qi, Jerald, Kandha |
| `ChecklistItemRow` | Kandha | Kandha |

### Hotspot files

`models/index.js`, `routes/index.js`, `App.jsx`, `routes.js`, `AppLayout.jsx`: add only your own lines and merge small PRs often.

---

## Suggested Build Order

```
Wave 0 - Kwan (everyone blocked until this is done)
  ├── One schema PR: every table in er-diagram.md + migrations
  │   + associations in models/index.js
  ├── Seed: lifts, contractors, contractor logins, 25 checklist items
  ├── Si Qi: stub defectService.transition()
  └── Jerald: stub upload service (POST /api/attachments)
      Done when: npm run db:migrate + seed run cleanly on a fresh database

Wave 1 - P0 loop, all four in parallel
  ├── Kwan:   GET /api/lifts (search), lift + contractor CRUD, bulk lift import
  ├── Kandha: checklist page, Pass/Defect, defect capture, submit
  ├── Si Qi:  createFromInspection(), auto-assign, due dates, defects list by contractor
  └── Jerald: contractor inbox, acknowledge, progress, evidence, e-sign, verify
      Done when: inspector fails an item -> defect lands in the contractor's inbox
                 -> contractor signs off -> inspector approves -> Closed

Wave 2 - P1 widening
  ├── Kwan:   import validation + summary, user management, audit log
  ├── Kandha: All Pass, drafts, photos, history, inspection report
  ├── Si Qi:  filters, overdue flag, history, overview counts
  └── Jerald: sign-off history
      Done when: every P1 acceptance criterion has a passing test

Wave 3 - P2 and polish (only items EMS confirms)
  ├── Kandha: offline drafts + sync, map link
  ├── Jerald: scan import (OCR)
  ├── Kwan:   contract details, deployment, README
  └── All:    390px check of every page
```

---

## Flags for Team Discussion

**1. One schema PR up front.** Kwan writes every core migration in Wave 0 so four people are not editing `models/index.js` at once and Si Qi's `defects` table is not waiting on Kandha's `inspections` table.

**2. Public sign-up.** Sign-up creates a `member`, but inspectors and contractors are created by admin. Decide whether to turn sign-up off or keep it for the rubric.

**3. Photo storage.** Supabase Storage (already on Supabase, no extra account) or local disk (simpler, lost on redeploy). Needs `multer` either way.

### Open questions for EMS

Each answer moves a feature between P0 and P2. Tick off any the briefing already settled.

- [ ] How are due dates set: by severity, or by each contractor's contract? (F02.5, F02.6)
- [ ] Can we have the official spot-check checklist? (F01.3)
- [ ] Do motor rooms have mobile signal, and do inspectors need to work offline? (F06.5, F06.6)
- [ ] What is bulk imported: only the lift list, or contractors and past inspections too? Is there a sample Excel file? (F05.1)
- [ ] Should defects go straight to the lift's contractor, or does an EMS officer assign them? (F02.4)
- [ ] Are there still paper forms that need scanning in? (F05.7)
- [ ] Is a typed confirmation enough for contractor sign-off, or must they draw a signature? (F03.7)
