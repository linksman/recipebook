# Recipe Planner — System Design

> Decisions documented here should be reviewed before implementation begins.
> Implementation stages and tests live in [PLAN.md](PLAN.md).
> Requirements are in [SPEC.md](SPEC.md).

---

## 1. System Overview

A two-tier web application: a React SPA served by Vite, talking to an Express REST API backed by a SQLite database. Both packages live in a single monorepo. All data is local to the machine running the server (Phase 1 / MVP scope).

```
┌─────────────────────────────────────┐
│  Browser (React SPA)                │
│  - Renders pages, handles routing   │
│  - Runs nutrition calculations      │
│  - Communicates via fetch() + JSON  │
└────────────────┬────────────────────┘
                 │ HTTP / JSON
┌────────────────▼────────────────────┐
│  Express API  (packages/api)        │
│  - Auth middleware                  │
│  - Ingredient routes                │
│  - Recipe routes                    │
└────────────────┬────────────────────┘
                 │ Prisma Client
┌────────────────▼────────────────────┐
│  SQLite  (recipebook.db)            │
│  - Single file, local disk          │
└─────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20+ | Shared language across both packages |
| Backend | Express.js | Minimal and modular; middleware isolation is straightforward (NFR-3.1) |
| Database | SQLite via Prisma ORM | Lightweight local storage (§1.1 scope); Prisma handles migrations, cascade rules, and type-safe queries |
| Frontend | React 18 + Vite | Component model suits the domain; fast dev server |
| Styling | CSS Modules | Scoped per-component styles, zero runtime overhead, standard `@media` queries for responsiveness (NFR-1.2) |
| Backend — Unit Tests | Vitest | Tests for service functions, middleware, and pure logic in isolation |
| Backend — API Tests | Vitest + Supertest | In-process HTTP tests that exercise routes end-to-end against a real test DB |
| Frontend — Unit Tests | Vitest + React Testing Library | Component-level DOM tests; no browser, no network |
| Frontend — E2E Tests | Playwright | Full-browser tests that drive the real running app through user flows |

---

## 3. Project Structure

```
recipebook/
├── package.json               # workspace root — shared scripts
├── packages/
│   ├── api/                   # Express server
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── index.ts       # app entry — mounts routers
│   │       ├── middleware/
│   │       │   └── auth.ts    # isolated auth module (NFR-3.1)
│   │       ├── routes/
│   │       │   ├── ingredients.ts
│   │       │   └── recipes.ts
│   │       └── services/
│   │           ├── ingredientService.ts   # isIngredientLocked()
│   │           └── nutritionService.ts    # (server-side validation only)
│   └── web/                   # React SPA
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx        # router setup + PrivateRoute
│           ├── pages/
│           │   ├── LoginPage.tsx
│           │   ├── RecipeListPage.tsx
│           │   ├── RecipeDetailPage.tsx
│           │   └── IngredientsPage.tsx
│           ├── components/    # shared UI pieces
│           ├── lib/
│           │   └── nutrition.ts   # pure calculateNutrition() function
│           └── api/           # typed fetch wrappers
```

---

## 4. Data Model

Implemented via Prisma schema targeting SQLite.

### 4.1 Entities

**User**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (String) | PK |
| `username` | String | Unique |
| `passwordHash` | String | bcrypt hash of hardcoded password |

**Ingredient** *(global, shared across all users)*
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (String) | PK |
| `name` | String | Unique — case-sensitive |
| `strictUnit` | String | Valid values: Grams \| Milliliters \| Units \| Package — enforced at the application layer (SQLite does not support native enums in Prisma) |
| `caloriesPerUnit` | Float | ≥ 0 |
| `carbsPerUnit` | Float | ≥ 0 |
| `fatPerUnit` | Float | ≥ 0 |
| `proteinPerUnit` | Float | ≥ 0 |

**Recipe** *(owned by one user)*
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (String) | PK |
| `userId` | String | FK → User |
| `title` | String | Non-empty |
| `description` | String? | Optional |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**RecipeIngredient** *(join table — one row per line item)*
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (String) | PK |
| `recipeId` | String | FK → Recipe (cascade delete) |
| `ingredientId` | String | FK → Ingredient (no cascade — lock enforced at app layer) |
| `amount` | Float | > 0 |
| `stageNote` | String? | e.g. "For the frosting" |

**RecipeStep**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (String) | PK |
| `recipeId` | String | FK → Recipe (cascade delete) |
| `stepNumber` | Int | ≥ 1, unique per recipe |
| `text` | String | Non-empty |

### 4.2 Relationships

```
User ──< Recipe ──< RecipeIngredient >── Ingredient
                └─< RecipeStep
```

- Deleting a `Recipe` cascades to its `RecipeIngredient` and `RecipeStep` rows.
- Deleting an `Ingredient` is **blocked at the application layer** if any `RecipeIngredient` row references it (see §6).
- The same `Ingredient` may appear in multiple `RecipeIngredient` rows for the same recipe (multi-stage mapping, FR-3.3).

---

## 5. API Design

All routes are prefixed `/api`. All responses are JSON. All routes except `/api/auth/*` require a valid session (HTTP 401 otherwise).

### 5.1 Authentication

| Method | Path | Body | Success | Error |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` | 200 + Set-Cookie | 401 |
| POST | `/api/auth/logout` | — | 204, clears cookie | — |

### 5.2 Ingredients

| Method | Path | Notes | Success | Errors |
|---|---|---|---|---|
| GET | `/api/ingredients` | Returns all, sorted by name | 200 `Ingredient[]` | — |
| POST | `/api/ingredients` | Creates a new global ingredient | 201 `Ingredient` | 409 (duplicate name), 422 (validation) |
| PUT | `/api/ingredients/:id` | Updates if not locked | 200 `Ingredient` | 409 (locked), 422 (validation), 404 |
| DELETE | `/api/ingredients/:id` | Deletes if not locked | 204 | 409 (locked), 404 |

### 5.3 Recipes

| Method | Path | Notes | Success | Errors |
|---|---|---|---|---|
| GET | `/api/recipes` | Returns current user's recipes, newest first | 200 `Recipe[]` | — |
| GET | `/api/recipes/:id` | Full detail including ingredients + steps | 200 `Recipe` | 403 (not owner), 404 |
| POST | `/api/recipes` | Creates recipe + line items + steps in one transaction | 201 `Recipe` | 422 (validation) |
| PUT | `/api/recipes/:id` | Replaces line items + steps in one transaction | 200 `Recipe` | 403, 422, 404 |
| DELETE | `/api/recipes/:id` | Cascades to line items + steps | 204 | 403, 404 |

### 5.4 Response Shape — Recipe (detail)

```json
{
  "id": "uuid",
  "title": "String",
  "description": "String | null",
  "ingredients": [
    {
      "id": "uuid",
      "amount": 200,
      "stageNote": "For the base",
      "ingredient": {
        "id": "uuid",
        "name": "Flour",
        "strictUnit": "Grams",
        "caloriesPerUnit": 3.64,
        "carbsPerUnit": 0.76,
        "fatPerUnit": 0.01,
        "proteinPerUnit": 0.10
      }
    }
  ],
  "steps": [
    { "stepNumber": 1, "text": "Mix dry ingredients." }
  ]
}
```

The full nutrition-per-unit values are embedded in each ingredient line item so the client can calculate totals without a second request (NFR-1.1).

---

## 6. Ingredient Lock Mechanism

**Rule (FR-2.4):** An ingredient cannot be edited or deleted while any `RecipeIngredient` row references it.

**Implementation:**

- A service function `isIngredientLocked(id: string): Promise<boolean>` in `ingredientService.ts` queries `RecipeIngredient.count({ where: { ingredientId: id } })`.
- Both `PUT` and `DELETE` handlers call this before acting. A count > 0 returns HTTP 409 with the message: `"This ingredient is used in one or more recipes and cannot be modified."`
- The database layer does **not** enforce this via a FK `RESTRICT` rule — the app layer check is the authoritative gate, which keeps the schema simpler and the error message user-friendly.
- The UI reflects lock state: locked rows show a lock icon with Edit/Delete controls disabled. The client derives this from a `isLocked` boolean included in the `GET /api/ingredients` response (computed server-side).

---

## 7. Authentication Design

**Mechanism:** `express-session` with a signed cookie. For MVP the session store is in-memory (lost on server restart). The store implementation can be swapped for a file-backed or DB-backed store without touching any other code.

**Modularity (NFR-3.1):** All auth logic is isolated in `packages/api/src/middleware/auth.ts`. This file exports exactly three things:

```ts
export const loginHandler:  RequestHandler  // POST /api/auth/login
export const logoutHandler: RequestHandler  // POST /api/auth/logout
export const requireAuth:   RequestHandler  // applied to all /api/* routes
```

No other file contains authentication logic. Swapping to JWT or OAuth in Phase 2 means replacing this one file and its registration in `index.ts`.

**Password storage:** The seed script hashes the hardcoded password with bcrypt (cost factor 10) before writing it to the DB. `loginHandler` uses `bcrypt.compare()` — the plaintext password never touches the DB.

---

## 8. Nutrition Calculation

**Decision:** Calculated entirely client-side (NFR-1.1 — must resolve in < 200 ms).

**Function signature** (`packages/web/src/lib/nutrition.ts`):

```ts
interface NutritionTotals {
  calories: number;
  carbs:    number;
  fat:      number;
  protein:  number;
}

function calculateNutrition(
  lineItems: Array<{ amount: number; ingredient: NutritionPerUnit }>
): NutritionTotals
```

**Formula:** For each line item, multiply each nutrition field by `amount`, then sum across all line items. No rounding is applied at the calculation layer — rounding is a display concern.

**No server round-trip:** The Recipe detail API response embeds all `*PerUnit` values in each ingredient line item (§5.4). The `<NutritionPanel>` component re-runs `calculateNutrition` reactively on every change to the ingredient list in the form — no `useEffect` or debounce needed.

---

## 9. Validation Rules

Validation is enforced at the API layer (all requests). The UI mirrors these rules to give inline feedback before submission.

| Field | Rule |
|---|---|
| `Ingredient.name` | Non-empty string; unique across all ingredients |
| `Ingredient.strictUnit` | Must be one of: `Grams`, `Milliliters`, `Units`, `Package` |
| `Ingredient.*PerUnit` | Float ≥ 0; required (not null) |
| `RecipeIngredient.amount` | Float > 0 (strictly positive) |
| `Recipe.title` | Non-empty string |
| `RecipeStep.stepNumber` | Integer ≥ 1; unique per recipe |
| `RecipeStep.text` | Non-empty string |

HTTP 422 is returned for all validation failures, with a body of `{ errors: { field: "message" } }`.

---

## 10. Frontend Pages & Routing

| Route | Page | Auth Required |
|---|---|---|
| `/login` | `LoginPage` | No |
| `/recipes` | `RecipeListPage` | Yes |
| `/recipes/new` | `RecipeDetailPage` (create mode) | Yes |
| `/recipes/:id` | `RecipeDetailPage` (view mode) | Yes |
| `/recipes/:id/edit` | `RecipeDetailPage` (edit mode) | Yes |
| `/ingredients` | `IngredientsPage` | Yes |

A `<PrivateRoute>` wrapper reads session state from a top-level React context. If the session is absent it redirects to `/login`. Unauthenticated API responses (401) also redirect to `/login` via a centralized fetch wrapper in `packages/web/src/api/`.

---

## 11. Key Design Decisions & Tradeoffs

| Decision | Chosen Approach | Rejected Alternative | Reason |
|---|---|---|---|
| Data storage | SQLite (single file) | PostgreSQL | MVP is single-user local; no need for a separate DB process |
| ORM | Prisma | Raw SQL (better-sqlite3) | Schema-as-code migrations and auto-generated TypeScript types reduce errors in the data layer |
| Session store | In-memory (express-session) | JWT in localStorage | Simpler for MVP; swappable (NFR-3.1); avoids XSS token exposure |
| Nutrition calculation | Client-side pure function | Server-side computed field | Eliminates a round-trip; keeps the calculation testable in isolation; satisfies NFR-1.1 |
| Ingredient lock | App-layer check (409) | DB-layer FK RESTRICT | User-friendly error messages; simpler schema |
| Recipe update strategy | Delete-and-reinsert line items | Diff and patch | Avoids stale orphan rows; simpler code for MVP |
| Styling | CSS Modules | Tailwind CSS | No build-time dependency on a PostCSS pipeline; scoped styles avoid class name collisions |
