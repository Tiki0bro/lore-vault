# Stage 3: Implementation Plan

**Feature Title**: Chronos Matrix: Custom Calendars & Multi-Epoch Historical Era Forking
**Date**: 2026-08-21
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 🛠️ Tasks & Execution Steps

1. **Database Schema**: Add `custom_calendars` and `era_forks` tables in `server.js`.
2. **REST Endpoints**:
   - `GET /api/worlds/:worldId/calendars` & `POST /api/calendars` & `DELETE /api/calendars/:id`
   - `POST /api/calendars/calculate-date`
   - `GET /api/worlds/:worldId/era-forks` & `POST /api/era-forks` & `DELETE /api/era-forks/:id`
3. **Frontend UI**:
   - Add `#chronos-calendar-modal` to `public/index.html`.
   - Add tool dropdown trigger and controller methods in `public/js/app.js`.
4. **Integration Testing**:
   - Add test case in `test/api-suite.js`.
