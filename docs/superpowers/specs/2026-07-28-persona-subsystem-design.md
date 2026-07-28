# Persona Subsystem Design

## 1. Overview
The Persona Subsystem extends Character Lore Articles with structured data representing a character's internal state (thoughts, wants, needs, and history). This structured data can be utilized for precise LLM context injection during scene generation and chat prompting.

## 2. Architecture & Database
A new SQLite table `personas` will be created to maintain a 1-to-1 relationship with character articles.

### 2.1 Table Schema (`personas`)
- `id` (TEXT, Primary Key)
- `article_id` (TEXT, Foreign Key to `articles.id`, Unique)
- `thoughts` (TEXT)
- `wants` (TEXT)
- `needs` (TEXT)
- `history_log` (TEXT) - Stored as a JSON array of timeline events or simply a concatenated text log. For simplicity in V1, a TEXT field storing newline-separated entries or a simple JSON array string will be used.
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

## 3. Core Components

### 3.1 Persona Hub (Lore Library)
When viewing an Article with `category === 'Characters'`:
- **State 1: No Persona Exists**
  - Render a "🎭 Persona Hub" section at the bottom of the article viewer.
  - Show a "Generate with AI" button and a "Create Manually" button.
  - **Generate with AI**: Calls a backend endpoint that feeds the article's markdown content to the LLM, requesting a structured JSON response containing `thoughts`, `wants`, and `needs`. It then inserts this into the `personas` table and re-renders the UI.
- **State 2: Persona Exists**
  - Render the Persona Hub with editable text areas for `Thoughts`, `Wants`, `Needs`, and `History Log`.
  - Provide a "Save Changes" button to update the `personas` table via a `PUT /api/personas/:article_id` endpoint.

### 3.2 Universal Quick Create (Scene Studio & Context Builder)
- Add a "➕ Quick Persona" button near the Persona Sync/Chat areas in Scene Studio and Context Builder.
- Opens a `quick-persona-modal`:
  - **Inputs**: Name (Text), Brief Background (Textarea).
  - **Action**: On submit, POSTs to `/api/articles` to create a new Lore Article with category "Characters".
  - **Transition**: Immediately upon successful creation, closes the quick modal and opens a Persona Editor modal specifically for this new article ID, allowing the user to flesh out Wants/Needs on the fly before returning to their workflow.

## 4. API Endpoints
- `GET /api/personas/:article_id` - Fetch persona data for an article.
- `POST /api/personas` - Create a new persona entry.
- `PUT /api/personas/:article_id` - Update existing persona fields.
- `POST /api/personas/generate` - LLM route. Accepts `article_id`. Fetches the article content server-side, queries the LLM for persona extraction, and returns the JSON payload.

## 5. Data Flow & State Management
- Personas are lazy-loaded. When an article is viewed in the Lore Library, the client will fetch `/api/personas/:article_id` to determine the UI state.
- The Scene Studio's "Prompt Persona" feature will now augment the system prompt with the structured `thoughts`, `wants`, and `needs` fetched from the `personas` table, ensuring the AI chat stays rigorously in-character.

## 6. Self-Review Checklist
- [x] Clear boundaries: The `personas` table is cleanly separated but linked via `article_id`.
- [x] UI/UX flow: Smooth transitions from universal tabs back to the core data models.
- [x] LLM Integration: Dedicated backend endpoint for AI generation keeps frontend clean.
- [x] Constraints: Handled the state where an article exists but a persona doesn't yet.
