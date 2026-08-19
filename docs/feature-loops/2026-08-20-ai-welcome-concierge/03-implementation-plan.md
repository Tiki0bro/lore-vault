# Stage 3: Implementation Plan & Team Validation

**Feature Name**: AI Welcome Concierge & User Journey Launcher System  
**Date**: 2026-08-20  
**Status**: Completed (Gate 2 Auto-Approved)  

---

## 1. Implementation Components
1. **`server.js`**: Added `fallbackConciergeRoute` regex router and `POST /api/concierge/route-intent` endpoint with Gemini model fallback loop (`callGeminiApi`) and `safeExtractJSON` parsing.
2. **`public/index.html`**: Added `✨ Concierge` (`Ctrl + Shift + W`) navbar button and glassmorphic `#welcome-concierge-modal` overlay container with 4 preset intent cards and custom AI prompt input.
3. **`public/css/styles.css`**: Added CSS rules for `.concierge-modal-container`, `.concierge-preset-grid`, `.concierge-preset-card`, `.concierge-input`, and light/dark theme tokens.
4. **`public/js/app.js`**: Added `ConciergeManager` methods (`initConcierge`, `toggleConciergeModal`, `openConciergeModal`, `closeConciergeModal`, `toggleConciergeStartupPref`, `executeConciergePreset`, `submitConciergeAIIntent`, `applyConciergeRouting`) and hotkey event listeners (`Ctrl + Shift + W` and `Escape`).
5. **`test/api-suite.js`**: Added integration test suite for `POST /api/concierge/route-intent`.

---

## 2. Test Strategy & Validation
- **TDD/SDD Automated Tests**: `npm test` runs Node test runner against `POST /api/concierge/route-intent` verifying empty input fallbacks, writer intent, atlas intent, statblock intent, and doctor audit intent.
- **Client Offline Resilience**: Client-side regex router guarantees 0ms latency for preset cards and offline fallback if server/AI API is unavailable.
