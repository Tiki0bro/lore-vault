# Design Specification — Custom AI Skills & Rules Generator Engine

**Topic**: Custom AI Skills & Formatting Rules Engine (`ai_skills`)  
**Date**: 2026-08-20  
**Status**: APPROVED DESIGN  

---

## 1. Overview

The **Custom AI Skills & Rules Engine** allows LoreVault users to author, toggle, and auto-generate client-specific AI prompt directives ("Skills"). When active, these skills are injected into all AI generation endpoints (`/api/ai/assist`, `/api/audit/flesh-out-stub`, `/api/simulation/*`), ensuring AI output strictly adheres to author-defined formatting, style, terminology, and canon rules.

---

## 2. Database Schema (`server.js`)

```sql
CREATE TABLE IF NOT EXISTS ai_skills (
  id TEXT PRIMARY KEY,
  world_id TEXT DEFAULT 'all',
  name TEXT NOT NULL,
  description TEXT,
  directives TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Backend Endpoints (`server.js`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/skills` | GET | List all custom skills (filtered by `world_id`) |
| `/api/skills` | POST | Create or update a custom skill |
| `/api/skills/:id` | DELETE | Delete a custom skill |
| `/api/skills/generate` | POST | AI generator that creates custom rule directives from a user prompt |

### Prompt Injection Logic
When executing `/api/ai/assist` or `/api/audit/flesh-out-stub`:
1. Query `SELECT directives FROM ai_skills WHERE is_active = 1 AND (world_id = ? OR world_id = 'all')`.
2. Append active directives into the system prompt:
   ```text
   ACTIVE USER SKILLS & DIRECTIVES:
   - [Skill Name]: Directives text...
   ```

---

## 4. Frontend Interface (`public/index.html` & `public/js/app.js`)

### 4.1 AI Skills Manager Modal (`#ai-skills-modal`)
- Accessible via `🧠 AI Skills & Rules` button in navbar header / AI settings.
- Displays list of active/inactive skill cards with toggle switches.
- **Skill Authoring Form**: Input for Name, Description, and System Directives.
- **AI Skill Generator Modal (`#ai-skill-generator-modal`)**: Allows users to describe desired behavior (e.g., *"Make AI write combat scenes in visceral grimdark prose with WorldAnvil tables"*), calls `/api/skills/generate`, and populates the skill editor.

---

## 5. Verification & Testing Strategy

1. **Integration Tests (`test/api-suite.js`)**:
   - Test `GET`, `POST`, `DELETE` on `/api/skills`.
   - Test `POST /api/skills/generate` auto-generation.
   - Test prompt injection in `/api/ai/assist` when skills are active.
2. **Empirical Verification**: Run `npm test` and verify green execution.
