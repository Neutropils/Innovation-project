# Frontend Test Cases - Kwan

Lifts page and Admin page prototype (plan: `design/kwan/ai-coding-plan-lifts-admin-prototype.md`).
`helpers.jsx` is shared setup for the two page test files, not a test file.

## liftDisplay.test.js - search, last-check text and "suggested next checks" rules

| # | What is Tested | Expected Outcome |
|---|---------------|-----------------|
| 1 | Search by lift code, block, street or contractor, any letter case | Lift matches |
| 2 | Search with several words | Every word must match |
| 3 | Blank search | Matches everything |
| 4-7 | Last-check text: never, today, yesterday, 13 days ago | "Never checked", "Checked today", "Checked yesterday", "Checked 13 days ago" |
| 8 | Priority of a recently checked lift with nothing outstanding | No reasons |
| 9 | Priority of a lift never spot-checked | Reason "Never spot-checked" |
| 10 | Priority at exactly 30 days and at 31 days (edge of the interval) | No reason at 30; "Not checked for 31 days" at 31 |
| 11 | Lift with overdue defects and a repair to verify | Both reasons listed, in plain words |
| 12 | More overdue defects | Higher score |
| 13 | Suggested order | Never-checked, then longest unchecked, then overdue defects |
| 14 | Lifts with nothing to flag | Left out of the suggestions |
| 15 | Empty register | No suggestions |
| 16 | Map link | Google Maps search URL for the lift address |

## importCheck.test.js - bulk import check and register rules

| # | What is Tested | Expected Outcome |
|---|---------------|-----------------|
| 17 | CSV with quoted commas, doubled quotes, CRLF and the Excel BOM | Parsed into the right cells; blank lines dropped |
| 18 | Clean file | All 5 rows ready, no fixes, no rejects |
| 19 | `lift-2002`, `Blk Blk 5`, contractor in lower case | Fixed to `LIFT-2002` and `5`, each fix listed; contractor matched |
| 20 | Lift already in the register | Rejected with the reason |
| 21 | Missing street | Rejected: "Missing street" |
| 22 | Two missing fields | Rejected: "Missing block and street" |
| 23 | Unknown contractor | Rejected, told to add it under Contractors first |
| 24 | Unreadable lift code | Rejected with the expected format |
| 25 | Same lift code twice in one file | Second row rejected, naming the first row |
| 26 | Sample file with problems | 3 ready, 4 fixes, rows 4-7 rejected |
| 27 | File without the required columns | `MISSING_COLUMNS`, naming them |
| 28-29 | Empty file; headings with no rows | `EMPTY_FILE` |
| 30 | Import check (dryRun) | Nothing saved |
| 31 | Import confirm | Only the accepted rows added |
| 32 | Unusable file sent to the endpoint | 422 with the reason |
| 33 | Duplicate lift code on create | 409 `DUPLICATE_LIFT_CODE` |
| 34 | Deactivate a contractor with active lifts | 409 with the number of lifts |
| 35 | Contractor account with no lift company | 422 `CONTRACTOR_REQUIRED` |
| 36 | Empty demo scenario | Lists return no records |
| 37 | Request for another owner's resource | Not handled (left to the rest of the mock API) |

## liftsPage.test.jsx - Lifts page

| # | What is Tested | Expected Outcome |
|---|---------------|-----------------|
| 38 | Inspector opens Lifts | Every lift with contractor, last check and a link to its open defects |
| 39 | Start inspection and History | Link to `/inspections/new?liftId=1` and `/inspections?liftId=1` |
| 40 | Suggested next checks | Three lifts, never-checked first, each with its reason |
| 41 | Repairs waiting | "2 repairs waiting for you" links to defects pending verification |
| 42 | Typing in the search | List filters; suggestions hidden while searching |
| 43 | Search with no results | No-results state; Clear search restores the list |
| 44 | Empty register as inspector | Told to ask the EMS admin; no import link |
| 45 | Server error | Error alert; Try again loads the list |
| 46 | Connection drops after a load | Last list stays with an offline banner, no error |
| 47 | Offline with nothing saved | Offline state, not an error |
| 48 | Admin opens Lifts | Edit link instead of Start inspection (inspector-only route) |
| 49 | Empty register as admin | Import lifts link to the Admin import tab |

## adminPage.test.jsx - Admin page

| # | What is Tested | Expected Outcome |
|---|---------------|-----------------|
| 50 | Tabs | Opens on Lifts; Contractors shows lift counts; Users shows company and Inactive |
| 51 | Link with `?tab=lifts&q=` from the Lifts page | Tab open with the search applied |
| 52 | Empty and error states of a tab | Empty state; error alert with a retry that loads |
| 53 | Lift form saved empty | A message under each required field |
| 54 | Wrong lift code and postal code formats | "Use the format LIFT-0000", "Postal code is 6 digits" |
| 55 | Add a lift | Confirmation, and the list grows to 13 |
| 56 | Duplicate lift code | Message under the field; form stays filled in |
| 57 | Connection drops during a save | "Nothing was saved"; entries kept |
| 58 | Deactivate a lift | Marked Inactive in Admin; gone from the inspector's list |
| 59 | Deactivate a contractor that still has lifts | Refused, says to move the lifts first |
| 60 | Contractor form: bad email, then duplicate name | Message under each field |
| 61 | Add a contractor account | Lift company required; then confirmation with a one-time password |
| 62 | Email that already has an account | Message under the field |
| 63 | Admin deactivates their own account | Refused |
| 64 | Import the sample with problems | Check shows 4 fixes and 4 rejects, nothing saved; confirm adds 3; register shows 15 |
| 65 | Upload a CSV file | File is read and checked |
| 66 | Upload a non-CSV file | Refused, says how to save as CSV |
| 67 | Upload an empty file | Refused |
| 68 | File with the wrong columns | Names the missing columns |
| 69 | Every row rejected | Import button disabled; nothing saved |
