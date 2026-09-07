# Stage 6: Release Retrospective & Next Release Brainstorming

**Feature Title**: Custom AI Skills & Formatting Rules Engine
**Date**: 2026-08-20

---

## 🎯 Architectural Rationale & Decisions Log

1. **Database Schema**: Initialized `ai_skills` table in [server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js) `(id, world_id, name, description, directives, is_active)`.
2. **Backend Endpoints**: Built `GET /api/skills`, `POST /api/skills`, `DELETE /api/skills/:id`, and `POST /api/skills/generate` in [server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js).
3. **Prompt Injection Logic**: Added `getActiveSkillsPromptDirectives()` helper in [server.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/server.js) to inject active directives into `/api/ai/assist` and `/api/audit/flesh-out-stub` prompts.
4. **UI Components**: Created `#ai-skills-modal` (AI Skills Manager Modal) and `#ai-skill-generator-modal` in [public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html) and added `openAISkillsModal()`, `toggleAISkill()`, `saveAISkillFromForm()`, and `runAISkillGenerator()` in [public/js/app.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/app.js).
