# AI Coding Plan - Lifts and Admin prototype (Kwan)

**Date:** 16 Nov 2026
**For:** Proposal Presentation, 18 Nov 2026 (rubric A1 - UI Prototype)
**Tool:** Claude Code
**Branch:** `master/prototype` (the team agreed all prototype UI goes on this branch)

This plan is committed before the code it describes.

---

## Goal

Replace the two placeholder pages I own with a clickable prototype that runs with no backend
(prototype mode, `frontend/src/prototype/`), in the same visual style as the Login, Overview and
Defects pages that are already on this branch.

| Page | Route | Roles | Features |
|------|-------|-------|----------|
| Lifts | `/lifts` | inspector (home), admin | F01.1 lift search, F01.2 lift details, F01.13 map link |
| Admin | `/admin` | admin | F04.1-F04.5 lift, contractor and user records, F05.1, F05.2, F05.5 bulk import and export |

Wireframes: `design/screens.md` ("Lifts" and "Admin").

---

## Client requirements this covers (12b brief)

| Requirement | Where it shows |
|-------------|----------------|
| Mass import and export | Admin > Import (template, upload, check, summary), Admin > Lifts > Export CSV |
| Fewer pages | Lift, contractor, user and import tools are tabs of one Admin page, not four pages |
| Defects by lift company | Every lift card shows its contractor and open defect count, linking to the filtered Defects page |
| Mobile-first | Both pages are laid out for 390px first; tables become stacked rows |
| Inspector-led checklist | Lifts is the inspector's start point: search, then "Start inspection" in one tap |

---

## Ideas beyond the brief

1. **Suggested next checks** (Lifts page). Each lift gets a priority score from rules, and the top
   three are shown first with the reasons in plain words, so the inspector does not have to decide
   where to go. Rules: never checked, days since the last spot-check, overdue defects, open defects.
   No AI - the score is explainable line by line.
2. **Import check before saving** (Admin > Import). The file is checked first and nothing is saved
   until the admin confirms. The check:
   - fixes what is safe to fix and shows each fix (`lift-427` -> `LIFT-0427`, `Blk Blk 5` -> `5`,
     extra spaces) - the messy values come from our review of Prototype 1's data
   - rejects the rest with a reason per row (duplicate in the register, duplicate in the file,
     missing field, unknown contractor)
   - lets the admin download only the rejected rows, fix them and upload again

---

## Screens and states

### Lifts

- Search by lift code, block, street or contractor (kept in the URL as `?q=`)
- "Suggested next checks" (top three) above the full list; hidden while searching
- Lift card: code, block and lift, street, contractor, last check, open and overdue defects,
  `Start inspection` -> `/inspections/new?liftId=<id>` (contract with Kandha), `History` ->
  `/inspections?liftId=<id>`, `Find in map`
- "N repairs waiting for you" -> `/defects?status=pending_verification`
- Admin sees `Edit` (-> Admin page) instead of `Start inspection`, because the inspection route is
  inspector-only and the button would dead-end on a 403
- States: loading skeleton, empty register, no search results, offline with a saved copy, offline
  with nothing saved, server error with retry

### Admin

Tabs kept in the URL (`?tab=lifts|contractors|users|import`) so the back button works.

- **Lifts:** search, add, edit, deactivate, export CSV
- **Contractors:** add, edit, deactivate; shows how many lifts each company maintains
- **Users:** add, edit role, link a contractor account to its company, deactivate
- **Import:** download template, choose a `.csv`, check, confirm, summary

Error and empty states:

| Where | State |
|-------|-------|
| Every tab | Loading, empty, offline, server error |
| Forms | Required fields, lift code format, email format (Formik + Yup) |
| Lift form | Lift code already exists (409 from the API) |
| Contractor form | Name already exists; deactivating a company that still has active lifts |
| User form | Email already exists; contractor role without a company; deactivating yourself |
| Any save | Offline or server error - the form stays filled in and says nothing was saved |
| Import | Wrong file type, empty file, missing columns, some rows rejected, every row rejected |

---

## Files

New (all mine):

- `frontend/src/prototype/registerData.js` - demo lifts, contractors and users, and the handlers
  for the lift, contractor, user and import endpoints (same shapes as the API contract in
  `design/feature-dependencies.md`)
- `frontend/src/pages/lifts/liftDisplay.js` - search match, last-check text, priority rules
- `frontend/src/pages/lifts/LiftsPage.jsx`
- `frontend/src/pages/admin/AdminPage.jsx`, `LiftsTab.jsx`, `ContractorsTab.jsx`, `UsersTab.jsx`,
  `ImportTab.jsx`, `adminUi.jsx` (shared form fields and list pieces for the tabs)
- `frontend/src/schemas/admin.js` - Yup schemas for the three forms
- `frontend/tests/kwan/` - tests and `test-cases.md`

Changed (shared, smallest possible edit):

- `frontend/src/prototype/mockApi.js` - a few lines that pass lift, contractor, user and import
  requests to `registerData.js`. `/contractors` keeps returning `id` and `name` for the Defects
  filter, with extra fields added.

Reused, not changed: `PageHero`, `PageShell`, `CARD`, `StateViews`, `OfflineMode`,
`DemoScenarioBar`, `StatusBadge`, theme tokens.

---

## Decisions

| Decision | Reason | Alternative considered |
|----------|--------|------------------------|
| One Admin page with tabs | "Fewer pages" is a client requirement | A page per record type - four more nav entries |
| Search runs on the loaded list | Instant, and still works offline in a motor room | Server search on every keystroke (kept in the API for large registers) |
| Import checks first, saves on confirm | Bad lift data breaks every other feature (risk 6.3 in the problem statement) | Save good rows straight away - no chance to stop a wrong file |
| Rules, not AI, for "suggested next" | Explainable to EMS, no scope creep (risk 6.4) | ML ranking - no data to train on |
| CSV only in the prototype | No new dependency; Excel saves as CSV | `.xlsx` parsing needs a library - to raise with the team for the real build |
| Writes kept in memory | Prototype has no backend; resets on reload | sessionStorage - not worth it for a demo |

---

## Not in this prototype

- Real backend endpoints (`/api/lifts`, `/api/contractors`, `/api/users`, `/api/lifts/import`) -
  Wave 1 and 2, with their own plan
- `.xlsx` upload, contract details (F04.4, P2), audit log screens (F07.3)
- A lift label column (`Lift A`, `Lift B`): the prototype shows one, the `lifts` table does not
  have it yet - needs a new migration in the real build

---

## Test plan (`frontend/tests/kwan/`)

- Priority rules and search helper (unit)
- Import check: fixes, duplicates, missing fields, unknown contractor, bad headers (unit)
- Lifts page: list, search, no results, empty, error with retry, offline, inspector vs admin buttons
- Admin page: tabs, add lift, duplicate code, validation messages, contractor with lifts cannot be
  deactivated, user needs a company, import check then confirm, wrong file type

Done when `npm test` and `npm run build` pass in `frontend/`, and both pages work at 390px.
