# Frontend Test Cases - Kandha

Inspection pages: hub (`/inspections`), checklist (`/inspections/new`, `/inspections/:id` while a draft) and report (`/inspections/:id` once submitted). The Axios instance (`@/api`) is mocked in every file, so no backend is needed.

| # | Test File | What is Tested | Expected Outcome |
|---|-----------|---------------|-----------------|
| 1 | inspectionDisplay.test.js | `applyAllPass` | Passes unanswered items only; Defects and their typed details are untouched; other sections untouched |
| 2 | inspectionDisplay.test.js | `findProblems` / `problemSummary` | Names unanswered items and defects without description or severity; one short message |
| 3 | inspectionDisplay.test.js | `toPayload`, `dueDatePreview`, `answersFromDetail`, `groupBySection`, `filterParams` | Defect fields only sent for a Defect; due date from the API's day table; blank filters dropped |
| 4 | checklistPage.test.jsx | Checklist layout | Items in sections with codes; lift/contractor/inspector under "Filled from records"; Find in map opens a new tab |
| 5 | checklistPage.test.jsx | Progress | Answered count and per-section counts update as items are answered |
| 6 | checklistPage.test.jsx | Reopening a draft | Every saved answer, description and severity is restored |
| 7 | checklistPage.test.jsx | Pass / Defect, All pass | Each item can be changed; All pass leaves Defects alone and other sections untouched |
| 8 | checklistPage.test.jsx | Defect capture | Fields open under the item; location prefilled with the section; due-date preview after choosing a severity; photo button present |
| 9 | checklistPage.test.jsx | Autosave | Changed answers PUT about 1s after the last change; "Saved hh:mm"; a failed save shows "Not saved - retry" and retries |
| 10 | checklistPage.test.jsx | Submit blocked | Names unanswered items and incomplete defects, outlines them, does not call the API |
| 11 | checklistPage.test.jsx | Submit success | Saves first, then submits; report shows "Submitted · 1 defect sent to <contractor>" and a link to the defect |
| 12 | checklistPage.test.jsx | Server 422 and offline | Server-named items are outlined (until touched); a connection failure keeps the draft and shows a message |
| 13 | checklistPage.test.jsx | Starting a draft | `/inspections/new?liftId=` POSTs once, moves to `/inspections/:id`; no lift asks for one; 404 and 500 have their own states |
| 14 | historyPage.test.jsx | Hub as inspector | New inspection button, Drafts (n) tab, submitted list, draft progress and Continue link, empty states |
| 15 | historyPage.test.jsx | Hub as admin | No New inspection button, no Drafts tab, drafts never requested |
| 16 | historyPage.test.jsx | Filters | Read from the URL, written to the URL, sent to the API, cleared; empty filtered list offers to clear |
| 17 | historyPage.test.jsx | Export CSV | Sends the filters; label shows the count; disabled at 0; error shown when it fails |
| 18 | historyPage.test.jsx | Lift picker | Searches the register, narrows by typing, skips deactivated lifts, Escape closes, choosing a lift starts the checklist |
| 19 | historyPage.test.jsx | Report | Admin and inspector can open it; header, counts, defects with StatusBadge and `/defects/:id` link; Pass/Defect shown as words; export this inspection |
| 20 | historyPage.test.jsx | Access | Contractor gets 403 on `/inspections/:id`; admin gets 403 on `/inspections/new`; someone else's draft shows "couldn't find" |
