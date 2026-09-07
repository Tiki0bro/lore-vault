# Stage 2: Design Spec & Gap Remediation

**Feature Title**: Chronos Matrix: Custom Calendars & Multi-Epoch Historical Era Forking
**Date**: 2026-08-21
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 📐 Technical Architecture & Data Models

### Database Schema
1. `custom_calendars`:
   - `id`, `world_id`, `name`, `days_per_year`, `months_json`, `weekdays_json`, `moon_cycles_json`, `epoch_name`, `current_year`, `current_day`, `is_secret`, `created_at`
2. `era_forks`:
   - `id`, `world_id`, `name`, `start_year`, `end_year`, `parent_era_id`, `divergence_event`, `description`, `is_secret`, `created_at`

### REST Endpoints
- `GET /api/worlds/:worldId/calendars` (supports `?mode=player`)
- `POST /api/calendars` & `DELETE /api/calendars/:id`
- `POST /api/calendars/calculate-date`
- `GET /api/worlds/:worldId/era-forks` & `POST /api/era-forks` & `DELETE /api/era-forks/:id`

---

## 🔍 Arthur's Socratic Review & Gaps
- **Gap 1**: Ensure leap days or uneven months don't crash date calculation.
  - *Remediation*: Implemented iterative day accumulation across custom month definitions with fallback.
- **Verdict**: PASSED.
