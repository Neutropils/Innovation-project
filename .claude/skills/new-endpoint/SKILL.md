---
name: new-endpoint
description: Add a new backend API resource (CRUD endpoints) to the Express/Sequelize backend following the project's layering - model, migration, validator, service, controller, route and tests. Use when asked to add an API, endpoint, resource, table or model on the backend.
argument-hint: <resource name, e.g. "project">
---

# Add a backend resource: $ARGUMENTS

Read `AGENTS.md` first if you haven't this session. Then look at the existing auth files as the reference for style (`src/controllers/authController.js`, `src/routes/authRoutes.js`, `src/validators/index.js`, `src/models/User.js`) and match them.

If the resource name or its fields aren't clear, ask before writing code: what fields, which are required, which roles can create/edit/delete, and whether it belongs to a user (foreign key).

Naming for a resource called `project`:

| Thing | Name |
|---|---|
| Model file / class | `src/models/Project.js` / `Project` |
| Table | `projects` (snake_case columns) |
| Validator file | `src/validators/projectValidators.js` |
| Service | `src/services/projectService.js` |
| Controller | `src/controllers/projectController.js` |
| Router | `src/routes/projectRoutes.js` mounted at `/api/projects` |

## Steps

1. **Model** - `src/models/<Name>.js`, using `sequelize.define` with `tableName` and `underscored: true`, exported as `module.exports = <Name>`.
2. **Register it** in `src/models/index.js`: add the `require` under a comment with the teammate's name and feature, add associations in the Associations section (both sides, e.g. `User.hasMany` + `Project.belongsTo`), and add it to `module.exports`. Only touch the lines you need - this file is shared.
3. **Migration** - `migrations/<YYYYMMDDHHmmss>-create-<table>.js` matching the model, with `created_at` / `updated_at` columns and a `down` that drops the table (and any ENUM types).
4. **Validators** - Yup `create<Name>Schema` and `update<Name>Schema` in `src/validators/<name>Validators.js`.
5. **Service** - `src/services/<name>Service.js` with plain async functions (`list`, `getById`, `create`, `update`, `remove`). No `req`/`res`. Throw an error with `.status = 404` when something isn't found.
6. **Controller** - `src/controllers/<name>Controller.js`. Validate with `{ abortEarly: false, stripUnknown: true }`, call the service, respond only through `success` / `created` / `error` / `notFound` from `src/utils`. Map Yup `ValidationError` to 422 `VALIDATION_ERROR`, like `authController.js`.
7. **Router** - `src/routes/<name>Routes.js`. Every route uses `authenticate`; restrict writes with `authorise(...)` if the teammate said only certain roles may do them. Mount it in `src/routes/index.js` under a comment with the teammate's name.
8. **Tests** - in `backend/tests/<teammate-name>/` (ask for the name if unknown; copy `tests/_template/` if the folder doesn't exist). The CI has no database, so mock the service in controller/route tests:

   ```js
   jest.mock('../../src/services/projectService')
   const projectService = require('../../src/services/projectService')
   const request = require('supertest')
   const jwt = require('jsonwebtoken')
   const app = require('../../src')

   process.env.DEV_JWT_SECRET = 'test-secret'
   const token = jwt.sign({ sub: 1, name: 'Test', email: 't@example.com', role: 'member' }, 'test-secret')

   it('GET /api/projects returns the list', async () => {
     projectService.list.mockResolvedValue([{ id: 1, name: 'Demo' }])
     const res = await request(app).get('/api/projects').set('Authorization', `Bearer ${token}`)
     expect(res.status).toBe(200)
     expect(res.body.data).toHaveLength(1)
   })
   ```

   Cover at least: success, 401 without a token, 422 on invalid body, 404 when not found, and 403 if a role restriction exists. Add each case to that folder's `test-cases.md`.
9. **Verify** - `cd backend && npm test` must pass.
10. **Docs** - if the teammate has `design/<name>/api-documentation.md` and `database-schema.md`, add the new endpoints and table there.

Finish with a short list of the files created/changed and the endpoints (method + path + who can call it).
