# Stage 3: Implementation Plan — Canon Doctor & Auto-Fixing Engine 2.0

## Implementation Steps

1. **Add `POST /api/audit/auto-crosslink` in `server.js`**:
   - Query all article titles in world (`length >= 4`).
   - Wrap unlinked occurrences in `@[Title](id)` and update content in DB + disk.

2. **Add `POST /api/audit/check-continuity` in `server.js`**:
   - Send article content & world canon context to Gemini for contradiction checking.

3. **Add Integration Tests in `test/api-suite.js`**:
   - Verify `POST /api/audit/auto-crosslink` and `POST /api/audit/check-continuity`.
