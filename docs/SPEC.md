# Product Requirement Document (PRD): Recipe Planner

## 1. Overview & Objectives
The **Recipe Planner** is a digital tool designed to help users document recipes and track total recipe nutritional values based on their ingredient components. 

### 1.1 Scope
* **Phase 1 (MVP):** Single-user authentication via hardcoded credentials, local/lightweight data storage, and core CRUD capabilities for recipes. Ingredients are managed globally and shared across all system users.
* **Future Phases:** Dynamic multi-tenant authentication (OAuth/JWT), interactive meal planning, and automated grocery list generation.

---

## 2. User Personas & Use Cases
* **The Home Chef:** Wants to document personal recipes using an existing dictionary of ingredients.
* **The Contributor:** Wants to add new unique ingredients to the shared system database so they can be utilized in recipes by anyone.

---

## 3. Functional Requirements

### 3.1 User Authentication (MVP Stage)
* **FR-1.1:** The system must restrict application access via a login screen.
* **FR-1.2:** Authentication must validate against a single set of hardcoded credentials (`username` / `password`).
* **FR-1.3:** Upon successful login, a session must be established. Created recipes will explicitly belong to this active user session.

### 3.2 Shared Ingredient Management
* **FR-2.1 (Global Resource):** Ingredients are a globally shared asset. Any user can view and use any ingredient defined in the system. Any user can create a new global ingredient.
* **FR-2.2:** Each ingredient must support the following metadata attributes:
  * **Name:** Unique string identifier (e.g., "Granulated Sugar").
  * **Unit Type:** A single, strict unit category assigned upon creation (e.g., Grams, Milliliters, or Units). 
  * **Nutritional Values:** Calories, Carbohydrates, Fats, and Proteins (normalized strictly against the assigned unit type).
* **FR-2.3 (No Unit Conversions):** The system will not perform any unit conversions. An ingredient must be added to a recipe using its exact predefined unit type.
* **FR-2.4 (Strict Usage Lock - Modification & Deletion):** An ingredient cannot be modified (edited) or deleted from the system if it is currently referenced by any recipe in the entire database. 
  * If a user attempts to edit or delete a locked ingredient, the system must reject the request with a clear error message.
  * Ingredients that are not used in any recipe remain fully editable and deletable.

### 3.3 Recipe Creation & Management
* **FR-3.1:** Users can create, read, update, and delete their own recipes. Recipes are private to the user session that created them.
* **FR-3.2:** A recipe entity must consist of a Title, an optional Description, and a list of Preparation Steps (ordered text lines).
* **FR-3.3 (Multi-Stage Ingredient Mapping):** The system must allow the same global ingredient to be added to a single recipe multiple times as separate line items. This allows users to allocate quantities to different preparation stages using a structural note text field.
* **FR-3.4 (Auto-Nutrition Aggregation):** The system must automatically calculate and display the total nutritional footprint of the entire recipe by summing up the raw ingredient values based on their quantities. No calculation adjustment for "servings" is performed.

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Usability & Performance
* **NFR-1.1 (Latency):** Recipe nutrition calculations must happen client-side or resolve in less than 200ms to ensure a seamless UI experience.
* **NFR-1.2 (Responsiveness):** The user interface must scale gracefully from mobile kitchen screens to desktop entry layouts.

### 4.2 Security & Data Integrity
* **NFR-2.1 (Relational Integrity):** The database layer must enforce constraints to prevent data corruption. Any update or delete operation on an `Ingredient` record that has associated records in the `RecipeIngredient` mapping table must be rejected.
* **NFR-2.2 (Data Validation):** Ingredient quantities and nutritional values must strictly reject negative values or empty fields.

### 4.3 Extensibility & Maintainability
* **NFR-3.1 (Auth Modularity):** Authentication logic must be isolated in an independent middleware module so the hardcoded mechanism can be easily swapped for an identity provider (e.g., Auth0, Firebase, or JWT database auth) in Phase 2.

---

## 5. Proposed Data Model (Conceptual)

### Ingredient (Global Entity)
```json
{
  "ingredient_id": "uuid",
  "name": "String",
  "strict_unit": "Enum(Grams, Milliliters, Unit, Package)",
  "nutrition_per_unit": {
    "calories": "Float",
    "carbs": "Float",
    "fat": "Float",
    "protein": "Float"
  }
}
```

### Recipe (User-Owned Entity)
```json
{
  "recipe_id": "uuid",
  "user_id": "uuid", 
  "title": "String",
  "description": "String",
  "ingredients_mapped": [
    {
      "ingredient_id": "uuid",
      "amount": "Float",
      "stage_note": "String (e.g., 'For the cake base')"
    },
    {
      "ingredient_id": "uuid",
      "amount": "Float",
      "stage_note": "String (e.g., 'For the frosting')"
    }
  ],
  "instructions": [
    {"step_number": 1, "text": "Mix base ingredients together."},
    {"step_number": 2, "text": "Bake and frost the cake."}
  ]
}
```
