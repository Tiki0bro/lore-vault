# Stage 2: Design Specification — SQLite FTS5 Universal Search Engine

## Database Schema & Triggers

### FTS5 Virtual Table (`articles_fts`)
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  id UNINDEXED,
  title,
  category,
  summary,
  content,
  tags
);
```

### Sync Triggers
```sql
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(id, title, category, summary, content, tags)
  VALUES (new.id, new.title, new.category, new.summary, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  DELETE FROM articles_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
  DELETE FROM articles_fts WHERE id = old.id;
  INSERT INTO articles_fts(id, title, category, summary, content, tags)
  VALUES (new.id, new.title, new.category, new.summary, new.content, new.tags);
END;
```

---

## REST API Specification (`GET /api/search/fts`)

- **Query Parameters**:
  - `q` (string, required): Search query keywords
  - `category` (string, optional): Filter by category
  - `world_id` (string, optional): Filter by world ID
  - `mode` (string, optional): `dm` or `player`
- **Response Format**:
```json
{
  "query": "dragon",
  "total_results": 2,
  "results": [
    {
      "id": "art_aethelgard_1",
      "title": "High King Roderick",
      "category": "Characters",
      "summary": "Ruler of Aethelgard and founder of the Order of the Dragon.",
      "highlight_snippet": "...founder of the Order of the <mark>Dragon</mark>..."
    }
  ]
}
```
