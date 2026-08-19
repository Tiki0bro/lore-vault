# Stage 1: Persona Ideation & Initial Grilling
**Feature**: DM Secrets & Canon Integrity Suite (`dm-secrets-canon-integrity`)  
**Date**: 2026-08-20  
**Status**: Stage 1 Complete (Arthur Socratic Pass)

---

## 1. Feature Concept Overview
Enables DMs to embed secret inline notes directly within lore articles using `[secret]DM Only Content...[/secret]`, toggle global DM vs. Player Mode across the entire app, and run pre-flight canon audits to catch broken references and DM secret leaks before publishing or exporting.

---

## 2. Persona Ideation Slate
- 🎭 **Morgan Reed (Power Worldbuilder)**: "DMs write lore for both themselves and their players. Having to maintain two separate documents for every article is painful. Inline `[secret]` tags solve this."
- 🧪 **Riley Chen (QA)**: "Player mode `?mode=player` MUST sanitize `[secret]` blocks on the backend so secret data NEVER hits the browser network payload."
- 🎨 **Maya Lin (UI/UX)**: "A prominent DM / Player mode toggle switch in the main navigation bar makes global view switching unmistakable."

---

## 3. Arthur's Stage 1 Verdict
**STATUS**: APPROVED  
"Server-side secret stripping is non-negotiable for true security."
