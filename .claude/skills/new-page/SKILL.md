---
name: new-page
description: Add a new page to the React frontend following the project's structure - page component, sidebar entry in NAV_ROUTES, route in App.jsx (with RoleRoute if restricted), optional form schema and API calls, and a test. Use when asked to add a page, screen or view on the frontend.
argument-hint: <page name and area, e.g. "projects list">
---

# Add a frontend page: $ARGUMENTS

Read `AGENTS.md` first if you haven't this session. Use `src/pages/dashboard/DashboardPage.jsx` as the style reference.

If unclear, ask: which feature area (folder under `src/pages/`), the URL path, which roles can see it (`admin`, `member` or both), whether it appears in the sidebar, and which backend endpoints it uses.

## Steps

1. **Page component** - `src/pages/<area>/<Name>Page.jsx`, default export. Start with the same header pattern as `DashboardPage.jsx` (lucide icon + `h1`), use `@/components/ui/*` components and Tailwind theme tokens (`text-foreground`, `text-muted-foreground`, `bg-background`). Add an `// Owner:` comment with the teammate's name.
2. **Need a UI component that isn't in `src/components/ui/`?** Add it from `frontend/` with `npx shadcn@latest add <component>` rather than writing it by hand. Install any packages it asks for.
3. **API calls** - if the area doesn't have one yet, create `src/api/<area>.js` exporting small functions that use the shared instance:

   ```js
   import api from './index'

   export async function listProjects() {
     const res = await api.get('/projects')
     return res.data.data
   }
   ```

   Handle loading and error states in the page (show a message, don't fail silently).
4. **Forms** - use Formik with a Yup schema added to `src/schemas/index.js`. Show field errors under each input.
5. **Sidebar** - add an entry to `NAV_ROUTES` in `src/router/routes.js` with `path`, `label`, `Icon` (from lucide-react) and `roles`. Skip this for detail pages like `/projects/:id`.
6. **Route** - add the `import` and `<Route>` in `src/App.jsx` inside the authenticated `AppLayout` block. If it's restricted, put it inside a `<RoleRoute roles={[...]}>` group (reuse an existing group for the same roles). Only touch the lines you need - this file is shared.
7. **Test** - in `frontend/tests/<teammate-name>/` (ask for the name if unknown; copy `tests/_template/` if the folder doesn't exist). Mock the API module and fake a logged-in user:

   ```jsx
   import { render, screen } from '@testing-library/react'
   import { MemoryRouter } from 'react-router-dom'
   import { AuthProvider } from '@/context/AuthContext'
   import ProjectsPage from '@/pages/projects/ProjectsPage'
   import * as projectsApi from '@/api/projects'

   jest.mock('@/api/projects')

   function loginAs(role) {
     const payload = btoa(JSON.stringify({ sub: 1, name: 'Test', email: 't@example.com', role }))
     localStorage.setItem('app_token', `x.${payload}.x`)
   }

   afterEach(() => localStorage.clear())

   it('shows projects from the API', async () => {
     loginAs('member')
     projectsApi.listProjects.mockResolvedValue([{ id: 1, name: 'Demo' }])
     render(<MemoryRouter><AuthProvider><ProjectsPage /></AuthProvider></MemoryRouter>)
     expect(await screen.findByText('Demo')).toBeInTheDocument()
   })
   ```

   Cover the main render, loading/error state, and form validation if there's a form. Add each case to that folder's `test-cases.md`.
8. **Verify** - `cd frontend && npm test` and `npm run build` must both pass.

Finish with the files created/changed, the URL, and which roles can reach it.
