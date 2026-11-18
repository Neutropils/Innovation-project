# Feature List and Acceptance Criteria

**Lift Spot-Check V2 (EMS problem statement 12b)**
Source: `IT Innovation Features.docx`. Who owns each feature, and the agreed changes to this list (merges, gaps, priority changes), are in [feature-dependencies.md](feature-dependencies.md#review-of-the-feature-list). Where the two disagree, feature-dependencies.md wins.

---

## Feature prioritisation

| Priority | Definition |
|----------|------------|
| P0 - Must have | Required for core inspection and rectification workflow. |
| P1 - Should have | Improves operational efficiency, usability or traceability. |
| P2 - Could have | Implement if time permits and EMS confirms the need. |

---

## Feature list and acceptance criteria

### F01 - Lift Inspection Management

Purpose: Enable inspectors to conduct and submit lift spot-checks digitally without repeatedly entering information already stored in the system.

| Subfeature | Functional requirement | Acceptance criteria | Priority |
|------------|------------------------|---------------------|----------|
| F01.1 Lift selection | Search and select a lift using its unique ID, block or location. | Selecting a lift displays the correct lift record and its assigned contractor. | P0 |
| F01.2 Lift information | Retrieve stored lift details automatically. | Lift ID, location and contractor are populated from the selected record. | P0 |
| F01.3 Digital checklist | Display checklist items grouped by inspection area. | The checklist contains the approved EMS inspection items and clearly identifies each item. | P0 |
| F01.4 Checklist responses | Allow inspectors to mark each item as Pass or Defect. | Each applicable item has a recorded result before the inspection can be submitted. | P0 |
| F01.5 Bulk checklist action | Allow inspectors to mark applicable items as All Pass. | The shortcut fills eligible items, and inspectors can subsequently change individual results. | P1 |
| F01.6 Defect capture | Record details when an item fails inspection. | A failed item can be linked to a defect description, location and severity where required. | P0 |
| F01.7 Photo evidence | Attach photographs and notes to findings. | Uploaded evidence is associated with the correct inspection or defect. | P1 |
| F01.8 Inspector identification | Record the inspector and inspection timestamp automatically. | Submitted records contain the authenticated inspector ID and timestamp. | P0 |
| F01.9 Draft saving | Save incomplete inspections for later completion. | A saved draft can be reopened without losing previously entered responses. | P1 |
| F01.10 Submission | Validate and submit the completed inspection. | Missing mandatory fields are identified, and a successful submission produces a unique inspection ID. | P0 |
| F01.11 Inspection history | Retrieve previous inspections for a lift. | Users can view historical records and their associated defects, subject to permissions. | P1 |
| F01.12 Inspection report | Generate a report of inspection findings. | The report includes lift details, inspector, date, checklist results and recorded defects. | P1 |
| F01.12 Fast Map Location | Direct user to the location of the lift. | Clicking "Find in map" under a specific lift directs the user to the real-world map location. | P1 |

### F02 - Defect Management and Assignment

Purpose: Ensure that defects discovered during inspections are recorded consistently, assigned to the correct lift company and tracked until resolution.

| Subfeature | Functional requirement | Acceptance criteria | Priority |
|------------|------------------------|---------------------|----------|
| F02.1 Automatic defect creation | Generate a defect record from a failed checklist item. | The defect is linked to the originating inspection and lift without duplicate data entry. | P0 |
| F02.2 Unique defect ID | Assign a unique identifier to each defect. | Every defect has a distinct ID that can be used to retrieve its record. | P0 |
| F02.3 Contractor grouping | Organise defects by responsible lift company. | Users can retrieve defects belonging to a selected contractor. | P0 |
| F02.4 Contractor assignment | Assign defects to the appropriate contractor. | An authorised user can assign a defect, and the responsible contractor is recorded. | P0 |
| F02.5 Due-date management | Set and display rectification deadlines. | Each assigned defect has a deadline according to the configured EMS rules. | P0 |
| F02.6 Severity classification | Record the severity of each defect. | Defects display the selected severity and follow any approved priority rules. | P1 |
| F02.7 Status tracking | Track defects through the rectification workflow. | The system records valid status transitions and prevents unauthorised closure. | P0 |
| F02.8 Search and filtering | Filter defects by contractor, status, severity, due date and lift. | Applying a filter returns only records matching the selected criteria. | P1 |
| F02.9 Overdue identification | Identify unresolved defects past their deadlines. | A defect is flagged as overdue when its deadline has passed and it remains unclosed. | P1 |
| F02.10 Rectification history | Maintain a record of defect-related changes. | Assignment changes, status updates and verification decisions are retrievable. | P1 |
| F02.11 Reopening defects | Return unsatisfactory repairs for further work. | An authorised inspector can reject a repair, provide a reason and return the defect to an actionable status. | P0 |

### F03 - Contractor Rectification and Sign-Off

Purpose: Establish accountability by requiring contractors to acknowledge assigned defects, record repair progress and provide evidence before inspectors verify completion.

| Subfeature | Functional requirement | Acceptance criteria | Priority |
|------------|------------------------|---------------------|----------|
| F03.1 Contractor authentication | Provide secure contractor access. | Contractors can access the system only through an authenticated account. | P0 |
| F03.2 Assigned-defect inbox | Display defects assigned to the logged-in contractor. | The contractor can view assigned defects with their current statuses and deadlines. | P0 |
| F03.3 Defect acknowledgement | Record acknowledgement of an assignment. | Acknowledging a defect updates its status and records the action timestamp. | P0 |
| F03.4 Defect details | Display the information needed to rectify a defect. | The contractor can access the defect description, lift location, deadline and permitted evidence. | P0 |
| F03.5 Progress updates | Record repair progress and completion notes. | Submitted updates are saved against the correct defect. | P0 |
| F03.6 Repair evidence upload | Allow contractors to submit photographs or supporting evidence. | Evidence is stored against the correct defect and is accessible to authorised inspectors. | P0 |
| F03.7 Electronic sign-off | Capture contractor confirmation of completed work. | The system records the signing user's identity, timestamp and confirmation. | P0 |
| F03.8 Inspector verification | Allow inspectors to approve or reject submitted repairs. | Approval advances the defect towards closure; rejection requires a reason and returns it for further work. | P0 |
| F03.9 Verified closure | Close a defect only after the required verification. | Contractor sign-off alone cannot close a defect awaiting inspector verification. | P0 |
| F03.10 Sign-off history | Retain the sign-off and verification records. | Authorised users can retrieve the contractor submission and final inspector decision. | P1 |

### F04 - Lift and Contractor Records

Purpose: Maintain consistent reference data so inspections and defects can be associated with the correct lifts and responsible companies.

| Subfeature | Functional requirement | Acceptance criteria | Priority |
|------------|------------------------|---------------------|----------|
| F04.1 Lift register | Maintain a central lift inventory. | Each lift has a unique ID, location and relevant contractor assignment. | P0 |
| F04.2 Contractor register | Maintain contractor information. | Authorised users can retrieve the correct contractor record and its assigned lifts. | P0 |
| F04.3 User management | Manage user accounts and roles. | Administrators can create, update and deactivate accounts according to permissions. | P1 |
| F04.4 Contract information | Store contract validity and relevant assignment details. | The system displays stored contract information where applicable to contractor assignment. | P1 |
| F04.5 Record validation | Validate lift and contractor records. | Duplicate IDs and missing mandatory fields are flagged before invalid records are accepted. | P1 |

### F05 - Bulk Import, Export and Reporting

Purpose: Reduce manual data entry and enable EMS to retrieve inspection and defect information for operational use.

| Subfeature | Functional requirement | Acceptance criteria | Priority |
|------------|------------------------|---------------------|----------|
| F05.1 Bulk lift import | Import multiple lift records using an agreed CSV or Excel template. | Valid records are imported and can subsequently be retrieved from the lift register. | P0 |
| F05.2 Import validation | Validate imported data before committing changes. | Invalid rows and duplicate records are identified, with errors explained to the user. | P1 |
| F05.3 Inspection export | Export inspection records and results. | The exported file contains the selected inspection records and their checklist results. | P0 |
| F05.4 Defect export | Export defect and rectification information. | The exported file contains defect IDs, lift IDs, contractors, deadlines and statuses. | P0 |
| F05.5 Import summary | Display the outcome of a bulk import. | The summary reports the number of accepted and rejected records. | P1 |
| F05.6 Report generation | Generate reports using selected filters or date ranges. | The generated report reflects the selected records and includes the applicable inspection or defect details. | P1 |
| F05.7 Hardcopy to softcopy | Scanning a physical paper transfers the information into a digitalised version. Has to have import from files / take a picture. | It should not require any typing and the details should be accurate. There should be no missing details. | P1 |

### F06 - Mobile Usability and Offline Operation

Purpose: Allow inspectors to use the application efficiently while conducting physical inspections, including locations with limited network connectivity.

| Subfeature | Functional requirement | Acceptance criteria | Priority |
|------------|------------------------|---------------------|----------|
| F06.1 Responsive interface | Adapt the interface to mobile screens. | Core workflows operate at a 390px viewport without horizontal scrolling. | P0 |
| F06.2 Touch-friendly controls | Provide appropriately sized buttons and inputs. | Checklist responses and primary actions can be selected without relying on desktop-only interactions. | P0 |
| F06.3 Automatic population | Reduce repetitive data entry. | Inspector, lift and contractor information is populated from existing records where available. | P0 |
| F06.4 Action feedback | Display save, upload, validation and submission results. | Users receive a clear success or error message after each relevant action. | P1 |
| F06.5 Offline draft storage | Store inspection drafts locally during connectivity loss. | An inspection draft remains available after the connection is lost and the application is reopened, within supported device conditions. | P1 |
| F06.6 Synchronisation | Synchronise locally stored records when connectivity returns. | Successfully synchronised records appear on the server without creating duplicate inspections. | P1 |

Offline storage and synchronisation require confirmation from EMS. If they are outside the agreed scope, prioritise reliable online inspections instead.

### F07 - Security and Audit Trail

Purpose: Protect inspection data and ensure that important actions are attributable to the users who performed them.

| Subfeature | Functional requirement | Acceptance criteria | Priority |
|------------|------------------------|---------------------|----------|
| F07.1 Authentication | Require login for protected operations. | Unauthenticated users cannot access protected inspection or contractor functions. | P0 |
| F07.2 Role-based access control | Restrict actions according to assigned roles. | Users cannot perform actions prohibited by their permissions. | P0 |
| F07.3 Audit logging | Record important system actions. | Relevant events include the actor, timestamp, action and affected record. | P1 |
| F07.4 Data protection | Restrict access to personal information and inspection evidence. | Unauthorised users cannot retrieve protected records through the interface or API. | P0 |
| F07.5 Data integrity | Preserve relationships between system records. | Inspections, defects, lifts and sign-offs reference valid records, and duplicate identifiers are rejected. | P0 |

### F08 - Operational Overview

Purpose: Provide managers with a concise view of outstanding work without introducing unnecessary analytics.

| Subfeature | Functional requirement | Acceptance criteria | Priority |
|------------|------------------------|---------------------|----------|
| F08.1 Open-defect count | Display the number of unresolved defects. | The displayed count matches the underlying defect records and the defined status rules. | P1 |
| F08.2 Overdue-defect count | Display unresolved defects past their deadlines. | The count matches defects flagged as overdue under the configured rules. | P1 |
| F08.3 Contractor overview | Summarise assigned defects by contractor and status. | The summary matches the underlying defect data for the selected filters. | P1 |
| F08.4 Inspection summary | Summarise inspections completed during a selected period. | The summary reflects the selected date range and inspection records. | P1 |

---

## Feature traceability to Problem Statement 12b

This table shows how the proposed features address the stated project requirements.

| Requirement from 12b | Related features | Intended outcome |
|----------------------|------------------|------------------|
| Inspector-led checklist | F01 | Inspectors can complete and submit digital spot-checks. |
| Bulk import and export | F05 | EMS can manage lift data and retrieve inspection or defect records in bulk. |
| Fewer pages | F01, F02, F03, F06 | Core workflows are consolidated into a small number of focused screens. |
| Defects organised by lift company | F02, F04 | Defects can be retrieved and managed by responsible contractor. |
| Due dates | F02 | Rectification deadlines and overdue work can be tracked. |
| Contractor sign-off | F03 | Contractors acknowledge assignments, submit evidence and sign off completed work. |
| Mobile-first design | F06 | Inspectors can use the application on phones without horizontal scrolling. |
