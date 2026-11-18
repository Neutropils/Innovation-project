# Use Cases - Si Qi

Scope: defect management and the EMS overview - F02.1-F02.10, F05.4 defect export, F05.6 filtered reports, F08.1-F08.4 ([feature list](../feature_list.md)). Screens: Defects (`/defects`), Overview (`/overview`) and the top of Defect detail (`/defects/:id`).

Actors: **Inspector** (EMS staff on site), **EMS admin** (EMS officer, the `admin` role), **Contractor** (lift company staff), **System**.

## Use Case 1 - Raise defects from a submitted inspection (F02.1, F02.2, F02.5, F02.6)

**Actor:** System (triggered by the Inspector)
**Trigger:** An inspector submits a spot-check with one or more items marked Defect.
**Main Flow:**
1. The inspection is validated: every item answered, every Defect item has a description and severity.
2. For each Defect item, one defect is created with status `open`, linked to the inspection, the checklist answer and the lift.
3. It is assigned to the lift's contractor, taken from the lift register - nothing is typed twice.
4. Its due date is set from its severity (critical 1 day, major 7, minor 14 - placeholders until EMS confirms).
5. It gets a unique number (`DEF-000123`) and a "Defect raised" entry in its history.
6. It appears on the Defects page and in the contractor's inbox.

**Alternative/Edge-Case Flows:**
- All items pass: no defects are created.
- The checklist is incomplete: submit is refused (422), the missing items are named, nothing is created.
- Submit is sent twice: the second is refused (409); an answer that already has a defect is never given a second one.

## Use Case 2 - Find the defects that need action (F02.3, F02.8, F02.9)

**Actor:** EMS admin or Inspector
**Trigger:** Opens Defects, or taps a count on the Overview.
**Main Flow:**
1. Defects are listed grouped by lift company, the company with the most first.
2. Each row shows the defect number, lift, item, severity, status and due date; overdue ones are flagged in red.
3. The user narrows the list with Filters - contractor, status, severity, overdue only, due from / due to - or types in Search (defect number, lift code, block, item or company).
4. Each filter shows as a chip that removes itself; the filters stay in the URL, so a filtered list can be shared or bookmarked.
5. Tapping a row opens the defect.

**Alternative/Edge-Case Flows:**
- Nothing matches: "No defects match these filters" with Clear filters.
- "Due from" is after "Due to": a warning under the dates.
- Offline: the last list loaded is shown with an offline banner, and search still works on it.

## Use Case 3 - Reassign a defect to another company (F02.4)

**Actor:** EMS admin
**Trigger:** A defect was assigned to the wrong company (e.g. the lift moved to a new maintenance contract).
**Main Flow:**
1. The admin opens the defect and taps Reassign.
2. They choose the new company (the current one is not offered) and type a reason.
3. The defect moves to the new company; its status and due date stay the same.
4. It leaves the old company's inbox and appears in the new one's; the Defects list and Overview follow.
5. The history records "Reassigned" with who, when, from, to and the reason.

**Alternative/Edge-Case Flows:**
- No company or no reason: the form says what is missing and sends nothing.
- The defect is closed: Reassign is not offered (the API refuses with 409).
- Inspector or contractor: Reassign is not offered (the API refuses with 403).

## Use Case 4 - See what happened to a defect (F02.7, F02.10)

**Actor:** EMS admin, Inspector, or the assigned Contractor
**Trigger:** Opens a defect.
**Main Flow:**
1. The page shows the defect's status badge, due date and assigned company.
2. History lists every change oldest first: raised, acknowledged, work started, signed off, rejected (with the reason), approved, reassigned - each with who did it and when.

**Alternative/Edge-Case Flows:**
- A contractor opens another company's defect: "not found".
- A status change that skips a step, or a contractor trying to close a defect, is refused by the status rules (`defectService.transition()`).

## Use Case 5 - Export a defect report (F05.4, F05.6)

**Actor:** EMS admin or Inspector
**Trigger:** Needs a file for a meeting or a contractor.
**Main Flow:**
1. The user sets filters, a search and/or a due-date range on the Defects page.
2. Taps Export CSV.
3. The file has one row per defect on screen: defect number, lift, item, severity, status, contractor, due date and overdue flag.

**Alternative/Edge-Case Flows:**
- No defects on screen, or offline: Export is turned off.

## Use Case 6 - Check how the contractors are doing (F08.1-F08.4)

**Actor:** EMS admin (the Overview is their home page)
**Trigger:** Signs in, or picks a period (this week, this month, last 30 days, all time).
**Main Flow:**
1. A headline says what to do first, e.g. "3 overdue across 2 contractors - Apex Lifts needs chasing first."
2. Four counts: Overdue, To verify, Open defects, Inspections submitted in the period.
3. "Needs attention" lists each company, most overdue first, with its open and overdue counts and a status breakdown ("2 new · 1 in progress · 1 to verify").
4. Every count and company links to the Defects page with the matching filter.

**Alternative/Edge-Case Flows:**
- Nothing open: "All clear".
- Offline: the last counts are shown with an offline banner.
