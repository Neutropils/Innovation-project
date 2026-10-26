# AGENTS.md

Instructions for AI coding assistants (Claude Code, GitHub Copilot, Cursor, Codex, Gemini CLI, etc.) working in this repository. Humans: this is also a quick reference for how the project is laid out.

---

## Project Overview

**Innovation project** - _<one or two sentences: what the app does and who it's for. Fill in once decided.>_

It's a group project. Several teammates work in parallel, each owning a feature area. Keep changes focused on the task you were given and don't restructure shared code unless asked.

---

## Claude Code Skills

Claude Code users have project skills in `.claude/skills/` that walk through the common tasks step by step: `/setup`, `/new-endpoint`, `/new-page` and `/pr-ready`. Other AI tools can read those `SKILL.md` files as checklists for the same tasks.

---

## First-Time Setup

When a teammate asks you to "set up the project" or "get it running", do this:

1. Check Node is 20 or newer: `node -v`
2. Backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env    # PowerShell: Copy-Item .env.example .env
   ```
   Ask the teammate for the `DATABASE_URL` - it's shared privately by the team, never committed. Leave `DEV_JWT_SECRET` as the value in `.env.example` so tokens work across everyone's machines.
3. Frontend:
   ```bash
   cd frontend
   npm install
   cp .env.example .env    # PowerShell: Copy-Item .env.example .env
   ```
4. Verify:
   - `cd backend && npm test` and `cd frontend && npm test` both pass
   - `cd backend && npm run db:test` connects (only works once `DATABASE_URL` is set)
5. Run (two terminals):
   - `cd backend && npm run dev` → http://localhost:3000/health returns `{"status":"ok"}`
   - `cd frontend && npm run dev` → http://localhost:5173

Do **not** commit `.env`, run `git push` to `main`, or install global packages as part of setup.

---

## Commands

| Where | Command | What it does |
|---|---|---|
| `backend/` | `npm run dev` | API with auto-restart (nodemon), port 3000 |
| `backend/` | `npm start` | API without auto-restart |
| `backend/` | `npm test` | Jest + Supertest |
| `backend/` | `npm run db:test` | Check database connection, list tables |
| `frontend/` | `npm run dev` | Vite dev server, port 5173, proxies `/api` → `localhost:3000` |
| `frontend/` | `npm run build` | Production build - must succeed (CI checks it) |
| `frontend/` | `npm test` | Jest + React Testing Library |

There is no root `package.json`. Always `cd` into `backend/` or `frontend/` first.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router 6, Tailwind CSS 3, shadcn/ui, Formik, Yup, Axios, lucide-react |
| Backend | Node.js + Express 4 (CommonJS `require`), Sequelize 6, Yup, JWT (jsonwebtoken), bcryptjs |
| Database | PostgreSQL (hosted on Supabase, SSL required) |
| Testing | Jest in both; Supertest for API; React Testing Library for UI |
| CI | GitHub Actions - runs backend tests, frontend tests and frontend build on every PR |

Don't add new libraries when an existing one already covers the need (e.g. use Yup, not Zod; Axios, not fetch wrappers; Tailwind, not CSS-in-JS). If a new dependency is genuinely needed, say so and explain why.

---

## Repository Structure

```
backend/
  src/
    index.js       Express app: CORS, JSON, /health, /api routes, 404 + error handler
    config/        Sequelize connection (exports the sequelize instance + testConnection)
    models/        One file per model; ALL associations live in models/index.js
    routes/        One router per resource; mounted in routes/index.js under /api
    controllers/   Handle req/res only; call services; respond via utils helpers
    services/      Business logic - no req/res, so it's unit-testable
    middleware/    authenticate (verifies JWT) and authorise(...roles)
    validators/    Yup schemas for request bodies
    utils/         success, created, error, notFound, forbidden response helpers
  migrations/      Table definitions (snake_case columns)
  seeders/         Sample data
  tests/
    shared/        Tests for shared code
    _template/     Copy to tests/<teammate-name>/

frontend/
  src/
    main.jsx       Root: BrowserRouter > AuthProvider > App
    App.jsx        All <Route>s
    api/           Axios instance - adds Bearer token, redirects to /login on 401
    components/    Shared components; components/ui/ = shadcn/ui primitives
    context/       AuthContext (user, token, login, logout)
    hooks/         useAuth and other custom hooks
    layouts/       AppLayout - sidebar + <Outlet />
    lib/           cn(), formatCurrency(), formatDate()
    pages/<area>/  One folder per feature area
    router/        ProtectedRoute, RoleRoute, NAV_ROUTES, getRoleHome
    schemas/       Yup schemas for forms
  tests/
    setup/         Jest setup (jest-dom)
    shared/        Tests for shared code
    _template/     Copy to tests/<teammate-name>/

design/
  problem-statement.md, architecture.md   Group docs
  _template/                              Copy to design/<teammate-name>/
```

---

## Conventions

### Backend

- **Layering:** route → (authenticate / authorise middleware) → controller → service → model. Controllers must not contain business logic; services must not touch `req`/`res`.
- **Response shape** - always use the helpers in `src/utils`:
  - Success: `{ success: true, data }`
  - Error: `{ success: false, code: 'SOME_CODE', message: '...' }`
  - Validation failure: status 422, code `VALIDATION_ERROR`
- **Validation:** validate every request body with a Yup schema from `src/validators` using `{ abortEarly: false, stripUnknown: true }`.
- **Auth:** protect routes with `authenticate`; restrict by role with `authorise('admin')`. `req.user` holds `{ sub, name, email, role }`.
- **Models:** `underscored: true`, explicit `tableName`, snake_case columns. Register every new model and its associations in `models/index.js`.
- **Module style:** CommonJS (`require` / `module.exports`). Don't convert to ESM.

### Frontend

- **Imports:** use the `@/` alias (`@/components/ui/button`), not long relative paths.
- **API calls:** always use the shared instance from `@/api`. Don't create new Axios instances or call `fetch` directly. Response data is at `res.data.data`.
- **New page:** create it in `pages/<area>/`, add a sidebar entry to `NAV_ROUTES` in `router/routes.js`, add a `<Route>` in `App.jsx`. Wrap role-restricted pages in `<RoleRoute roles={[...]}>`.
- **Forms:** Formik + a Yup schema in `src/schemas`.
- **Styling:** Tailwind utility classes and the theme tokens (`bg-background`, `text-muted-foreground`, etc.). Add shadcn/ui components with `npx shadcn@latest add <component>` from `frontend/`.
- **Module style:** ESM (`import` / `export`). Config files (`tailwind.config.js`, `postcss.config.js`, `jest.config.js`, `babel.config.js`) stay CommonJS.

### Roles

`admin` and `member`, defined in `backend/src/models/User.js`. Sign-up always creates a `member`. If you add a role, update it in **all** of: `models/User.js`, the users migration, `frontend/src/router/routes.js` (`ROLE_HOMES`) and `frontend/src/layouts/AppLayout.jsx` (`ROLE_META`).

### Tests

- Put a teammate's tests in `tests/<teammate-name>/` (backend or frontend). Copy `_template/` to start, and list each test case in that folder's `test-cases.md`.
- Backend tests import the app with `require('../../src')` - it does not start a server, so Supertest can use it directly.
- Add or update tests for any behaviour you change. Run `npm test` before saying the work is done.

---

## Git Workflow (enforced on GitHub)

- **Never commit or push directly to `main`.** It's protected - pushes will be rejected.
- Create a branch: `feature/<short-name>`, `fix/<short-name>` or `docs/<short-name>`.
- Commit messages in imperative mood ("Add booking form", not "Added booking form"), first line under ~70 characters.
- Open a pull request; it needs the `test` CI check to pass (no approval required - the author merges it). Merge with **Squash and merge**.
- Before committing, run `npm test` in whichever of `backend/` / `frontend/` you changed, and `npm run build` in `frontend/` if you touched it.
- Full details: [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Do Not

- Commit `.env` files, API keys, passwords or database URLs - including in `.env.example`, comments or docs. Add new variable *names* to `.env.example` with an empty value.
- Edit another teammate's `tests/<name>/` or `design/<name>/` folder.
- Rename, move or reformat shared files (`models/index.js`, `routes/index.js`, `App.jsx`, `routes.js`, `AppLayout.jsx`) beyond the lines your task needs - these are merge-conflict hotspots.
- Delete or weaken existing tests to make them pass.
- Run destructive database commands (`DROP`, `TRUNCATE`, `sequelize.sync({ force: true })`) against the shared database.
- Run `git push --force`, `git reset --hard` on shared branches, or anything that rewrites `main`.

---

## Writing Style

Use a hyphen (`-`) instead of an em dash (`—`) in all generated documents (markdown files, comments, README, etc.).
