# ER Diagram

**Lift Spot-Check V2 (EMS problem statement 12b)**

Planned tables for the P0 and P1 features. `users` already exists; everything else is new and lands in one schema PR (see [feature-dependencies.md](feature-dependencies.md), Wave 0). Columns are snake_case, as in the migrations.

> Preview in VS Code with `Ctrl+Shift+V` (needs the *Markdown Preview Mermaid Support* extension recommended in `.vscode/extensions.json`). No extension? Open the image version: [images/er-diagram.png](images/er-diagram.png).

```mermaid
erDiagram
    contractors ||--o{ lifts : "maintains"
    contractors ||--o{ users : "employs"
    contractors ||--o{ defects : "is assigned"
    lifts ||--o{ inspections : "is inspected in"
    lifts ||--o{ defects : "has"
    users ||--o{ inspections : "performs"
    inspections ||--|{ inspection_results : "contains"
    checklist_items ||--o{ inspection_results : "is answered by"
    inspection_results ||--o| defects : "raises"
    inspections ||--o{ defects : "produces"
    defects ||--o{ defect_updates : "has"
    defects ||--o{ signoffs : "has"
    defects ||--o{ defect_events : "is logged in"
    users ||--o{ defect_events : "acts in"
    inspection_results ||--o{ attachments : "has photos"
    defect_updates ||--o{ attachments : "has evidence"

    users {
        INTEGER id PK
        INTEGER contractor_id FK "new - only for contractor role"
        STRING name
        STRING email
        STRING password
        ENUM role "admin, inspector, contractor, member"
        BOOLEAN is_active
        DATE last_login_at
    }

    contractors {
        INTEGER id PK
        STRING name
        STRING contact_name
        STRING contact_email
        STRING contact_phone
        DATEONLY contract_start "P2"
        DATEONLY contract_end "P2"
    }

    lifts {
        INTEGER id PK
        STRING lift_code UK
        STRING block
        STRING street
        STRING town
        STRING postal_code
        INTEGER contractor_id FK
        BOOLEAN is_active
    }

    checklist_items {
        INTEGER id PK
        STRING section "motor room, lift car, hoistway and pit"
        STRING code UK
        STRING description
        INTEGER sort_order
        BOOLEAN is_active
    }

    inspections {
        INTEGER id PK
        INTEGER lift_id FK
        INTEGER inspector_id FK
        ENUM status "draft, submitted"
        TEXT remarks
        DATE submitted_at
    }

    inspection_results {
        INTEGER id PK
        INTEGER inspection_id FK
        INTEGER checklist_item_id FK
        ENUM result "pass, defect, na"
        TEXT note
    }

    defects {
        INTEGER id PK
        INTEGER inspection_id FK
        INTEGER inspection_result_id FK
        INTEGER lift_id FK
        INTEGER contractor_id FK
        TEXT description
        STRING location
        ENUM severity "critical, major, minor"
        ENUM status "open ... closed"
        DATEONLY due_date
        DATE closed_at
    }

    defect_updates {
        INTEGER id PK
        INTEGER defect_id FK
        INTEGER user_id FK
        TEXT note
    }

    attachments {
        INTEGER id PK
        INTEGER inspection_result_id FK "nullable"
        INTEGER defect_update_id FK "nullable"
        INTEGER uploaded_by FK
        STRING url
        STRING mime_type
    }

    signoffs {
        INTEGER id PK
        INTEGER defect_id FK
        INTEGER signed_by FK
        DATE signed_at
        INTEGER verified_by FK
        DATE verified_at
        ENUM decision "approved, rejected"
        TEXT reason
    }

    defect_events {
        INTEGER id PK
        INTEGER defect_id FK
        INTEGER actor_id FK
        STRING action
        STRING from_status
        STRING to_status
        TEXT note
    }
```

All tables also have `created_at` and `updated_at` (Sequelize `underscored: true`); they are left out above to keep the diagram readable.

## Who owns each table

| Table | Owner | Written by | Read by |
|-------|-------|-----------|---------|
| `users` (+ `contractor_id`) | Kwan | Kwan | Everyone |
| `contractors` | Kwan | Kwan | Everyone |
| `lifts` | Kwan | Kwan | Everyone |
| `checklist_items` | Kandha | Seed only | Kandha |
| `inspections` | Kandha | Kandha | Si Qi (reports), Kwan (audit) |
| `inspection_results` | Kandha | Kandha | Si Qi (defect creation) |
| `defects` | Si Qi | Si Qi's `transition()` only | Everyone |
| `defect_updates` | Jerald | Jerald | Si Qi (history) |
| `attachments` | Jerald | Jerald's upload service (used by Kandha too) | Everyone |
| `signoffs` | Jerald | Jerald | Si Qi (history) |
| `defect_events` | Kwan | Si Qi's `transition()` via Kwan's `logEvent()` | Si Qi, Jerald (history screens) |

Design note: `attachments` uses two nullable foreign keys instead of one polymorphic `owner_type` / `owner_id` pair, so the database can enforce both links.
