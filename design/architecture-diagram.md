# Architecture Diagram

**Lift Spot-Check V2 (EMS problem statement 12b)** - planned. Hosting for the frontend and backend is not decided yet; Vercel and Render are shown because the lecturer's reference project uses them.

> Preview in VS Code with `Ctrl+Shift+V` (needs the *Markdown Preview Mermaid Support* extension recommended in `.vscode/extensions.json`). No extension? Open the image version: [images/architecture.png](images/architecture.png).

```mermaid
graph LR
    Inspector([Inspector<br/>phone])
    Contractor([Contractor<br/>phone])
    Admin([EMS admin<br/>desktop])

    subgraph Vercel["Vercel (planned)"]
        FE["React + Vite<br/>Frontend"]
    end

    subgraph Render["Render (planned)"]
        BE["Node.js / Express<br/>Backend"]
    end

    subgraph Supabase
        DB[("PostgreSQL<br/>Database")]
        ST["Storage<br/>inspection + repair photos<br/>(if chosen - see flag 3)"]
    end

    Inspector -->|HTTPS| FE
    Contractor -->|HTTPS| FE
    Admin -->|HTTPS| FE
    FE -->|"REST API calls (Axios, Bearer JWT)"| BE
    BE -->|"Sequelize ORM queries (SSL)"| DB
    BE -->|"Photo upload"| ST
    ST -->|"Photo URL"| FE
```

Flag 3 refers to [feature-dependencies.md](feature-dependencies.md#flags-for-team-discussion). If the team picks local disk instead, the Storage box goes away and photos are served by the backend.
