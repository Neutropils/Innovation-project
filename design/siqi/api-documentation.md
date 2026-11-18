# API Documentation - Si Qi

Defect and overview endpoints. All need a login (`Authorization: Bearer <token>`). Responses use the shared shape: `{ "success": true, "data": ... }` or `{ "success": false, "code": "...", "message": "..." }`.

The frontend runs in prototype mode by default: these same requests are answered in the browser by `frontend/src/prototype/` (`mockData.js`, `defectRecords.js`). On the real backend, the endpoints marked **built** are in `defectRoutes.js` / `defectController.js` / `defectService.js`; the others still answer `501 NOT_IMPLEMENTED`.

A defect object, as every endpoint below returns it:

```json
{
  "id": 88,
  "code": "DEF-000088",
  "inspectionId": 40,
  "inspectionCode": "INS-000040",
  "checklistItem": { "code": "LC-02", "section": "Lift car", "text": "Door safety edge or sensor reopens the doors" },
  "raisedBy": { "id": 1, "name": "Ivy Tan" },
  "liftId": 1,
  "liftCode": "LIFT-0427",
  "liftName": "Blk 512 Lift A",
  "item": "Door sensor not responding",
  "description": "Door sensor not responding",
  "location": "Lift car",
  "severity": "major",
  "status": "open",
  "contractorId": 1,
  "contractorName": "Apex Lifts",
  "dueDate": "2026-11-25",
  "overdue": false,
  "createdAt": "2026-11-18"
}
```

`inspectionCode`, `checklistItem` and `raisedBy` say where the defect came from. The prototype returns them; the backend detail endpoint does not yet.

Statuses: `open`, `acknowledged`, `in_progress`, `pending_verification`, `closed`. Severities: `critical`, `major`, `minor`.

---

## List defects (F02.3, F02.8, F02.9)

**Method:** `GET`
**Path:** `/api/defects?contractorId=&status=&severity=&overdue=&dueFrom=&dueTo=&liftId=&q=`
**Roles:** inspector, admin
**Query:** all optional. `status=active` means "not closed". `overdue=true`. `dueFrom` / `dueTo` are inclusive `YYYY-MM-DD`. `q` matches every word against defect number, lift, item and company.
**Request Body:** none
**Response:** `200` - array of defects, soonest due first.
```json
{ "success": true, "data": [ { "id": 88, "code": "DEF-000088", "...": "..." } ] }
```
**Error Codes:** `401` not logged in, `403 FORBIDDEN` contractor or member.
**Backend:** not built (prototype only).

## Export defects (F05.4, F05.6)

**Method:** `GET`
**Path:** `/api/defects/export` - same query as the list
**Roles:** inspector, admin
**Request Body:** none
**Response:** `200`, `text/csv`:
```
Defect,Lift,Location,Item,Severity,Status,Contractor,Due date,Overdue
"DEF-000088","LIFT-0427","Blk 512 Lift A","Door sensor not responding","major","open","Apex Lifts","2026-11-25","no"
```
**Error Codes:** `401`, `403 FORBIDDEN`.
**Backend:** not built (prototype only).

## Get one defect (F02.2) - built

**Method:** `GET`
**Path:** `/api/defects/:id`
**Roles:** inspector, admin, contractor (own company only)
**Request Body:** none
**Response:** `200` - one defect object (above).
**Error Codes:** `401`; `403 FORBIDDEN` member; `404 NOT_FOUND` unknown id, non-numeric id, or another company's defect for a contractor.

## Defect history (F02.10) - built

**Method:** `GET`
**Path:** `/api/defects/:id/history`
**Roles:** inspector, admin, contractor (own company only)
**Request Body:** none
**Response:** `200` - the defect's `defect_events`, oldest first. `actor` is `null` for a system action.
```json
{
  "success": true,
  "data": [
    { "id": 1, "action": "created", "fromStatus": null, "toStatus": "open", "note": null,
      "createdAt": "2026-11-12T01:14:00.000Z", "actor": { "id": 1, "name": "Ivy Tan", "role": "inspector" } },
    { "id": 7, "action": "reassigned", "fromStatus": null, "toStatus": null,
      "note": "From Apex Lifts to Summit Elevators. Reason: Contract changed",
      "createdAt": "2026-11-13T02:00:00.000Z", "actor": { "id": 3, "name": "Aisha Rahman", "role": "admin" } }
  ]
}
```
Each event may also carry `details` (prototype; the backend does not store these yet): `created` has `inspectionId`, `inspectionCode`, `checklistCode`, `checklistText`, `severity`, `dueDate`, `contractorName`; a sign-off has `photos` and `confirmed`; `reassigned` has `fromContractor` and `toContractor`.

`action` is `created`, `status_change`, `update_posted`, `reassigned`, or any other verb a teammate logs through `auditService.logEvent()`.
**Error Codes:** `401`; `403 FORBIDDEN` member; `404 NOT_FOUND` as above.

## Reassign a defect (F02.4) - built

**Method:** `PATCH`
**Path:** `/api/defects/:id/assign`
**Roles:** admin
**Request Body:**
```json
{ "contractorId": 2, "reason": "Lift moved to a new maintenance contract" }
```
`reason` is trimmed, 3-500 characters. Unknown fields are ignored.
**Response:** `200` - the updated defect. Status and due date are unchanged; a `reassigned` history event is written in the same transaction.
**Error Codes:**
- `401`; `403 FORBIDDEN` not admin
- `404 NOT_FOUND` unknown defect
- `409 DEFECT_CLOSED` the defect is closed
- `422 VALIDATION_ERROR` no contractor, no reason, the same contractor, or a missing / deactivated contractor

## Overview counts (F08.1-F08.4)

**Method:** `GET`
**Path:** `/api/overview?period=week|month|30d|all`
**Roles:** admin
**Request Body:** none
**Response:** `200` - counts for defects raised in the period, and inspections submitted in it.
```json
{
  "success": true,
  "data": {
    "period": "month",
    "open": 11,
    "overdue": 3,
    "pendingVerification": 2,
    "inspections": 42,
    "byContractor": [
      { "contractorId": 1, "name": "Apex Lifts", "open": 4, "overdue": 1,
        "byStatus": { "open": 1, "acknowledged": 1, "in_progress": 1, "pending_verification": 1 } }
    ]
  }
}
```
**Error Codes:** `401`; `403 FORBIDDEN` not admin.
**Backend:** not built (prototype only). The API contract in `feature-dependencies.md` says `?from=&to=`; the page sends `?period=`. Decide which before building it.

---

## Functions other teammates call (backend, `services/defectService.js`)

| Function | Called by | What it does |
|---|---|---|
| `createFromInspection(inspectionId, { transaction })` | Kandha's submit | One `open` defect per Defect answer, assigned to the lift's contractor, due date from severity. Safe to call twice. |
| `transition(defectId, toStatus, user, { note, reason, transaction })` | Jerald's acknowledge / update / sign-off / verify | The only way to change a status. Enforces the status table, role and company; logs history. |
| `isOverdue(defect, today)` | Anyone | Past due and not closed. |

Prototype twin of `createFromInspection`: `createDefectsFromInspection()` in `frontend/src/prototype/defectRecords.js`, called by the prototype inspection submit.
