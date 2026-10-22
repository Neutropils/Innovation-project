---
name: pr-ready
description: Get the current work ready for a pull request - make sure it's on a feature branch, run tests and build, check for secrets and accidental files, commit with a good message, push, and give the PR link.
disable-model-invocation: true
argument-hint: [optional short description of the change]
---

# Prepare a pull request

`main` is protected: PRs need 1 approval and the `test` CI check. Your job is to make sure this work will pass review and CI the first time.

## 1. Branch

Run `git status` and `git branch --show-current`.

- If on `main` with changes: create a branch first - `git switch -c feature/<short-name>` (or `fix/` / `docs/`), named from the change. Uncommitted changes come along.
- If there are no changes and nothing to push, say so and stop.

## 2. Review what's changing

Run `git status` and `git diff` (plus `git diff --staged`). Then check, and **stop and tell the teammate** if you find any:

- `.env` files (anything except `.env.example`) or `node_modules/`
- Secrets in the diff: database URLs with passwords (`postgres://user:pass@...`), API keys, tokens, `JWT_SECRET=` with a value, private keys
- Edits to another teammate's `tests/<name>/` or `design/<name>/` folder
- Deleted or skipped tests (`.skip`, `xit`, removed `expect`s)
- Large unrelated changes to shared files (`models/index.js`, `routes/index.js`, `App.jsx`, `router/routes.js`, `AppLayout.jsx`) - formatting churn here causes merge conflicts
- Leftover `console.log` debugging or commented-out blocks

## 3. Test

Only for the folders that changed:

```bash
cd backend && npm test
cd frontend && npm test && npm run build
```

If anything fails, fix it (or explain why you can't). Don't commit failing work.

## 4. Sync with main

```bash
git fetch origin
git merge origin/main
```

If there are conflicts, resolve them carefully - keep both sides' additions in shared registry files (`models/index.js`, `routes/index.js`, `App.jsx`, `routes.js`). Re-run step 3 after merging.

## 5. Commit

Stage only the relevant files by name (not `git add -A` blindly). Write the message in imperative mood, first line under ~70 characters, e.g. `Add project list page and API`. Use $ARGUMENTS as a hint if given. Group into a few logical commits if the change is large.

## 6. Push and link

Ask the teammate before pushing. Then:

```bash
git push -u origin <branch>
```

Give them the PR link: `https://github.com/Neutropils/Innovation-project/compare/<branch>?expand=1`

And a draft PR description following `.github/pull_request_template.md` (What / Related issue / How to test / Checklist) that they can paste in.
