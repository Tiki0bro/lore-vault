# Stage 2: Design Specification — Interactive Timeline Chronology & Era Branch Visualizer

## Schema Enhancements

### `timeline_events` Table Column Additions
```sql
ALTER TABLE timeline_events ADD COLUMN end_year TEXT DEFAULT NULL;
ALTER TABLE timeline_events ADD COLUMN era_name TEXT DEFAULT 'Common Era';
```

---

## REST API Contracts

### `POST /api/worlds/:worldId/timeline`
- **Request Body**:
```json
{
  "title": "Siege of the Sunken Citadel",
  "display_year": "1420",
  "end_year": "1435",
  "epoch_name": "Second Age",
  "era_name": "Dragon Wars",
  "summary": "15-year siege forging the Dragon Pact.",
  "is_secret": 0
}
```
- **Response**: `{ "success": true, "id": "event-1724...", "title": "Siege of the Sunken Citadel" }`

### `POST /api/timeline/extract-event`
- **Request Body**: `{ "text": "In the year 1420, High King Roderick led the siege...", "article_id": "art_1" }`
- **Response**: `{ "success": true, "title": "Siege of Aethelgard", "display_year": "1420", "summary": "..." }`
