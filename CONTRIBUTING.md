# Contributing

Thanks for helping out. Following these steps keeps us from overwriting each other's work.

## Golden rule

**Don't push directly to `main`.** Work on a branch and open a pull request (PR).

## Workflow

1. **Get the latest code**
   ```bash
   git checkout main
   git pull
   ```
2. **Create a branch** for your task:
   ```bash
   git checkout -b feature/login-page
   ```
   Branch name prefixes:
   - `feature/` for new functionality
   - `fix/` for bug fixes
   - `docs/` for documentation only
3. **Make your changes** and commit often:
   ```bash
   git add .
   git commit -m "Add login form layout"
   ```
4. **Push your branch**:
   ```bash
   git push -u origin feature/login-page
   ```
5. **Open a pull request** on GitHub. Fill in the template and ask at least one teammate to review.
6. **After approval, merge** the PR and delete the branch.

## Merge rules

These are enforced on GitHub for `main`:

- **No direct pushes to `main`.** All changes go through a pull request.
- **At least 1 approving review** from a teammate. You can't approve your own PR.
- **New commits dismiss old approvals.** If you push changes after approval, get it re-reviewed.
- **All review conversations must be resolved** before merging.
- **CI must pass.** The `test` check (runs `npm test` in `backend/` and `frontend/`, plus a frontend build) has to be green.
- **Branch must be up to date with `main`** before merging (use the "Update branch" button on the PR).
- **Squash and merge** is the merge method, so each PR becomes one clean commit on `main`.
- **No force-pushing or deleting `main`.**

The person who opened the PR merges it after approval, then deletes the branch.

## Commit messages

- Use the imperative mood: "Add search bar", not "Added search bar".
- Keep the first line under about 70 characters.
- One logical change per commit where possible.

## Keeping your branch up to date

If `main` has moved on while you were working:

```bash
git checkout main
git pull
git checkout your-branch
git merge main
```

Resolve any conflicts, then commit and push.

## Secrets

Never commit passwords, API keys or tokens. Put them in `.env` (ignored by Git) and add the variable *name* to `.env.example` so others know it exists.

## Issues

Use GitHub Issues to track tasks and bugs. Assign yourself before starting so no one duplicates the work.
