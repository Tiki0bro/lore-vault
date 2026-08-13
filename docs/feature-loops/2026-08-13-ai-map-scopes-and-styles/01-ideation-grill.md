# Feature Loop Stage 1: Persona Ideation & Initial Grilling
**Feature**: AI Map Scope Presets, Aesthetic Style Presets, & Automatic Scale Calibration
**Date**: 2026-08-13
**Mode**: Autonomous Fast-Track (--auto)
**Status**: Stage 1 Ideation & Grilling Complete

---

## 1. Feature Intent & Problem Statement

Users need targeted presets for AI map generation to avoid generic, hit-or-miss AI image outputs. DMs need to quickly select specific map scopes (`World Map`, `Region Map`, `City Map`, `Town / Village Map`, `Treasure Map`, `Tactical Battlemap`) and aesthetic styles (`Vintage Sepia Parchment`, `Full-Color Fantasy Codex`, `Grimdark / Dark Fantasy`, `Architect Blueprint Grid`) that automatically shape AI prompts and calibrate Leaflet distance scale metrics (`feet` vs `miles`).

---

## 2. Arthur's Interrogation & Socratic Grilling

#### 🔍 Question 1: Map Scope Presets & Scale Metrics
> **Arthur**: *"How do map scopes affect scale calibration in SQLite?"*
> **Alex**: *"Selecting `City Map`, `Town Map`, or `Battlemap` sets default scale units to `feet` (`scale_unit: 'feet'`, `scale_pixels: 100`, `scale_distance: 50`), while `World Map` and `Region Map` set units to `miles` (`scale_unit: 'miles'`)."*

#### 🔍 Question 2: Dynamic Prompt Construction
> **Arthur**: *"How does the AI generator build the prompt string?"*
> **Grant**: *"The server combines Scope Directives + Aesthetic Style Directives + Target Article Lore Summaries + Custom User Prompt Tweaks + Negative Prompt Constraints ('no text labels, no 3D perspective')."*

#### 🔍 Question 3: UI Layout & Card Selection
> **Arthur**: *"How are presets presented in the generator modal?"*
> **Maya**: *"In `#atlas-generate-modal`, under AI Engine settings, we render a 6-card Scope selector grid and a 4-chip Aesthetic Theme bar."*
