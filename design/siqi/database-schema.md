# Database Schema - Si Qi

I own the `defects` table and the due-date rules. I read `defect_events` (owned by Kwan, written only through `auditService.logEvent()`) for the history. Full diagram: [er-diagram.md](../er-diagram.md). Columns are snake_case in the database and camelCase in the Sequelize model (`backend/src/models/Defect.js`).

## Table: defects

One defect raised from one failed checklist answer (F02).

| Field | Type | Constraints |
|-------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT. Shown as `DEF-000123`, never stored separately |
| inspection_id | INTEGER | NOT NULL, FK -> inspections.id |
| inspection_result_id | INTEGER | NOT NULL, UNIQUE, FK -> inspection_results.id - one defect per failed answer, so a repeated submit can't create two |
| lift_id | INTEGER | NOT NULL, FK -> lifts.id |
| contractor_id | INTEGER | NOT NULL, FK -> contractors.id - set from the lift on creation; changed only by reassignment |
| description | TEXT | NOT NULL - copied from the inspector's answer |
| location | STRING(150) | NULL - defaults to the checklist section |
| severity | ENUM('critical', 'major', 'minor') | NOT NULL |
| status | ENUM('open', 'acknowledged', 'in_progress', 'pending_verification', 'closed') | NOT NULL, DEFAULT 'open' - changed only through `defectService.transition()` |
| due_date | DATEONLY | NOT NULL - creation date + days for the severity |
| closed_at | DATE | NULL - set when the status becomes `closed` |
| created_at | DATE | NOT NULL |
| updated_at | DATE | NOT NULL |

**Rules kept in code, not columns:**
- **Overdue** is worked out, not stored: `due_date` is before today and `status` is not `closed` (`defectService.isOverdue`).
- **Due dates** by severity, in `SEVERITY_DUE_DAYS`: critical 1 day, major 7, minor 14. These are placeholders until EMS confirms them; changing them is a one-line edit.
- **Status moves** allowed, in `TRANSITIONS` (see [workflow-diagram.md](../workflow-diagram.md)):

| From | To | Who |
|------|----|-----|
| `open` | `acknowledged` | Contractor of that company |
| `acknowledged` | `in_progress` | Contractor of that company |
| `in_progress` | `pending_verification` | Contractor of that company |
| `pending_verification` | `closed` | Inspector or admin |
| `pending_verification` | `in_progress` | Inspector or admin, with a reason |
| Any except `closed` | same status, new `contractor_id` | Admin, with a reason (reassignment) |

## Table: defect_events (read only - owner Kwan)

Append-only history of every change to a defect (F02.10). Read by `GET /api/defects/:id/history`.

| Field | Type | Constraints |
|-------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT |
| defect_id | INTEGER | NOT NULL, FK -> defects.id |
| actor_id | INTEGER | NULL, FK -> users.id - null for a system action |
| action | STRING(50) | NOT NULL - `created`, `status_change`, `reassigned`, ... |
| from_status | STRING(30) | NULL |
| to_status | STRING(30) | NULL |
| note | TEXT | NULL - rejection reason, or "From A to B. Reason: ..." for a reassignment |
| created_at | DATE | NOT NULL - no updated_at: events are never edited |

What my code writes here (through `logEvent`, in the same transaction as the change):

| When | action | from / to | note |
|------|--------|-----------|------|
| Defect created on submit | `created` | - / `open` | - |
| Any status move | `status_change` | old / new | reason or note, if given |
| Reassignment | `reassigned` | - / - | `From Apex Lifts to Summit Elevators. Reason: ...` |
