# Frontend Test Cases - Si Qi

| # | Test File | What is Tested | Expected Outcome |
|---|-----------|---------------|-----------------|
| 1 | mockApi.test.js | Demo account signs in through the prototype adapter | 200 with a token whose payload has the account's role |
| 2 | mockApi.test.js | Demo account with the wrong password | Rejects with 401 INVALID_CREDENTIALS |
| 3 | mockApi.test.js | Deactivated demo account | Rejects with 403 and the deactivated message |
| 4 | mockApi.test.js | "No connection" scenario | Rejects with no response (network error) |
| 5 | mockApi.test.js | "Server error" scenario | Rejects with 500 INTERNAL_ERROR |
| 6 | prototypeLogin.test.jsx | Tapping a demo account fills the form and signs in | Lands on the contractor Inbox |
| 7 | prototypeLogin.test.jsx | Tapping the Deactivated scenario then Sign in | Alert shows the deactivated message |
| 8 | prototypeLogin.test.jsx | Proxy 500 with no API error code (backend down) | Alert says it cannot reach the server, not "something went wrong" |
| 9 | adminPages.test.jsx | Overview counts and by-contractor list | Overdue tile shows the overdue count and links to /defects?overdue=true; each company is a row you can tap |
| 10 | adminPages.test.jsx | Clicking the Overdue count | Opens Defects filtered to overdue, with "Overdue only" pressed |
| 11 | adminPages.test.jsx | Overview fails to load, then Try again | Error alert shown; retry loads the counts |
| 12 | adminPages.test.jsx | Overview with nothing open | "All clear" empty state |
| 13 | adminPages.test.jsx | Defects grouped by contractor | Apex Lifts section lists its defects, each linking to /defects/:id |
| 14 | adminPages.test.jsx | Severity filter | List narrows to critical defects |
| 15 | adminPages.test.jsx | Filters that match nothing, then Clear filters | "No defects match these filters", then the full list |
| 16 | adminPages.test.jsx | No defects at all | "No defects yet" empty state; Export CSV disabled |
| 17 | adminPages.test.jsx | Defect list fails to load | Error alert shown |
| 18 | adminPages.test.jsx | Prototype data rules | "Not closed" and overdue filters match the backend rule; overview counts match the list |
| 19 | mockApi.test.js | "Offline" demo scenario | Data requests reject with no response (ERR_NETWORK) |
| 20 | adminPages.test.jsx | Overview opened offline after loading once | "You're offline" banner over the saved counts; no error alert |
| 21 | adminPages.test.jsx | Defects opened offline with nothing saved, then Try again | Offline state (not an error); retry loads the list |
| 22 | adminPages.test.jsx | Defects opened offline after loading once | Saved list shown with the banner; Export CSV disabled |
| 23 | adminPages.test.jsx | Connection comes back while offline | Page reloads by itself and the banner goes away |
| 24 | adminPages.test.jsx | Back from Defects after clicking an Overview count | Returns to Overview |
| 25 | adminPages.test.jsx | Back from Defects opened directly | Goes to Overview |
| 26 | adminPages.test.jsx | Typing a defect number in Search | List narrows to that defect, linking to its detail page |
| 27 | adminPages.test.jsx | Multi-word search ("apex door") | Every result matches all words across lift, item and contractor |
| 28 | adminPages.test.jsx | Search with no results, then Clear search | "No results for ..." state, then the full list |
| 29 | adminPages.test.jsx | Search while offline | Searches the saved list under the offline banner |
| 30 | adminPages.test.jsx | Overview summary line and "Needs attention" order | Headline names the most overdue contractor; that contractor is listed first |
| 31 | adminPages.test.jsx | Signing out through the profile menu | Sign out is hidden until the profile menu opens; choosing it clears the session |
| 32 | adminPages.test.jsx | Filters panel | Starts collapsed; the Filters button expands it to show the dropdowns |
| 33 | adminPages.test.jsx | Active filters while collapsed | Filters button shows the count; each filter is a chip that removes itself |
| 34 | adminPages.test.jsx | Clear all | Removes every filter but keeps the search term |
| 35 | defectRecord.test.jsx | Defect detail page | Heading DEF-000081; summary shows item, contractor and severity |
| 36 | defectRecord.test.jsx | Defect that does not exist | "Couldn't load this defect" alert |
| 37 | defectRecord.test.jsx | Rectification history of a defect pending verification | Collapsed with "5 entries" summary; opens to 5 rows oldest first: raised, acknowledged, started, progress update, signed off - with names and roles |
| 38 | defectRecord.test.jsx | History fails to load | "Couldn't load the history" alert with Try again |
| 39 | defectRecord.test.jsx | Admin reassigns a defect | Current company not offered; PATCH sends a number id and trimmed reason; success notice; summary shows the new company; history ends with "Reassigned" by the admin with from, to and reason |
| 40 | defectRecord.test.jsx | Reassign with nothing filled in | "Choose a contractor" and "A reason is required"; nothing sent |
| 41 | defectRecord.test.jsx | Reassign refused by the server (409) | Server message shown in the form, form stays open |
| 42 | defectRecord.test.jsx | Cancel | Form closes, nothing sent |
| 43 | defectRecord.test.jsx | Inspector, or a closed defect | No Reassign button |
| 44 | defectRecord.test.jsx | Prototype reassign | Defect moves to the new company in the list and overview counts; status unchanged |
| 45 | defectRecord.test.jsx | Prototype reassign of a closed defect, to the same or an unknown contractor, or with a blank reason | 409 DEFECT_CLOSED / 422 VALIDATION_ERROR, like the backend |
| 46 | defectRecord.test.jsx | Prototype history | Matches each defect's status; no event in the future |
| 47 | defectRecord.test.jsx | History labels | Rejected repair, approval, unknown actions and system actor read plainly |
| 48 | adminPages.test.jsx | Demo defects | Every defect has a lift id from the demo lift register |
| 49 | adminPages.test.jsx | Typing a lift code in search (no Lift dropdown) | List narrows to that lift's defects; Filters has no Lift field |
| 50 | adminPages.test.jsx | Due from / Due to dates | List narrows to defects due in the range (both ends included); a chip for each date |
| 51 | adminPages.test.jsx | Export with a lift searched and dates set | Export request carries q, dueFrom and dueTo |
| 52 | adminPages.test.jsx | "Due from" after "Due to" | No-match state, and a warning under the dates |
| 53 | adminPages.test.jsx | Prototype data rules for lift and dates | Lift and inclusive date filters; CSV has one row per matching defect |
| 54 | prototypeLoop.test.js | Inspector submits a checklist with 2 failed items (F02.1) | 2 open defects for the lift's contractor, linked to the inspection, due today+1 (critical) and today+7 (major); history starts with "created" by the inspector |
| 55 | prototypeLoop.test.js | All-pass inspection | No defects created |
| 56 | prototypeLoop.test.js | Submitting twice | 409 ALREADY_SUBMITTED; no duplicate defects |
| 57 | prototypeLoop.test.js | Submitting an incomplete checklist | 422 naming unanswered items and incomplete defects; no defects created |
| 58 | prototypeLoop.test.js | Starting the same lift twice | The same draft is reopened |
| 59 | prototypeLoop.test.js | Admin starts an inspection | 403 |
| 60 | prototypeLoop.test.js | Demo defects | Each is linked to the inspection that found it; its report lists the defect |
| 61 | prototypeLoop.test.js | Inspection summary (F08.4) | Counted from inspection records; a new submit adds one to the week's count and the Overview |
| 62 | prototypeLoop.test.js | Inspection summary vs history | All-time count equals the submitted history list |
| 63 | prototypeLoop.test.js | Contractor overview by status (F08.3) | Each company's status counts add up to its open count |
| 64 | prototypeLoop.test.js | Status breakdown text | "2 new · 1 in progress · 1 to verify"; empty when nothing is open |
| 65 | adminPages.test.jsx | "Needs attention" row (F08.3) | One line per company with open and overdue counts; tapping shows New / Acknowledged / In progress / To verify, each linking to that filtered list, plus "View their defects"; tapping again hides it |
| 66 | defectRecord.test.jsx | Tapping a history entry | Note and details appear only after tapping (raised: inspection, checklist item, assigned company; sign-off: 2 photos, confirmation) and hide again |
| 67 | defectRecord.test.jsx | Defect whose repair was rejected | Summary says "1 rejected repair"; the entry shows the reason |
| 68 | defectRecord.test.jsx | Defect page details | Checklist item, inspection link, raiser, location and due rule hidden until Show details; Hide details hides them |
| 69 | defectRecord.test.jsx | Prototype history data | Matches each status; defect 49 includes a rejection loop; entries in time order, none in the future |
| 70 | adminPages.test.jsx | Defect list row | Shows the failed checklist item, its section and "from INS-..." |
| 71 | adminPages.test.jsx | Search and export by checklist | Searching "LC-02" finds its defects; CSV has Checklist item and Inspection columns |
