# Innovation project

Lift Spot-Check V2 for EM Services (problem statement 12b): a mobile-first app where inspectors run lift spot-checks, defects go straight to the responsible lift company, and contractors fix and sign them off before an inspector closes them.

## Task Allocation

Each member owns one end-to-end slice (tables, API, pages, tests). Full breakdown, dependencies and build order: [design/feature-dependencies.md](design/feature-dependencies.md).

| Member | GitHub | Scope | Features |
| ------ | ------ | ----- | -------- |
| Kwan | | Lift and contractor records, bulk import, security | Lift register and search, contractor register, user management, bulk lift import with validation, audit log, role-based access, seed data, deployment |
| Kandha | | Inspection (inspector) | Digital checklist, Pass/Defect and All Pass, defect capture with photos, drafts, submission, inspection history, report and export |
| Si Qi | | Defect management and overview (EMS) | Defect creation and assignment, due dates and severity, status rules, filters, overdue flag, defect export, overview counts |
| Jerald | | Contractor rectification and sign-off | Contractor inbox, acknowledge, progress updates, repair evidence upload, e-sign, inspector verification and closure, sign-off history |
| Group | | Shared infrastructure | Login, JWT and role guards (done), mobile layout |

### Design docs

| Doc | What it shows |
| --- | ------------- |
| [Workflow diagram](design/workflow-diagram.md) | Inspection to closed defect, one lane per member, and the defect status rules |
| [Screens](design/screens.md) | Navigation map and a phone-width wireframe of every page |
| [ER diagram](design/er-diagram.md) | Planned tables and who owns each one |
| [Architecture diagram](design/architecture-diagram.md) | Frontend, backend, database and photo storage |
| [Feature dependencies](design/feature-dependencies.md) | Ownership, review of the feature list, cross-team contracts, build waves, open questions for EMS |

The diagrams are Mermaid. Open any of these files in VS Code and press `Ctrl+Shift+V` - accept the recommended *Markdown Preview Mermaid Support* extension the first time. GitHub renders them without any extension.

## Getting started

### Prerequisites

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) 20 or newer (LTS recommended). Check with `node -v`.
- A PostgreSQL database (e.g. a free [Supabase](https://supabase.com/) project). Only needed for features that touch the database.

### Setup

```bash
git clone https://github.com/Neutropils/Innovation-project.git
cd Innovation-project

# Backend
cd backend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# then fill in DATABASE_URL in backend/.env

# Frontend
cd ../frontend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

### Run

Use two terminals:

```bash
# Terminal 1 - API on http://localhost:3000 (health check: /health)
cd backend
npm run dev

# Terminal 2 - web app on http://localhost:5173
cd frontend
npm run dev
```

The frontend proxies `/api/*` to the backend, so no extra config is needed in development.

### Test

```bash
cd backend  && npm test
cd frontend && npm test
```

`npm run db:test` in `backend/` checks that your `DATABASE_URL` works and lists the tables.

To get a working login on a fresh database, run `npm run db:migrate` once, then create accounts with
`npm run db:create-user -- --email <email> --name "<name>" --role <admin|inspector|contractor|member>`.
The script prints the password once and stores only its bcrypt hash - share it privately, never commit it.

## Project structure

```
backend/
  src/
    config/        Database connection (Sequelize)
    controllers/   Handle req/res, call services, return responses
    middleware/    authenticate (JWT) and authorise(role) guards
    models/        Sequelize models + all associations in models/index.js
    routes/        Express routers, mounted under /api in routes/index.js
    services/      Business logic (no req/res - easy to unit test)
    utils/         Response helpers: success, created, error, notFound, forbidden
    validators/    Yup schemas for request bodies
  migrations/      Database table definitions
  seeders/         Sample data
  tests/           shared/ + one folder per teammate

frontend/
  src/
    api/           Axios instance (adds the JWT, redirects to /login on 401)
    components/    Shared components; components/ui/ for shadcn/ui
    context/       AuthContext (user, token, login, logout)
    hooks/         Custom hooks (useAuth)
    layouts/       AppLayout - sidebar + page outlet
    lib/           Helpers (cn, formatCurrency, formatDate)
    pages/         One folder per feature area
    router/        ProtectedRoute, RoleRoute, NAV_ROUTES
    schemas/       Yup schemas for forms
  tests/           shared/ + one folder per teammate

design/            Problem statement, architecture, per-teammate design docs
```

### Adding a feature (backend)

1. Model in `models/` → register it and its associations in `models/index.js`
2. Validator in `validators/`
3. Business logic in `services/`
4. Controller in `controllers/` (use the helpers in `utils/`)
5. Router in `routes/` → mount it in `routes/index.js`

### Adding a page (frontend)

1. Page component in `pages/<area>/`
2. Sidebar entry in `router/routes.js` (`NAV_ROUTES`)
3. `<Route>` in `App.jsx` - wrap in `<RoleRoute roles={[...]}>` if it's role-restricted

### Your own folders

Copy `backend/tests/_template`, `frontend/tests/_template` and `design/_template` to a folder with your name, e.g. `backend/tests/alex/`.

## Using AI assistants

[AGENTS.md](AGENTS.md) tells AI tools (Claude Code, Copilot, Cursor, Codex, Gemini CLI) how this project is structured and what the rules are. Most of them read it automatically; Claude Code reads it via [CLAUDE.md](CLAUDE.md).

### Claude Code

When you first open the repo, Claude Code asks you to trust the folder and install the team's plugins (superpowers, frontend-design, supabase, vercel, figma, document-skills) - say yes. Then use these project skills:

| Command | What it does |
|---|---|
| `/setup` | First-time setup: installs everything, creates `.env` files, runs tests, checks the database, makes your personal folders |
| `/new-endpoint <resource>` | Adds a backend resource: model, migration, validator, service, controller, route and tests |
| `/new-page <page>` | Adds a frontend page: component, sidebar entry, route and test |
| `/pr-ready` | Checks for secrets, runs tests and build, merges `main`, commits, pushes and gives you the PR link |

Shared settings in [.claude/settings.json](.claude/settings.json) auto-approve safe commands (npm, git status/diff/commit) and block reading `.env` files and force-pushing. Put personal overrides in `.claude/settings.local.json` (git-ignored).

### Other AI tools

To get set up, clone the repo, open it in your AI tool and paste:

> Read AGENTS.md and set up this project for me following the First-Time Setup section. Stop and ask me when you need the DATABASE_URL.

When starting a task:

> Read AGENTS.md. Create a branch for <task>, implement it following the project conventions, add tests in my tests/<your-name>/ folders, and run the tests before you finish.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before making changes.
