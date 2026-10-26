---
name: setup
description: First-time setup of the Innovation project on a teammate's machine - install backend and frontend dependencies, create .env files, verify tests and the database connection, and create the teammate's personal test/design folders.
disable-model-invocation: true
---

# First-time project setup

Set up this repo for the teammate you're working with. Follow the steps in order and stop at the first failure to explain it in plain language before continuing.

## 1. Check prerequisites

- `node -v` must be 20 or newer. If not, tell them to install the LTS from https://nodejs.org and stop.
- `git status` - confirm they're inside the repo. If they're on `main`, that's fine for setup (nothing gets committed).

## 2. Install dependencies

Run in each folder (not the repo root - there's no root package.json):

```bash
cd backend && npm install
cd frontend && npm install
```

## 3. Create .env files

For both `backend/` and `frontend/`: if `.env` doesn't exist, copy `.env.example` to `.env`. Never overwrite an existing `.env`.

You can't read `.env` files (blocked in settings, on purpose). For `backend/.env`:
- Tell the teammate to open `backend/.env` themselves and paste the team's `DATABASE_URL` after `DATABASE_URL=`. It's shared privately by the team - never ask them to paste it into the chat.
- `DEV_JWT_SECRET` must stay the same as in `.env.example`.

Wait for them to confirm before step 5.

## 4. Run the tests

```bash
cd backend && npm test
cd frontend && npm test
```

Both must pass. These don't need the database.

## 5. Check the database

```bash
cd backend && npm run db:test
```

"Connection successful" means it worked. If it fails, the usual causes are: `DATABASE_URL` still empty, a typo, or the password containing special characters that need URL-encoding.

## 6. Personal folders

Ask for their first name (lowercase, no spaces - e.g. `alex`). If these don't exist yet, copy the templates and replace `<Your Name>` in the copied files:

- `backend/tests/_template/` → `backend/tests/<name>/`
- `frontend/tests/_template/` → `frontend/tests/<name>/`
- `design/_template/` → `design/<name>/`

Don't commit them yet - they'll go in with their first feature branch.

## 7. Finish

Tell them how to run the app (two terminals):

- `cd backend && npm run dev` → http://localhost:3000/health
- `cd frontend && npm run dev` → http://localhost:5173

Then give a short summary: what worked, anything that still needs their action, and point them to `/new-endpoint`, `/new-page` and `/pr-ready` for their first task.
