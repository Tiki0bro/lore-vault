# Stage 2: Design Specification & Gap Remediation
**Feature**: AI World Simulator & Causality Engine (`ai-world-simulator`)  
**Date**: 2026-08-20  
**Status**: Gate 1 Passed (Arthur Socratic Pass - Auto Mode)

---

## 1. Functional Architecture & Endpoints

### `POST /api/simulation/simulate-era`
- **Payload**:
```json
{
  "world_id": "w_1",
  "timespan_years": 50,
  "entity_ids": ["art_1", "art_2"],
  "custom_catalyst": "A decade of volcanic winter blights crops."
}
```
- **Response**:
```json
{
  "summary": "Simulated 50 years of progression...",
  "generated_events": [
    {
      "year": "1042 3E",
      "title": "The Great Grain Riots",
      "description": "Famine drives border clashes between Aethelgard and Ironhold."
    }
  ],
  "relationship_shifts": [
    { "source_id": "art_1", "target_id": "art_2", "new_status": "Hostile" }
  ]
}
```

### `POST /api/simulation/causality-audit`
- **Payload**: `{ "world_id": "w_1", "article_ids": ["art_1"] }`
- **Response**:
```json
{
  "overall_score": 85,
  "socratic_probes": [
    {
      "question": "If the Mages' Guild controls infinite water conjuration, why are border rivers disputed?",
      "suggested_fix": "Add a magic strain or rare component constraint."
    }
  ]
}
```

### `GET /api/simulation/rumors/:worldId`
- **Response**: `{ "rumors": ["Tavern patrons whisper of shadows in the Northern Mire..."] }`

---

## 2. Guardrails & Fallbacks
- Respect `no_generate_mode` by returning Socratic outline prompts when active.
- Use `callGeminiApi` model candidate retry loop for API resiliency.
