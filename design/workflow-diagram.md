# Workflow Diagram

**Lift Spot-Check V2 (EMS problem statement 12b)**

How one spot-check becomes a closed defect, and which teammate owns each step. Each colour is one person's slice, so every arrow between two colours is an API two people must agree on before coding.

> Open this file with **Markdown: Open Preview** (`Ctrl+Shift+V`) in VS Code. The diagrams need the *Markdown Preview Mermaid Support* extension - VS Code offers it automatically because it is listed in `.vscode/extensions.json`. GitHub renders them without any extension. Image versions: [images/workflow.png](images/workflow.png), [images/defect-status.png](images/defect-status.png).

---

## End-to-end flow

```mermaid
flowchart TB
    A1["<b>Set up records</b><br/>bulk import lifts and contractors<br/><i>EMS admin - Kwan</i>"]
    I1["<b>Pick a lift</b><br/>lift, contractor and inspector auto-filled<br/><i>Inspector - Kandha</i>"]
    I2["<b>Run checklist</b><br/>Pass or Defect per item, photos, submit<br/><i>Inspector - Kandha</i>"]
    S1["<b>Create defects</b><br/>one per failed item, assigned to the lift's contractor<br/><i>System - Si Qi</i>"]
    C1["<b>Acknowledge</b><br/>sees it in own inbox<br/><i>Contractor - Jerald</i>"]
    C2["<b>Repair and sign off</b><br/>progress notes, photo evidence, e-sign<br/><i>Contractor - Jerald</i>"]
    I3{"<b>Approve repair?</b><br/><i>Inspector - Kandha</i>"}
    S2(["<b>Closed</b><br/>only after approval<br/><i>System - Si Qi</i>"])
    R1["<b>Returned for rework</b><br/>reason recorded, back to In progress<br/><i>System - Si Qi</i>"]
    A2["<b>Track and export</b><br/>by contractor, status, overdue<br/><i>EMS admin - Kwan</i>"]

    A1 -->|lift register| I1
    I1 --> I2
    I2 -->|submit| S1
    S1 -->|"status: Open, due date set"| C1
    C1 -->|"status: In progress"| C2
    C2 -->|"status: Pending verification"| I3
    I3 -->|approve| S2
    I3 -->|reject| R1
    R1 --> C2
    S1 -.->|reads every defect| A2

    classDef kwan fill:#efedff,stroke:#6b5fc7
    classDef kandha fill:#e5f4e4,stroke:#3f8f3a
    classDef siqi fill:#e7f1fb,stroke:#2f6fb5
    classDef jerald fill:#f9eeda,stroke:#b7791f
    classDef closed fill:#e7f1fb,stroke:#2f6fb5,stroke-width:3px
    class A1,A2 kwan
    class I1,I2,I3 kandha
    class S1,R1 siqi
    class C1,C2 jerald
    class S2 closed
```

| Colour | Owner |
|--------|-------|
| Purple | Kwan - EMS admin, records, import |
| Green | Kandha - inspector |
| Blue | Si Qi - defect system, overview |
| Amber | Jerald - contractor |

---

## Defect status lifecycle

A defect has five statuses. **Overdue is a flag, not a status**: `due_date < today` and status is not `closed`.

```mermaid
stateDiagram-v2
    [*] --> open : inspection submitted (system)
    open --> acknowledged : contractor acknowledges
    acknowledged --> in_progress : contractor posts first update
    in_progress --> pending_verification : contractor uploads evidence and e-signs
    pending_verification --> closed : inspector or admin approves
    pending_verification --> in_progress : inspector or admin rejects (reason required)
    closed --> [*]
```

| From | To | Who | Must include |
|------|----|-----|--------------|
| (new) | `open` | System, on inspection submit | Failed item, lift's contractor, due date from severity |
| `open` | `acknowledged` | Contractor of that company | Timestamp |
| `acknowledged` | `in_progress` | Contractor of that company | First progress note |
| `in_progress` | `pending_verification` | Contractor of that company | Evidence photo and e-sign |
| `pending_verification` | `closed` | Inspector or admin | Approval |
| `pending_verification` | `in_progress` | Inspector or admin | Rejection reason |
| Any except `closed` | Same status, new contractor | Admin | Reassignment reason |

Rules every owner codes against:

- Every move writes one `defect_events` row (actor, time, action, from, to, note).
- All code changes status through Si Qi's `defectService.transition()`. Nobody updates `defects.status` directly.
- Contractor sign-off alone can never reach `closed` (F03.9).
