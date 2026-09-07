# Stage 6: Release Retrospective — Party Battles, Diff Viewer & Story Appender

## What Went Well
1. **Seamless Workflow Integration**: Appending fight story prose directly into the active article editor bridges the gap between dice simulation and worldbuilding prose.
2. **Reversible Rollback Guard**: Writing `${timestamp}_prerollback_rev.md` snapshot files ensures zero data loss during version rollbacks.
3. **Template Exchange**: JSON export/import allows sharing custom article category templates.

## Key Learnings
- **Database Schema Alignment**: Always double check SQLite column names (`label` vs `title`, `relationship_type` vs `relation_type`) when writing batch seeders or test helpers.

## Decision Memory Log Update
- Added ADR 29 to `DECISIONS.md`.
