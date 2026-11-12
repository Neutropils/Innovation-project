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

## Working Independently

Nobody waits for anybody. The skeleton PR (`feature/skeleton`) already holds every table, model, router, page route, seed row and cross-team function, so each person builds only inside their own files.

**Three rules:**

1. **Only the owner writes to their own tables.** Everyone else goes through the owner's function (table below). Owners can then change their internals without breaking anyone.
2. **Build against the seed data, not each other's screens.** `npm run db:seed` puts a defect in every status, so the contractor inbox, verification and overview all have data before the checklist exists.
3. **Mock other people's functions in your tests** (`jest.mock('../../src/services/defectService')`). Your CI passes whether or not they have finished.

### Who owns which files

| Member | Backend | Frontend |
|--------|---------|----------|
| Kwan | `routes/liftRoutes.js`, `contractorRoutes.js`, `userRoutes.js`, `services/auditService.js`, `seed.js`, models `Contractor`, `Lift`, `DefectEvent` | `pages/lifts/`, `pages/admin/` |
| Kandha | `routes/inspectionRoutes.js`, models `ChecklistItem`, `Inspection`, `InspectionResult` | `pages/inspections/` |
| Si Qi | `routes/defectRoutes.js`, `services/defectService.js`, model `Defect` | `pages/defects/`, `pages/overview/`, `components/StatusBadge.jsx` |
| Jerald | `routes/rectificationRoutes.js`, `services/attachmentService.js`, models `DefectUpdate`, `Attachment`, `Signoff` | `pages/contractor/`, `components/PhotoUpload.jsx` |

Add your own controllers, services and validators as new files (e.g. `controllers/liftController.js`). The shared files (`models/index.js`, `routes/index.js`, `App.jsx`, `router/routes.js`) should not need changes. If they do, tell the team first.

### The only contact points

Every cross-team call goes through one of these. They already work in the skeleton, so you can call them on day 1.

| Function or component | Owner | Called by | State in the skeleton |
|-----------------------|-------|-----------|-----------------------|
| `defectService.createFromInspection(inspectionId, { transaction })` | Si Qi | Kandha's submit | Works: one `open` defect per failed item, lift's contractor, due date from severity, safe to call twice |
| `defectService.transition(defectId, toStatus, user, { note, reason, transaction })` | Si Qi | Jerald's acknowledge, update, sign-off and verify | Works: enforces the status table, role and company, logs history |
| `defectService.isOverdue(defect, today)` | Si Qi | Everyone (backend) | Works |
| `auditService.logEvent({ defectId, actorId, action, fromStatus, toStatus, note }, { transaction })` | Kwan | Si Qi's `transition()`, anyone recording history | Works |
| `attachmentService.storePhoto(...)` + `createAttachment(...)` | Jerald | Kandha (checklist photos) | `storePhoto` is a stub returning a placeholder URL |
| `<StatusBadge status dueDate />` | Si Qi | Kandha, Jerald | Works, including the Overdue pill |
| `<PhotoUpload onUploaded label />` | Jerald | Kandha | Stub: disabled button |
| URL `/inspections/new?liftId=<id>` | Kandha | Kwan's Lifts page | Routed to Kandha's page |
| URL `/defects/<id>` | Jerald | Si Qi's Defects page, Kandha's history | Routed to Jerald's page |

`req.user` now also carries `contractorId` (the lift company of a contractor account, `null` otherwise), so contractor routes can filter by company without another query.

---

## API Contract

Every endpoint below is mounted and role-guarded in the skeleton, and answers `501 NOT_IMPLEMENTED` until its owner builds it. `tests/shared/skeletonRoutes.test.js` checks the guards - when you build an endpoint, move its row out of that test into your own tests.

| Method | Path | Roles | Owner | Purpose |
|--------|------|-------|-------|---------|
| GET | `/api/lifts?q=` | inspector, admin | Kwan | Search lifts by code, block or street |
| GET | `/api/lifts/:id` | inspector, admin | Kwan | Lift with its contractor |
| POST / PATCH | `/api/lifts`, `/api/lifts/:id` | admin | Kwan | Create, edit |
| POST | `/api/lifts/import` | admin | Kwan | CSV/Excel import -> accepted count + rejected rows with reasons |
| GET | `/api/contractors`, `/api/contractors/:id` | inspector, admin | Kwan | List, detail with lifts |
| POST / PATCH | `/api/contractors`, `/api/contractors/:id` | admin | Kwan | Create, edit |
| GET / POST / PATCH | `/api/users`, `/api/users/:id` | admin | Kwan | User management, link contractor accounts |
| GET | `/api/checklist-items` | inspector, admin | Kandha | Active items by section |
| POST | `/api/inspections` | inspector | Kandha | `{ liftId }` -> new draft |
| GET | `/api/inspections?liftId=&from=&to=` | inspector, admin | Kandha | History |
| GET | `/api/inspections/export` | inspector, admin | Kandha | CSV |
| GET | `/api/inspections/:id` | inspector, admin | Kandha | Inspection, answers, defects |
| PUT | `/api/inspections/:id/results` | inspector | Kandha | Save draft answers |
| POST | `/api/inspections/:id/submit` | inspector | Kandha | Validate, submit, create defects |
| GET | `/api/defects?contractorId=&status=&severity=&overdue=&liftId=` | inspector, admin | Si Qi | Filtered list |
| GET | `/api/defects/export` | inspector, admin | Si Qi | CSV |
| GET | `/api/defects/:id` | inspector, admin, contractor (own company) | Si Qi | Detail |
| GET | `/api/defects/:id/history` | inspector, admin, contractor (own company) | Si Qi | `defect_events` |
| PATCH | `/api/defects/:id/assign` | admin | Si Qi | Reassign with reason |
| GET | `/api/overview?from=&to=` | admin | Si Qi | Counts |
| GET | `/api/inbox?status=` | contractor | Jerald | Own company's defects |
| POST | `/api/defects/:id/acknowledge` | contractor | Jerald | `open` -> `acknowledged` |
| POST | `/api/defects/:id/updates` | contractor | Jerald | Progress note; first one -> `in_progress` |
| POST | `/api/defects/:id/signoff` | contractor | Jerald | Needs evidence -> `pending_verification` |
| POST | `/api/defects/:id/verify` | inspector, admin | Jerald | `{ decision, reason }` -> `closed` or back to `in_progress` |
| GET | `/api/defects/:id/signoffs` | inspector, admin, contractor (own company) | Jerald | Sign-off history |
| POST | `/api/attachments` | inspector, contractor | Jerald | Upload a photo -> `{ id, url }` |

---

## Shared Contracts

### Defect status values

`open`, `acknowledged`, `in_progress`, `pending_verification`, `closed`. Transitions and who may make them are in [workflow-diagram.md](workflow-diagram.md), and in code as `TRANSITIONS` in `services/defectService.js`.

### Severity and due dates

| Severity | Days until due |
|----------|----------------|
| `critical` | TBC with EMS (placeholder: 1) |
| `major` | TBC with EMS (placeholder: 7) |
| `minor` | TBC with EMS (placeholder: 14) |

The day counts live in `SEVERITY_DUE_DAYS` in `services/defectService.js`, so changing them after the EMS answer is a one-line edit.

### Display IDs

`INS-000123` for inspections and `DEF-000123` for defects, built from the primary key. Not stored as a separate column.

### Changing a shared table

The skeleton migration (`20261113000000-create-spot-check-tables.js`) is never edited once applied. To change your own table, add a new migration and update your own model file, then post in the group chat which columns changed.

---

## Suggested Build Order

```
Skeleton - done (feature/skeleton PR)
  ├── Every table, model, association, router, page route and nav entry
  ├── Seed: 3 contractors, 8 lifts, 25 checklist items, demo logins,
  │         one defect in every status (two overdue)
  └── Working contracts: createFromInspection(), transition(), logEvent(),
      StatusBadge; stubs: storePhoto(), PhotoUpload
      After merge: one person runs npm run db:migrate + npm run db:seed on the
      shared database and shares the demo passwords privately

Wave 1 - P0, all four in parallel, nobody waiting
  ├── Kwan:   lift search + detail, lift and contractor CRUD, bulk lift import
  ├── Kandha: checklist page, Pass/Defect, defect capture, submit
  ├── Si Qi:  defect list by contractor, detail, due-date rules, reassign
  └── Jerald: inbox, acknowledge, progress, evidence, e-sign, verify
      Done when: everyone runs the whole loop together once -
                 inspector fails an item -> defect lands in the contractor's inbox
                 -> contractor signs off -> inspector approves -> Closed

Wave 2 - P1 widening
  ├── Kwan:   import validation + summary, user management, audit log screens
  ├── Kandha: All Pass, drafts, photos, history, inspection report
  ├── Si Qi:  filters, overdue flag, history, export, overview counts
  └── Jerald: real photo storage, sign-off history
      Done when: every P1 acceptance criterion has a passing test

Wave 3 - P2 and polish (only items EMS confirms)
  ├── Kandha: offline drafts + sync, map link
  ├── Jerald: scan import (OCR)
  ├── Kwan:   contract details, deployment, README
  └── All:    390px check of every page
```

---

## Flags for Team Discussion

**1. Skeleton first (done).** The skeleton PR creates every table, route and page at once, so nobody edits `models/index.js` or waits on another person's table. Merge it before starting Wave 1.

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
