# Stage 1: Persona Ideation & Initial Grilling

**Feature Title**: Backend Error Resilience & Data Sync Integrity
**Date**: 2026-08-13
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 👥 Persona Synthesis & Initial Perspectives

- 👔 **Ethen (PO)**: "LoreVault needs rock-solid stability. If an author writes a detailed 3,000-word chapter or a DM creates 50 map pins, losing that data due to an unhandled error or a desynced SQLite-to-Markdown file write is unacceptable."
- 🧪 **Riley (QA Lead)**: "We have over 25 silent `catch (e) {}` blocks in `server.js` swallowing errors silently. When an endpoint fails, it returns an empty payload or hangs, giving zero feedback to the UI or developer logs. We also lack an automated integration test suite to prevent future regressions."
- 🎭 **Alex (System Architect)**: "We need standardized error handling across all Express routes (`{ status: 'error', code: 'ERR_INTERNAL', message: err.message }`), strict runtime payload guards (`x_pct`, `y_pct`, non-empty IDs), atomic SQLite-to-disk Markdown write transactions with rollback, and a dedicated test suite (`test/api-suite.js`)."
- 🎨 **Maya (UI/UX Lead)**: "When the backend returns an error, the UI needs clean error notifications instead of failing silently or showing infinite loading spinners."
- 🤖 **Grant (AI Novelist)**: "AI endpoints like `/api/scene/pov-rewrite` and `/api/narrative/continue-prose` swallow exceptions in silent catches. If Gemini rate-limits or fails, the writer gets stuck without knowing why."
- 🖋️ **Merryn (Craft Purist)**: "Data integrity is paramount. Markdown files on disk must match `lore.db` exactly, every time."

---

## 🔥 Arthur "The Griller" Vance's Socratic Interrogation

### Interrogation 1: The 5-Whys Deep Probe
> **Arthur**: *"Why are we prioritizing server error handling and test automation right now over flashy new UI tools?"*
> 
> **Alex (Dev)**: *"Because without reliable error handling and automated tests, every new feature added by future agents risks silently breaking existing APIs, corrupting user data, or hanging AI drawers."*
>
> **Arthur**: *"Correct. If the foundation is built on silent try/catches, building more features is just adding weight to a crumbling arch."*

### Interrogation 2: Dual Storage Synchronization Failure Modes
> **Arthur**: *"What happens if `db.run()` succeeds in SQLite but `fs.writeFileSync()` fails due to disk permission or invalid path characters?"*
> 
> **Alex (Dev)**: *"Currently, SQLite gets updated but the Markdown file on disk is unchanged or missing, causing a state desync. We must implement a dual-write transaction wrapper: write the file first (or stage it), and if it fails, abort/rollback the database mutation and return an explicit error."*

### Interrogation 3: YAGNI & Complexity Tax
> **Arthur**: *"Are we introducing heavy external dependencies like Zod, Winston, or Jest for this hardening?"*
> 
> **Riley (QA)**: *"No heavy dependencies. We will build lightweight, zero-dependency helper functions inside `server.js` (`handleApiError`, `validatePayload`, `syncArticleToDisk`) and use Node's native test runner (`node --test`) for `test/api-suite.js`."*

---

## 🎯 Stage 1 Verdict
**Arthur's Verdict**: PASSED (Auto-Approved). Proceed to Stage 2 (Design Spec & Gap Remediation).
