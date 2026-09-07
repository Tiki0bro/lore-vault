# Stage 3: Implementation Plan — Interactive Timeline Chronology & Era Branch Visualizer

## Implementation Steps

1. **Schema Migration & Routes in `server.js`**:
   - Add `ALTER TABLE timeline_events ADD COLUMN end_year TEXT` and `era_name TEXT`.
   - Update `POST /api/worlds/:worldId/timeline` to support `end_year` and `era_name`.
   - Add `POST /api/timeline/extract-event` text extraction route.

2. **Automated Integration Test Verification**:
   - Add test case verifying creation and retrieval of span events with `end_year` and `era_name`.
   - Run `npm test` to verify all tests pass.
