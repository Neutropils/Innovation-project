# Problem Statement

**Project:** Lift Spot-Check V2 - EM Services (EMS) problem statement 12b
**Event:** Techno Semester Hackathon, NYP School of IT x SCCCI & EM Services, Oct 2026
**Scope:** Proof of Concept, aiming for EMS's **Medium** fidelity level (see section 7)

---

## 1. Client

EM Services is one of Singapore's largest estate and property management companies, a joint venture between HDB and Keppel Land formed in 1988. It manages townships on behalf of Town Councils. Earlier NYP student teams have already built prototypes for EMS, and the 2026 problem statements build on that work.

---

## 2. Core Problem

> **The 12b challenge:** Inspectors need a faster way to run lift spot-checks and follow up on defects. Two earlier student prototypes and feedback from the EMS team are available to build on.

The earlier version of this problem (tracker item **4C.1 Lift Inspection**, EMS owner Daniel Koh) asked to *"digitalise inspection report after monthly lift servicing; automate report to contractor for follow-up"*. Two student prototypes were built. EMS never recorded a fidelity rating or feedback for either, and still asked for a version 2.

Comparing the old scope with the new brief shows what changed:

| 4C.1 (old) | 12b (new) | What it suggests |
|------------|-----------|------------------|
| Digitalise the report after monthly servicing | Inspector-led spot-check | Focus moves from recording the contractor's servicing to EMS checking it |
| Automate a report to the contractor | Defects by lift company, due dates, contractor sign-off | Sending a report was not enough; EMS wants the loop closed and contractors held accountable |
| (not mentioned) | Bulk import/export, fewer pages, mobile-first | Probably usability feedback on both prototypes |

The root failure is that **nothing closes the loop** between an inspector finding a defect and the responsible lift company fixing it. Without that loop there is no deadline, no proof of repair and no record of who signed off.

### What the 12b brief asks for

- An inspector-led checklist, with mass import and export, and fewer pages
- Defects sorted by lift company, with due dates and contractor sign-off
- Mobile-first design

---

## 3. What the Earlier Prototypes Taught Us

We tested both deployed prototypes on 28 Oct 2026, every role, at desktop width and at phone width (390px). Neither covers the brief on its own.

| 12b requirement | Prototype 1 (Lift Servicing Digitisation) | Prototype 2 (EM Services) |
|-----------------|-------------------------------------------|---------------------------|
| Inspector-led checklist | Weak: 8 generic items set by dropdown, defaulting to "N/A" | Strong: 25 real items in 3 sections on one page |
| Bulk import/export | Export only | CSV import and export (what it imports is unclear) |
| Fewer pages | 4-step flow plus popups | One-page checklist, but about 13 pages app-wide |
| Defects by lift company, due dates | Partial | Strong |
| Contractor sign-off | Missing - staff record fixes themselves | Strong: proof upload, e-sign, inspector verifies |
| Mobile-first | Desktop tables | Works on a phone |

**Prototype 1** stays focused on lifts but is slow: inspector name and contractor are typed by hand, each defect is a second form that retypes the lift, and its demo data is messy (for example "Blk Blk 5 Hougang" and mixed lift code formats).

**Prototype 2** has the right workflow but grew into a general estate-issues platform: resident complaints, AI risk alerts, photo crack detection, Mandarin translation and cost analytics. Its numbers also contradict each other ("0 reports in 30 days" next to "90 overdue jobs").

**Our position:** Version 2 combines Prototype 1's focus on lifts with Prototype 2's checklist and sign-off loop, on far fewer screens - 8 pages plus login (see [screens.md](screens.md)).

---

## 4. User Roles

These map to the roles in `backend/src/models/User.js`.

### Inspector (`inspector`) - EMS property officer
- Runs lift spot-checks on site, on a phone, often in motor rooms and lift pits.
- In both prototypes, they retype details the system already holds, or work through several screens per lift.
- **Primary need:** Pick a lift, mark each checklist item Pass or Defect on one page, attach photos and submit. Later, approve or reject the contractor's repair.

### Contractor (`contractor`) - lift company user
- Responsible for fixing defects on the lifts their company maintains.
- In 4C.1 they only received a report. Nothing recorded whether or when they acted on it.
- **Primary need:** An inbox of their own company's defects with deadlines, and a simple way to acknowledge, post progress, upload proof and sign off.

### EMS admin (`admin`) - EMS officer / manager
- Maintains the lift and contractor records and follows up on contractors who are late.
- **Primary need:** Bulk import of lift data, defects grouped by contractor with an overdue flag, and exports for reporting.

The `member` role is the default for self sign-up and has no part in the spot-check workflow (see flag 2 in [feature-dependencies.md](feature-dependencies.md#flags-for-team-discussion)).

---

## 5. End-to-End Workflows

The full diagram with owners is in [workflow-diagram.md](workflow-diagram.md).

### Workflow A - Spot-check (Inspector)

```
Inspector logs in and searches for a lift by ID, block or street
  -> Lift details and its contractor fill in from the lift register
  -> Inspector marks each checklist item Pass or Defect (or All Pass per section)
  -> For each Defect: description, location, severity and photos
  -> Inspector submits (or saves a draft and finishes later)
  -> System records inspector ID and timestamp and gives the inspection a unique ID
```

### Workflow B - Rectification and sign-off (Contractor -> Inspector)

```
System creates one defect per failed item
  -> Defect is assigned to the lift's contractor with a due date from its severity   [Open]
  -> Contractor sees it in their inbox and acknowledges                             [Acknowledged]
  -> Contractor posts progress notes                                                [In progress]
  -> Contractor uploads photo evidence and e-signs                                  [Pending verification]
  -> Inspector approves -> defect closes                                            [Closed]
     or rejects with a reason -> back to the contractor                             [In progress]
```

### Workflow C - Oversight and data (EMS admin)

```
Admin bulk imports lifts and contractors from a CSV or Excel template
  -> Import summary shows accepted and rejected rows with reasons
  -> Admin views defects grouped by contractor, filtered by status, severity and overdue
  -> Admin exports inspections and defects for reporting
  -> Overview shows open, overdue and completed-inspection counts
```

---

## 6. Highest-Risk and Most Complex Areas

### 6.1 - Defect Status Loop (High Complexity)
The whole value of 12b is the closed loop. Status changes come from three roles, and a contractor's sign-off must never close a defect on its own. If any page updates `defects.status` directly, the loop can be broken silently. All changes go through one transition service with tests for every allowed and forbidden move.

### 6.2 - Mobile Use on Site (High Risk)
Inspectors work in motor rooms and pits, on phones, possibly with weak signal. Every core page must work at 390px with no sideways scrolling and touch-sized buttons. Offline drafts are costly, so they stay P2 until EMS confirms they are needed.

### 6.3 - Bulk Import Data Quality (Medium-High Risk)
Prototype 1's demo data shows what real lift data can look like: duplicate words, mixed lift code formats, lifts given unit numbers. The import must reject duplicates and missing fields with a clear reason per row, rather than loading bad records that every other feature then depends on.

### 6.4 - Scope Creep (Medium Risk)
Prototype 2 shows how a lift app turns into a 13-page estate platform. "Fewer pages" is a requirement, not a preference. AI features and analytics dashboards stay out unless EMS asks for them.

### 6.5 - Contractor Data Isolation (Medium Complexity)
Several lift companies use the same system. A contractor must see only their own company's defects, through the interface and the API. This needs `users.contractor_id` and checks on every contractor route.

---

## 7. Fidelity Target

EMS rates prototypes on three levels:

| Level | Meaning |
|-------|---------|
| Low | Concept only, not connected to real data |
| **Medium (our target)** | Proof of concept, partly integrated and tested on masked or sample data |
| High | Pilot-ready, fully integrated with IEMS, TCMS and D365 |

---

## 8. Out of Scope for the PoC

- **Integration with IEMS, TCMS and D365** - this is what separates High fidelity from Medium.
- **Resident-facing features** - registration, complaints, notifications to residents and emergency contacts (Prototype 2 had these; 12b does not ask for them).
- **AI risk alerts, photo crack detection, translation and cost analytics** - same reason.
- **Scheduling the contractor's monthly servicing** - 12b moved the focus from the contractor's servicing (4C.1) to EMS's spot-checks.

To confirm with EMS: offline use, scanning paper forms into the system, and how due dates are set. These are listed as open questions in [feature-dependencies.md](feature-dependencies.md#open-questions-for-ems).

---

## 9. Success Criteria

12b gives no numeric targets, so these come from the acceptance criteria in our feature list.

| Criterion | Target |
|-----------|--------|
| Pages in the app | 8 plus login, against about 13 in Prototype 2 |
| A spot-check on a phone | One page, usable at 390px with no sideways scrolling |
| Retyped data per inspection | None - lift, contractor and inspector fill in from records |
| Defects without a contractor and due date | 0 - assigned automatically on submit |
| Defects closed without inspector approval | 0 - enforced by the status rules |
| Bulk import | Every rejected row reported with a reason |
| EMS fidelity rating | Medium |

---

## Sources

- `12_EM_Services_EMS.pdf` - EMS problem statements, Techno Semester Hackathon, Oct 2026
- `EMS_NYP_PS_Prototype_Tracker.xlsx` - joint NYP-EMS prototype tracker (item 4C.1)
- `Lift_SpotCheck_V2_Prototype_Review.docx` - our review of both earlier prototypes, 28 Oct 2026
- `IT Innovation Features.docx` - our feature list F01-F08 with acceptance criteria
