# Stage 1: Ideation & Persona Grilling Report

**Feature Name**: AI Welcome Concierge & User Journey Launcher System (Features 1, 2, 3)  
**Date**: 2026-08-20  
**Status**: Stage 1 Complete  

---

## 1. Feature Synthesis Across 3 Sub-Features
1. **Feature 1 (UI/UX & Presets)**: Glassmorphic Welcome Concierge modal (`#welcome-concierge-modal`) with 4 instant 0ms preset intent cards (*Worldbuilder*, *Literary Journey / Zen Writer*, *DM Campaign Prep*, *World Doctor Audit*), header button (`✨ Concierge`), keyboard shortcut (`Ctrl + Shift + W`), and `localStorage` startup preference.
2. **Feature 2 (AI Intent Classifier & Router)**: `POST /api/concierge/route-intent` server endpoint using Gemini model fallback loop (`gemini-flash-latest`, `gemini-2.0-flash`, `gemini-3.1-pro-preview`, `gemini-pro-latest`) to classify freeform text into structured workspace state transitions (`target_view`, `enable_zen_mode`, `open_drawer`, `search_filter`, `action_summary`).
3. **Feature 3 (QA, Craft Purist & Offline Fallback)**: Client-side regex intent router when offline or API fails, strict JSON schema validation, and `no_generate_mode` compliance.

---

## 2. Arthur "The Griller" Vance's Socratic Probe
- **Q1 (The 5-Whys Root Value)**: *Why do we need a Concierge on startup?*
  - **Verdict**: Returning users often forget where they left off or get overwhelmed by sidebars. The Concierge provides immediate direction based on their intent (*"Writing today"* vs *"Prepping for DM tonight"*).
- **Q2 (YAGNI & Latency Risk)**: *What happens if Gemini API is slow or offline?*
  - **Verdict**: Preset cards execute locally with 0ms delay without contacting the server. Custom typed inputs have a client-side regex router fallback if the API times out or is offline.
- **Q3 (Craft Purist Guardrail)**: *Does this violate Merryn's No-Generate Mode?*
  - **Verdict**: No! The router only output workspace navigation actions (`target_view`, `enable_zen_mode`, `open_drawer`), never generating prose unless requested.

---

## 3. Persona Sign-Offs
- 👔 **Ethen (PO)**: Approved (High user orientation value).
- 🧪 **Riley (QA)**: Approved (Offline fallback & schema validation defined).
- 🎭 **Alex (Dev)**: Approved (Clean REST API contract).
- 🎨 **Maya (UI/UX)**: Approved (Glassmorphic dark/light styling).
- 🖋️ **Merryn (Craft Purist)**: Approved (No unauthorized prose generation).
