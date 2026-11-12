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
