# Stage 1: Persona Ideation & Initial Grilling

**Feature Title**: Architectural Consistency & Logic Conflict Remediation
**Date**: 2026-08-18
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 👥 Persona Synthesis & Initial Perspectives

- 👔 **Ethen (PO)**: "We hardened the backend APIs and dual-storage sync previously. Now we must ensure the entire frontend experience feels seamless. When a user switches worlds in the top navbar, every tab (Atlas, Timeline, Relationships, Frontpage) must instantly switch context to that new world."
- 🧪 **Riley (QA Lead)**: "Right now, `switchWorld(worldId)` in `app.js` only re-fetches Codex articles and categories. It ignores `window.atlasView`, `window.timelineView`, `window.frontpageView`, and `window.relationshipView`. That means switching worlds leaves maps, timelines, and relationships displaying stale data from the old world!"
- 🎭 **Alex (System Architect)**: "We also have architectural duplication in `server.js`. `callGeminiApi` and `callGeminiApiWithFallback` do the exact same candidate retry loop. We need to unify them into a single authoritative AI helper function, and standardize `switchTab` lifecycle methods across all client views."
- 🎨 **Maya (UI/UX Lead)**: "When switching worlds or navigating tabs, all views should update smoothly without requiring hard page reloads."
- 🤖 **Grant (AI Novelist)**: "Unifying AI helper functions ensures consistent model fallback and timeout behavior across all novel writing, beat generation, and relationship conflict endpoints."

---

## 🔥 Arthur "The Griller" Vance's Socratic Interrogation

### Interrogation 1: Cross-View World Synchronization Mismatch
> **Arthur**: *"What is the exact architectural failure when a user switches worlds from 'Fantasy Realm' to 'Sci-Fi Universe' in the navbar?"*
> 
> **Alex (Dev)**: *"`switchWorld` in `app.js` updates `this.currentWorldId` and re-fetches Codex articles, but does not notify `AtlasView`, `TimelineView`, `FrontpageView`, or `RelationshipView`. If the user opens the Atlas or Timeline tab, it still displays maps or events from 'Fantasy Realm'."*
> 
> **Arthur**: *"That is a fundamental state propagation bug. How will you fix it?"*
> 
> **Alex (Dev)**: *"We will introduce a central `notifyWorldChange(worldId)` method in `app.js` that propagates the new `worldId` to all instantiated views (`atlasView`, `timelineView`, `frontpageView`, `relationshipView`), clearing stale cached state and triggering automatic re-renders."*

### Interrogation 2: Duplicated AI Code in Backend
> **Arthur**: *"Why are there two separate Gemini API helper functions in `server.js`?"*
> 
> **Alex (Dev)**: *"Two separate development sessions created `callGeminiApi` and `callGeminiApiWithFallback`. We will merge them into a single `callGeminiApiWithFallback(prompt, apiKey, requestedModel)` helper that handles candidate model retries, custom models, and timeouts uniformly."*

### Interrogation 3: Regression Test Coverage
> **Arthur**: *"How will we verify that world state propagation and API endpoints don't regress?"*
> 
> **Riley (QA)**: *"We will expand `test/api-suite.js` to cover world filtering parameters (`?world_id=...`), map hierarchy endpoints, timeline event APIs, and relationship matrix endpoints."*

---

## 🎯 Stage 1 Verdict
**Arthur's Verdict**: PASSED (Auto-Approved). Proceed to Stage 2 (Design Spec & Gap Remediation).
