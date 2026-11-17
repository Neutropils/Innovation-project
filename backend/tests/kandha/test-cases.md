# Backend Test Cases - Kandha

Inspection slice: checklist, drafts, submit, history, report, CSV export. Both files mock the database; the route tests also mock `inspectionService`, and the service tests mock `defectService`, so CI passes whether or not teammates have finished.

| # | Test File | What is Tested | Expected Outcome |
|---|-----------|---------------|-----------------|
| 1 | inspectionRoutes.test.js | Every inspection route without a token | 401 |
| 2 | inspectionRoutes.test.js | Contractor and member on every route | 403 FORBIDDEN |
| 3 | inspectionRoutes.test.js | Admin on POST, PUT results and POST submit | 403 FORBIDDEN (admin is read-only) |
| 4 | inspectionRoutes.test.js | GET /checklist-items | Sections plus `meta.severityDueDays` |
| 5 | inspectionRoutes.test.js | POST /inspections with a body `inspectorId` | Ignored; the inspector comes from the token |
| 6 | inspectionRoutes.test.js | POST /inspections new vs existing draft | 201 for new, 200 for existing |
| 7 | inspectionRoutes.test.js | POST /inspections with a missing, non-numeric or negative liftId | 422 VALIDATION_ERROR |
| 8 | inspectionRoutes.test.js | GET /inspections filters and blank filters | Parsed and passed to the service; blanks dropped; bad date is 422 |
| 9 | inspectionRoutes.test.js | GET /inspections/export | text/csv, `attachment; filename="inspections-YYYYMMDD.csv"`; not captured by `/:id` |
| 10 | inspectionRoutes.test.js | GET /inspections/:id | 200 for the caller; hidden draft is 404; non-numeric id is 404 |
| 11 | inspectionRoutes.test.js | PUT results body validation | Unknown fields stripped; partial answers allowed; empty, bad result or bad severity is 422 |
| 12 | inspectionRoutes.test.js | PUT results on a submitted inspection | 409 ALREADY_SUBMITTED |
| 13 | inspectionRoutes.test.js | POST submit 422 | Body names `unanswered` and `incompleteDefects` |
| 14 | inspectionRoutes.test.js | POST submit twice; unexpected error | 409; 500 with no internal detail leaked |
| 15 | inspectionService.test.js | getChecklist | Active items grouped by section in order |
| 16 | inspectionService.test.js | createOrGetDraft | Returns the existing draft, else creates one owned by the logged-in inspector; unknown or inactive lift is 404 |
| 17 | inspectionService.test.js | getInspection | One entry per item, counts, defects with display IDs; drafts hidden from others and admin |
| 18 | inspectionService.test.js | saveResults upsert | Creates new rows, updates existing rows, partial saves work |
| 19 | inspectionService.test.js | saveResults column mapping | description/location/severity land in `defectDescription`/`defectLocation`/`severity`; location defaults to the section; Pass clears defect fields |
| 20 | inspectionService.test.js | saveResults access | Other inspector's draft 404; submitted 409; other's submitted 403; unknown item 422 |
| 21 | inspectionService.test.js | submit validation | 422 naming unanswered items and incomplete defects; nothing changed; `createFromInspection` not called |
| 22 | inspectionService.test.js | submit success | Status and time set, inspector unchanged, `createFromInspection(id, { transaction })` called once |
| 23 | inspectionService.test.js | submit when `createFromInspection` throws | Error propagates out of the one shared transaction (database rolls back) |
| 24 | inspectionService.test.js | submit twice / wrong inspector / concurrency | 409 / 404 / row locked with `FOR UPDATE` |
| 25 | inspectionService.test.js | listInspections visibility | Admin sees submitted only; inspector sees submitted plus own drafts |
| 26 | inspectionService.test.js | listInspections filters | Lift, date range (whole last day), result (defects / all pass) |
| 27 | inspectionService.test.js | CSV | Header row, one row per answer in checklist order, comma/quote/newline escaping, formula guard, submitted only |
| 28 | inspectionService.test.js | Two simultaneous starts for the same lift | One draft is created; both callers get it (per-inspector-and-lift lock); other lifts and inspectors are not held up; a failed start does not block the next |
| 29 | inspectionService.test.js | Unique-draft index rejects the insert (another process won the race) | `SequelizeUniqueConstraintError` is caught and the existing draft is returned with `created: false`; any other error is rethrown; a violation with no draft to find is rethrown, never hidden |
