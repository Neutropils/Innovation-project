# Backend Test Cases - Si Qi

Defect detail, rectification history and reassignment (F02.2, F02.4, F02.10). Both files mock the database; the route tests also mock `defectService`, and the service tests mock Kwan's `auditService`, so CI passes without a database.

| # | Test File | What is Tested | Expected Outcome |
|---|-----------|---------------|-----------------|
| 1 | defectRoutes.test.js | Detail, history and assign without a token | 401 |
| 2 | defectRoutes.test.js | Member on detail and history; inspector, contractor and member on assign | 403 FORBIDDEN |
| 3 | defectRoutes.test.js | GET /defects/:id as inspector, admin and contractor | 200 with the service's defect |
| 4 | defectRoutes.test.js | GET /defects/abc | 404 without calling the service |
| 5 | defectRoutes.test.js | Service throws 404 / an unexpected error | 404 passed through / 500 with no internal detail |
| 6 | defectRoutes.test.js | GET /defects/:id/history as a contractor | 200 with the events; the contractor's company is passed to the service |
| 7 | defectRoutes.test.js | PATCH assign with a string id, padded reason and an extra `status` field | Id coerced, reason trimmed, `status` stripped |
| 8 | defectRoutes.test.js | PATCH assign with no contractor, a non-numeric one, no reason, a blank reason or a reason over 500 characters | 422 VALIDATION_ERROR |
| 9 | defectRoutes.test.js | PATCH assign on a closed defect | 409 DEFECT_CLOSED |
| 10 | defectService.test.js | getDefect | DEF-000088, lift code and name, checklist item, contractor name, overdue flag |
| 11 | defectService.test.js | getDefect by the defect's own contractor / another contractor | 200 / 404 |
| 12 | defectService.test.js | getDefect or getHistory for a missing defect | 404 |
| 13 | defectService.test.js | getHistory | Events oldest first with actor id, name and role only; system events have `actor: null` |
| 14 | defectService.test.js | getHistory by another company's contractor | 404, events never read |
| 15 | defectService.test.js | reassign | Locks the row, changes only the contractor, keeps the status, logs `reassigned` with "From A to B. Reason: ..." |
| 16 | defectService.test.js | reassign a closed defect | 409 DEFECT_CLOSED, nothing changed or logged |
| 17 | defectService.test.js | reassign to the same contractor, a missing one or a deactivated one | 422 |
| 18 | defectService.test.js | reassign with an empty, blank or missing reason | 422 before any database work |
