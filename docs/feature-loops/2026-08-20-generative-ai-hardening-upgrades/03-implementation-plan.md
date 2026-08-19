# Stage 3: Implementation & Execution Plan

**Feature Title**: Generative AI Hardening, Tonal Controls & Parsing Resilience
**Date**: 2026-08-20
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 📋 Actionable Execution Plan

### Step 1: Implement `safeExtractJSON` in `server.js`
- Create `safeExtractJSON` helper function.
- Integrate in `/api/relationships/auto-extract` and `/api/relationships/spark-conflict`.

### Step 2: Implement `tone_preset` & `no_generate_mode` in `/api/ai/assist`
- Add tone prompt injection and `no_generate_mode` guardrail check in `/api/ai/assist`.

### Step 3: Expand Automated Integration Test Suite (`test/api-suite.js`)
- Add test assertions verifying `safeExtractJSON` resilience, `tone_preset` processing, and `no_generate_mode` guardrail.

### Step 4: Verify Syntax & Integration
- Run `node --check server.js` and `npm test`.

---

## 🎯 Stage 3 Gate 2 Auto-Pass
**Arthur's Verdict**: PASSED (Auto-Approved for Stage 4 Execution).
