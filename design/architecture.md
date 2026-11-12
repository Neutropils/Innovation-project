# System Architecture

**Project:** Lift Spot-Check V2 - EM Services (EMS) problem statement 12b

Diagram: [architecture-diagram.md](architecture-diagram.md). Tables: [er-diagram.md](er-diagram.md). Pages: [screens.md](screens.md).

Items marked **(planned)** are not in the repo yet. **(placeholder)** pages and **(stub)** functions exist from the skeleton PR with their final names and signatures, but their owner still has to build them. Everything else is installed and in use.

---

## 1. Tech Stack

### Frontend

| Library / Tool | Purpose |
|----------------|---------|
| React 18 | UI component framework |
| Vite 5 | Build tool and local dev server (proxies `/api` to the backend) |
| React Router DOM 6 | Client-side routing, `ProtectedRoute` and `RoleRoute` guards |
| shadcn/ui (Radix Slot, class-variance-authority, clsx, tailwind-merge) | Accessible components; currently `button`, `card`, `input` |
| Tailwind CSS 3 + tailwindcss-animate | Utility-first styling and theme tokens |
| Formik 2 | Form state (checklist, defect, sign-off, import forms) |
| Yup 1 | Form validation schemas in `src/schemas` |
| Axios 1 | Shared HTTP client in `src/api` (adds Bearer token, redirects to `/login` on 401) |
| Lucide React | Icons |
| Jest 29 + React Testing Library | Frontend tests |

### Backend

| Library / Tool | Purpose |
|----------------|---------|
| Node.js 20+ | JavaScript runtime |
| Express 4 | HTTP server and routing (CommonJS) |
| Sequelize 6 | ORM for models, associations and migrations |
| pg / pg-hstore | PostgreSQL driver used by Sequelize |
| Yup 1 | Request body validation (`abortEarly: false, stripUnknown: true`) |
| jsonwebtoken 9 | JWT issue and verify |
| bcryptjs 2 | Password hashing |
| cors 2 | Cross-origin headers for the frontend |
| dotenv 16 | Loads `.env` |
| nodemon 3 | Auto-restart in development |
| Jest 29 + Supertest 7 | API tests |
| Multer **(planned)** | Multipart uploads for inspection and repair photos (F01.7, F03.6) and import files (F05.1) |
| CSV / Excel parser **(planned, to choose)** | Reads the bulk lift import template (F05.1). Pick one library for both `.csv` and `.xlsx` |

### Database

| Tool | Purpose |
|------|---------|
| PostgreSQL (via Supabase, SSL required) | All lifts, contractors, inspections, defects and sign-off records |

---

## 2. Folder Structure

Existing folders are as in the README. The feature folders and files below are **planned**, one per owner, so teammates rarely edit the same file.

### frontend/src

```
src/
├── api/             # Shared Axios instance (exists)
├── components/      # Shared components (exists)
│   ├── ui/          # shadcn/ui primitives (exists: button, card, input)
│   ├── PagePlaceholder.jsx  # (exists - shared) temporary body for skeleton pages
│   ├── PhotoUpload.jsx      # (stub - Jerald)    photo upload used by checklist and repair evidence
│   └── StatusBadge.jsx      # (exists - Si Qi)   defect status + overdue flag
├── context/         # AuthContext (exists)
├── hooks/           # useAuth (exists)
├── layouts/         # AppLayout - sidebar on desktop, top bar on mobile (exists)
├── lib/             # cn(), formatCurrency(), formatDate() (exists)
├── pages/
│   ├── auth/        # Login (exists)
│   ├── lifts/       # (placeholder - Kwan)   Lifts page, inspector home
│   ├── admin/       # (placeholder - Kwan)   Admin tabs: lifts, contractors, users, import
│   ├── inspections/ # (placeholder - Kandha) checklist, history, report
│   ├── defects/     # (placeholder - Si Qi)  defects by contractor
│   ├── overview/    # (placeholder - Si Qi)  admin home with counts
│   └── contractor/  # (placeholder - Jerald) inbox and defect detail
├── router/          # ProtectedRoute, RoleRoute, NAV_ROUTES, ROLE_HOMES (exists)
└── schemas/         # Yup schemas for forms (exists)
```

### backend/src

```
src/
├── config/          # Sequelize connection + testConnection (exists)
├── models/          # One file per model; all associations in models/index.js (exists: every table)
├── routes/          # One router per owner, all mounted under /api (exists; placeholders answer 501)
├── controllers/     # req/res only (exists: auth; owners add their own)
├── services/        # Business logic, no req/res (exists: userService)
│   │                #   liftService.js        (planned - Kwan)   lift and contractor records, search
│   │                #   importService.js      (planned - Kwan)   parse, validate and commit bulk lift imports
│   │                #   auditService.js       (exists - Kwan)    logEvent() - writes defect_events rows
│   │                #   inspectionService.js  (planned - Kandha) drafts, submit, history
│   │                #   defectService.js      (exists - Si Qi)   createFromInspection(), transition(), due dates, overdue
│   │                #   reportService.js      (planned - Si Qi)  filtered reports and CSV export for inspections and defects
│   │                #   attachmentService.js  (stub - Jerald)    photo storage
│   │                #   signoffService.js     (planned - Jerald) contractor sign-off and inspector verification
├── middleware/      # authenticate (JWT) and authorise(...roles) (exists)
├── validators/      # Yup schemas for request bodies (exists)
└── utils/           # success, created, error, notFound, forbidden (exists)
```

---

## 3. Third-Party Services

### Photo storage (planned - decision needed)

Inspectors attach photos to failed checklist items (F01.7), and contractors attach repair evidence (F03.6). Photos must not be stored in the database.

| Option | For | Against |
|--------|-----|---------|
| Supabase Storage | Already on Supabase, no extra account, files survive redeploys | One more set of keys to manage |
| Local disk on the backend | Simplest to build | Files are lost when Render redeploys |

Either way, Multer receives the file, Jerald's `attachmentService` stores it, and the URL goes in `attachments.url`. Only authorised users can fetch a defect's photos (F07.4).

### Map link (P2)

"Find in map" (F01.13) opens Google Maps with the lift's address in a new tab. It is a plain link, so no API key or map library is needed.

---

## 4. Generative AI Services

None in the P0 or P1 scope. The prototype review advised against AI features, because Prototype 2 already had them and EMS still asked for a version 2.

The only candidate is **F05.7 scan paper forms (P2)**: a vision model would read a photo of a paper inspection form and pre-fill the checklist for the inspector to confirm. We build it only if EMS confirms paper forms are still in use.

---

## 5. Cloud Services

| Layer | Provider | Status |
|-------|----------|--------|
| Frontend | Vercel | Planned - static Vite build, deploys from `main` |
| Backend | Render | Planned - Node.js web service. Free tier sleeps; open the app a minute before a demo |
| Database | Supabase | In use - managed PostgreSQL, SSL required |
| File storage | Supabase Storage or local disk | Decision needed (section 3) |

### Environment Variables

**Backend (`backend/.env`)** - exists today:

```
DATABASE_URL=     # Supabase PostgreSQL connection string - shared privately, never committed
JWT_SECRET=       # Production JWT signing secret
DEV_JWT_SECRET=   # Shared dev secret - keep the value from .env.example
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Planned, if Supabase Storage is chosen (add the names to `.env.example` with empty values):

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_STORAGE_BUCKET=
```

**Frontend (`frontend/.env`)** - exists today:

```
VITE_API_BASE_URL=   # Blank in development (Vite proxies /api); deployed backend URL in production
```

---

## 6. Scope Notes

### Roles

There are four roles: `admin`, `inspector`, `contractor` and `member`. `admin` acts as the EMS officer; no `manager` role is added. Contractor users get a `contractor_id` linking them to their lift company, and every contractor route filters by it.

### One path for status changes

`defects.status` changes only through `defectService.transition()`. It checks the role, the company and the allowed move, and writes a `defect_events` row. The rules are in [workflow-diagram.md](workflow-diagram.md).

### Offline use - P2

The P0 and P1 scope assumes the inspector is online, and server-side drafts (F01.9) protect unfinished work. Local storage and sync (F06.5, F06.6) are added only if EMS confirms motor rooms have no signal.

### Public sign-up

Sign-up creates a `member`, who has no role in the spot-check workflow. Inspectors and contractors are created by admin (or with `npm run db:create-user`). The team still needs to decide whether to keep sign-up.
