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
| 9 | adminPages.test.jsx | Overview counts and by-contractor table | Overdue tile shows the overdue count and links to /defects?overdue=true; contractor rows link to their filtered list |
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
| 35 | adminPages.test.jsx | Lift company group header | Expanded by default; tapping the header folds and unfolds its defects |
| 36 | adminPages.test.jsx | Collapse all / Expand all | Hides every defect, then shows them all again |
| 37 | adminPages.test.jsx | Expanded company view | Shows contact (Call/Email), active / overdue / critical / to-verify counts, and "Show only" narrows the list to that company |
| 38 | adminPages.test.jsx | Reported and Due time ranges | Last 7 days, due within 7 days and a custom From/To range each return only matching defects |
| 39 | adminPages.test.jsx | Custom reported range in the panel | From/To appear only for "Custom range"; Reported and Due filters show as chips |
