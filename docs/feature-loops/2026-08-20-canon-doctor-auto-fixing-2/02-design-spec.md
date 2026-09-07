# Stage 2: Design Specification — Canon Doctor & Auto-Fixing Engine 2.0

## REST API Specifications

### 1. `POST /api/audit/auto-crosslink`
- **Request Body**: `{ "world_id": "default" }`
- **Response**: `{ "success": true, "updated_articles_count": 3, "total_links_inserted": 12 }`

### 2. `POST /api/audit/check-continuity`
- **Request Body**: `{ "world_id": "default", "article_id": "art_1" }`
- **Response**:
```json
{
  "success": true,
  "article_id": "art_1",
  "contradiction_score": 0,
  "contradictions_found": [],
  "status": "Canon Consistent"
}
```
