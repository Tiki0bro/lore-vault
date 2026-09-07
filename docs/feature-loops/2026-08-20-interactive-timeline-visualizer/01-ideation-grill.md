# Stage 1: Persona Ideation & Initial Grilling — Interactive Timeline Chronology & Era Branch Visualizer

## Feature Overview
- **Feature Name**: Interactive Timeline Chronology & Era Branch Visualizer
- **Target Release Date**: 2026-08-20
- **Lead Champion Personas**: 🎭 Elena Rostova (Novelist), 🎨 Maya Lin (UI/UX Designer), 👔 Ethen (PO)
- **Primary Goal**: Enhance LoreVault's timeline engine with horizontal Gantt-style era lanes, multi-year event spans (`start_year` to `end_year`), era filter tags (*First Age*, *Dragon Wars*, *Rebuilding*), and 1-click **"Extract Timeline Event from Selection"** inside the editor.

---

## Technical Specifications & Features

1. **Multi-Year Event Spans & Era Fields**:
   - `timeline_events` schema supports `end_year` (string) and `era_name` (string).
   - If `end_year` is present, render event as a horizontal span bar across timeline lanes.

2. **REST API Extensions (`/api/worlds/:worldId/timeline`)**:
   - Accepts `POST /api/worlds/:worldId/timeline` with `end_year`, `era_name`, and `lane_category`.
   - Supports filtering by `era_name` via `GET /api/worlds/:worldId/timeline?era=...`.

3. **1-Click Text Selection Extraction**:
   - `POST /api/timeline/extract-event`: Takes selected text from an article and extracts event title, display year, and summary.

---

## 🔍 Arthur "The Griller" Vance's Socratic Interrogation

1. **Arthur**: *"How will the UI display events that span centuries alongside single-year events?"*
   - **Elena & Maya**: *"Visual timeline lanes display span bars with start and end dates labeled on mouse hover, while point events display as glowing node pins."*
2. **Arthur**: *"Does this break existing simple timeline events that only have `display_year`?"*
   - **Riley & Alex**: *"No; if `end_year` is null, the system seamlessly defaults to rendering a single point pin."*
3. **Arthur**: *"Is player secret filtering enforced for timeline events?"*
   - **Merryn**: *"Yes! `GET /api/worlds/:worldId/timeline?mode=player` filters out any events marked with `is_secret = 1`."*

---

## 👥 Persona Sign-Offs
- 🎭 **Elena (Novelist)**: Approved (Gantt-style era lanes for historical sagas).
- 🎨 **Maya (UI/UX)**: Approved (Glowing era pins and span bars).
- 🔍 **Arthur (Architect)**: Approved (Seamless backwards compatibility).
