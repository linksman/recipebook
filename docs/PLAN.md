# Recipe Planner — Implementation Plan

> This plan covers *what to build and in what order*.
> Architecture, data models, API contracts, and technology decisions are in [DESIGN.md](DESIGN.md).
> Requirements are in [SPEC.md](SPEC.md).

---

## Stage 1 — Project Scaffolding & Database Schema

**Goal:** Establish the monorepo, install dependencies, define the Prisma schema, and run the initial migration so every subsequent stage has a stable foundation.

**Design references:** DESIGN.md §2 (Tech Stack), §3 (Project Structure), §4 (Data Model)

### Steps

| # | Step | Spec Ref |
|---|---|---|
| 1.1 | Initialise the monorepo (`packages/api`, `packages/web`) with a root `package.json` workspace. | §1.1 |
| 1.2 | Create the Express server entry point (`packages/api/src/index.ts`): initialise the app, attach JSON body parsing and `express-session`, and start listening on a configurable port. No routes yet — just the runnable skeleton. | §1.1 |
| 1.3 | Add Prisma to `packages/api` and define the `Ingredient`, `User`, `Recipe`, `RecipeIngredient`, and `RecipeStep` models per the data model in DESIGN.md §4. | FR-2.2, §5 |
| 1.4 | Write a seed script that inserts the single hardcoded user (bcrypt-hashed password). | FR-1.2 |
| 1.5 | Run the initial migration and verify all tables and FK relationships exist. | NFR-2.1 |

### Definition of Done
- `npm run dev` (or equivalent) starts the Express server without errors.
- `GET /health` (or any placeholder route) returns `200` confirming the server is reachable.
- `prisma migrate dev` completes with zero errors.
- `prisma db seed` inserts exactly one user row.
- All FK relationships are navigable (confirmed via Prisma Studio or a direct SQLite query).

### Tests

**Backend — Unit Tests**
| Test | Verifies |
|---|---|
| Insert a `RecipeIngredient` with a non-existent `ingredientId` — expect FK error. | NFR-2.1 |
| Insert a `RecipeIngredient` with `amount = -1` — expect validation rejection. | NFR-2.2 |
| Query `User` table after seed — assert exactly one row with the expected username. | FR-1.2 |

*No API, frontend, or Playwright tests in this stage — no routes or UI exist yet.*

---

## Stage 2 — Authentication Layer

**Goal:** Implement the login/logout endpoints, session middleware, and the React route guard. All auth logic must be isolated in a single module.

**Design references:** DESIGN.md §7 (Authentication Design), §5.1 (Auth API)

### Steps

| # | Step | Spec Ref |
|---|---|---|
| 2.1 | Create `packages/api/src/middleware/auth.ts` exporting `loginHandler`, `logoutHandler`, and `requireAuth` as described in DESIGN.md §7. | FR-1.1, FR-1.2, FR-1.3, NFR-3.1 |
| 2.2 | Register `POST /api/auth/login` and `POST /api/auth/logout`. Configure `express-session` with a signed cookie. | FR-1.3 |
| 2.3 | Apply `requireAuth` globally to all `/api/*` routes except the auth endpoints. | FR-1.1 |
| 2.4 | Build the `LoginPage` component: username/password form, error message on failure, redirect to `/recipes` on success. | FR-1.1 |
| 2.5 | Add `<PrivateRoute>` wrapper that redirects unauthenticated users to `/login`. | FR-1.1, FR-1.3 |

### Definition of Done
- Correct credentials → `200 + Set-Cookie`.
- Wrong credentials → `401`, no cookie set.
- Any `/api/*` request without a session → `401`.
- Refreshing the browser while logged in stays on the current page.
- Logout clears the session and redirects to `/login`.

### Tests

**Backend — Unit Tests**
| Test | Verifies |
|---|---|
| `requireAuth` called with a forged/expired session token → returns `401`, does not call `next`. | NFR-3.1 |
| `loginHandler` unit test: correct username/password → calls `req.session.save`, attaches `req.user`. | FR-1.2 |

**Backend — API Tests**
| Test | Verifies |
|---|---|
| `POST /api/auth/login` valid credentials → `200 + Set-Cookie`. | FR-1.2 |
| `POST /api/auth/login` wrong password → `401`, no cookie. | FR-1.2 |
| `GET /api/ingredients` without session → `401`. | FR-1.1 |
| `GET /api/ingredients` with valid session → `200`. | FR-1.3 |

**Frontend — Unit Tests**
| Test | Verifies |
|---|---|
| `<LoginForm>` submits invalid creds — inline error text visible. | FR-1.1 |
| `<PrivateRoute>` without session context — renders redirect to `/login`. | FR-1.1 |

**Frontend — Playwright**
| Test | Verifies |
|---|---|
| Fill valid credentials on `/login`, submit → assert redirect to `/recipes`. | FR-1.1, FR-1.3 |
| Fill wrong credentials on `/login`, submit → assert error message visible on page. | FR-1.1 |
| Navigate directly to `/recipes` without logging in → assert redirect to `/login`. | FR-1.1 |
| Login, then click Logout → assert redirect to `/login` and session cleared. | FR-1.3 |

---

## Stage 3 — Ingredient Management (API + UI)

**Goal:** Implement full CRUD for the global ingredient resource, including the usage-lock that blocks edits and deletes when an ingredient is in use.

**Design references:** DESIGN.md §5.2 (Ingredients API), §6 (Lock Mechanism), §9 (Validation Rules)

### Steps

| # | Step | Spec Ref |
|---|---|---|
| 3.1 | Implement `GET /api/ingredients`, `POST /api/ingredients`, `PUT /api/ingredients/:id`, `DELETE /api/ingredients/:id` per the API contract in DESIGN.md §5.2. | FR-2.1, FR-2.2 |
| 3.2 | Implement the `isIngredientLocked()` service helper and apply it in the PUT and DELETE handlers as described in DESIGN.md §6. | FR-2.4 |
| 3.3 | Apply validation rules from DESIGN.md §9 to the POST and PUT handlers; return HTTP 422 on failure. | NFR-2.2 |
| 3.4 | Build the `IngredientsPage`: searchable table with Add, Edit, Delete actions. Locked rows show a lock icon with disabled controls. | FR-2.1, FR-2.4 |
| 3.5 | Build the Ingredient form (add/edit) with inline validation feedback mirroring the API rules. Surface `409` lock errors as a user-readable banner. | FR-2.2, FR-2.4 |

### Definition of Done
- All four CRUD endpoints return the correct status codes.
- Editing or deleting an ingredient in use returns `409` with a human-readable message.
- An unused ingredient can be freely edited and deleted.
- Negative or missing nutritional values are rejected at both API and UI level.

### Tests

**Backend — Unit Tests**
| Test | Verifies |
|---|---|
| `isIngredientLocked(id)` with a referenced ingredient → returns `true`. | FR-2.4 |
| `isIngredientLocked(id)` with an unreferenced ingredient → returns `false`. | FR-2.4 |

**Backend — API Tests**
| Test | Verifies |
|---|---|
| `GET /api/ingredients` → array with correct fields, sorted by name. | FR-2.1 |
| `POST /api/ingredients` valid body → `201`, row persisted. | FR-2.2 |
| `POST /api/ingredients` duplicate name → `409`. | FR-2.2 |
| `POST /api/ingredients` `calories: -5` → `422`. | NFR-2.2 |
| `POST /api/ingredients` missing `strictUnit` → `422`. | FR-2.2 |
| `PUT /api/ingredients/:id` not in use → `200`, values updated. | FR-2.4 |
| `PUT /api/ingredients/:id` in use → `409`. | FR-2.4 |
| `DELETE /api/ingredients/:id` in use → `409`. | FR-2.4 |
| `DELETE /api/ingredients/:id` not in use → `204`, row gone. | FR-2.4 |

**Frontend — Unit Tests**
| Test | Verifies |
|---|---|
| `<IngredientList>` renders a locked row with Edit/Delete controls disabled. | FR-2.4 |
| `<IngredientForm>` submits with empty name → inline validation error shown. | NFR-2.2 |
| `<IngredientForm>` submits with negative calories → inline validation error shown. | NFR-2.2 |

**Frontend — Playwright**
| Test | Verifies |
|---|---|
| Login → navigate to Ingredients → create a new ingredient via form → assert it appears in the table. | FR-2.1, FR-2.2 |
| Login → create ingredient, add it to a recipe, return to Ingredients → assert lock icon shown, Edit/Delete disabled. | FR-2.4 |
| Login → attempt to delete a locked ingredient → assert error banner is visible on the page. | FR-2.4 |

---

## Stage 4 — Recipe Management (API + UI)

**Goal:** Implement full CRUD for user-owned recipes, with multi-stage ingredient line items, ordered steps, and ownership enforcement.

**Design references:** DESIGN.md §5.3–5.4 (Recipes API), §4 (Data Model), §9 (Validation Rules)

### Steps

| # | Step | Spec Ref |
|---|---|---|
| 4.1 | Implement `GET /api/recipes`, `GET /api/recipes/:id`, `POST /api/recipes`, `PUT /api/recipes/:id`, `DELETE /api/recipes/:id` per DESIGN.md §5.3. | FR-3.1 |
| 4.2 | Enforce ownership on all single-recipe routes — return `403` if `recipe.userId ≠ req.user.id`. | FR-3.1 |
| 4.3 | Wrap recipe create and update in a single DB transaction (recipe row + line items + steps). | NFR-2.1 |
| 4.4 | Apply validation rules from DESIGN.md §9; return `422` on failure. Allow duplicate `ingredientId` entries per recipe. | FR-3.3, NFR-2.2 |
| 4.5 | Build the `RecipeListPage`: recipe cards showing title, description excerpt, and total calorie count. | FR-3.1 |
| 4.6 | Build the `RecipeDetailPage` (view/create/edit modes): title, description, ordered steps list, ingredient section with amount input and `stageNote`. Display `strictUnit` label next to the amount field; no conversion controls. | FR-3.2, FR-3.3, FR-2.3 |

### Definition of Done
- A logged-in user can create, view, update, and delete their own recipes.
- A `403` is returned for any access or mutation of another user's recipe.
- The same ingredient can appear twice in a recipe with different `stageNote` values.
- Deleting a recipe removes all child line items and steps with no orphans.
- The unit type is always visible in the recipe form and cannot be changed.

### Tests

**Backend — Unit Tests**
| Test | Verifies |
|---|---|
| Transaction test: simulate a step insert failure mid-POST → no recipe or `RecipeIngredient` rows committed. | NFR-2.1 |
| Ownership check unit test: `req.user.id` ≠ `recipe.userId` → handler returns `403` without touching the DB. | FR-3.1 |

**Backend — API Tests**
| Test | Verifies |
|---|---|
| `POST /api/recipes` valid full body → `201`, all nested rows persisted. | FR-3.1, FR-3.2 |
| `POST /api/recipes` same ingredient twice (different `stageNote`) → `201`, two `RecipeIngredient` rows. | FR-3.3 |
| `POST /api/recipes` with `amount: 0` → `422`. | NFR-2.2 |
| `GET /api/recipes/:id` own recipe → `200` with full nested detail. | FR-3.1 |
| `GET /api/recipes/:id` another user's recipe → `403`. | FR-3.1 |
| `PUT /api/recipes/:id` another user's recipe → `403`. | FR-3.1 |
| `DELETE /api/recipes/:id` → `204`; subsequent `GET` → `404`; no orphan `RecipeIngredient` or `RecipeStep` rows. | FR-3.1 |

**Frontend — Unit Tests**
| Test | Verifies |
|---|---|
| `<RecipeForm>` adding the same ingredient twice renders two separate line item rows. | FR-3.3 |
| Each ingredient line item row shows the `strictUnit` label and contains no conversion controls. | FR-2.3 |

**Frontend — Playwright**
| Test | Verifies |
|---|---|
| Login → create a new recipe with title, description, one step, and two line items for the same ingredient → assert recipe appears in the list. | FR-3.1, FR-3.2, FR-3.3 |
| Login → open the recipe → click Edit → change the title → save → assert updated title shown in list and detail view. | FR-3.1 |
| Login → delete a recipe → assert it is removed from the list. | FR-3.1 |

---

## Stage 5 — Nutrition Aggregation

**Goal:** Implement real-time, client-side nutrition totals that update reactively as the user edits the recipe form.

**Design references:** DESIGN.md §8 (Nutrition Calculation), §5.4 (Recipe response shape)

### Steps

| # | Step | Spec Ref |
|---|---|---|
| 5.1 | Implement `calculateNutrition()` in `packages/web/src/lib/nutrition.ts` per the formula in DESIGN.md §8. | FR-3.4, NFR-1.1 |
| 5.2 | Verify that `GET /api/recipes/:id` embeds all `*PerUnit` values in each line item (no second request needed). | FR-3.4 |
| 5.3 | Add a `<NutritionPanel>` component to `RecipeDetailPage` that calls `calculateNutrition()` on each render with the current form state. Label totals as "Total for entire recipe". | FR-3.4, NFR-1.1 |

### Definition of Done
- Nutrition totals are correct for a recipe with multiple ingredients.
- Changing an ingredient amount in the form updates the panel without any network call.
- The panel matches a manual calculation against the same inputs.

### Tests

**Backend — Unit Tests**
| Test | Verifies |
|---|---|
| *No new service logic in this stage.* | — |

**Backend — API Tests**
| Test | Verifies |
|---|---|
| `GET /api/recipes/:id` response includes `caloriesPerUnit`, `carbsPerUnit`, `fatPerUnit`, `proteinPerUnit` on each line item. | FR-3.4 |

**Frontend — Unit Tests**
| Test | Verifies |
|---|---|
| `calculateNutrition` with 2 ingredients × known values → correct totals. | FR-3.4 |
| `calculateNutrition` with empty list → all zeros. | FR-3.4 |
| `calculateNutrition` with same ingredient twice → sums both rows. | FR-3.3, FR-3.4 |
| `calculateNutrition` with 500 line items — runtime < 10 ms. | NFR-1.1 |
| `<NutritionPanel>` rendered with known ingredients → displayed values match manual calculation. | FR-3.4 |
| `<RecipeForm>` amount field changed → `<NutritionPanel>` updates without async delay. | NFR-1.1 |

**Frontend — Playwright**
| Test | Verifies |
|---|---|
| Login → open a recipe with known ingredients → assert Nutrition Panel shows the correct calorie, carb, fat, and protein totals. | FR-3.4 |
| Login → open recipe in edit mode → change an ingredient amount → assert Nutrition Panel updates immediately (no page reload). | FR-3.4, NFR-1.1 |

---

## Stage 6 — Responsive Layout

**Goal:** Ensure all pages are usable on mobile (375 px) and desktop (1280 px) without overflow or layout breakage.

**Design references:** DESIGN.md §10 (Pages & Routing), §2 (CSS Modules)

### Steps

| # | Step | Spec Ref |
|---|---|---|
| 6.1 | Apply responsive CSS Module grid to `RecipeListPage`: 1-column on mobile, 2-column at 768 px, 3-column at 1024 px. | NFR-1.2 |
| 6.2 | `RecipeDetailPage`: stacked layout on mobile; 2-column (form + nutrition panel) at 768 px+. | NFR-1.2 |
| 6.3 | `IngredientsPage`: table collapses to card stack on small screens. | NFR-1.2 |
| 6.4 | Add loading states (spinner or skeleton) on all data-fetching pages. | NFR-1.1 |
| 6.5 | Add empty states and error states on all list views. | Usability |

### Definition of Done
- All pages are non-overflowing at 375 px and 1280 px.
- Loading, empty, and error states render correctly.

### Tests

*No new backend logic in this stage.*

**Frontend — Unit Tests**
| Test | Verifies |
|---|---|
| `<RecipeList>` with empty data → empty-state message visible. | Usability |
| `<RecipeList>` in loading state → spinner or skeleton visible, no content flash. | NFR-1.1 |
| `<IngredientsPage>` with a fetch error → error state and retry prompt visible. | Usability |

**Frontend — Playwright**
| Test | Verifies |
|---|---|
| Viewport 375 × 812 — navigate Login → Recipe List → Recipe Detail → assert `scrollWidth <= innerWidth` on each page. | NFR-1.2 |
| Viewport 1280 × 800 — same navigation and overflow assertion. | NFR-1.2 |
| Viewport 375 × 812 — navigate to Ingredients page → assert table has collapsed to card layout (no horizontal overflow). | NFR-1.2 |

---

## Stage 7 — End-to-End Integration

**Goal:** Confirm all stages work together by running the two user journeys from the spec as Playwright tests.

**Design references:** DESIGN.md §10 (user journeys)

### Journey A — The Home Chef
1. Login.
2. Browse ingredients.
3. Create a recipe with the same ingredient mapped to two stages.
4. Confirm nutrition totals are correct.
5. Edit the recipe (change an amount, update a step).
6. Delete the recipe.

### Journey B — The Contributor
1. Login.
2. Create a new global ingredient.
3. Use it in a recipe.
4. Attempt to delete the ingredient — confirm the lock error is shown.
5. Delete the recipe.
6. Delete the ingredient — confirm success.

### Definition of Done
- Both Playwright journeys pass against the running dev server.
- No browser console errors during either journey.
- All prior unit and integration tests still pass.

### Tests

**Backend — API Tests**
| Test | Verifies |
|---|---|
| Full CRUD flow on a test DB: create ingredient → create recipe referencing it → update recipe → delete recipe → delete ingredient. | All FR-2.x, FR-3.x |

**Frontend — Playwright**
| Test | Verifies |
|---|---|
| Journey A end-to-end (see steps above). | FR-1.x, FR-3.x |
| Journey B end-to-end (see steps above). | FR-2.x |

---

## Stage Summary

| Stage | Focus | Key Spec Requirements |
|---|---|---|
| 1 | Scaffolding & Schema | §1.1, NFR-2.1 |
| 2 | Authentication | FR-1.1–FR-1.3, NFR-3.1 |
| 3 | Ingredient CRUD + Lock | FR-2.1–FR-2.4, NFR-2.2 |
| 4 | Recipe CRUD + Ownership | FR-3.1–FR-3.3, NFR-2.1–NFR-2.2 |
| 5 | Nutrition Aggregation | FR-3.4, NFR-1.1 |
| 6 | Responsive Layout | NFR-1.2 |
| 7 | E2E Integration | All |
