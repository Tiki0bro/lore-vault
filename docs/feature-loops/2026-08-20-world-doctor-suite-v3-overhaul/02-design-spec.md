# Stage 2: Design Spec & Gap Remediation Loop

**Feature Title**: World Doctor Suite v3 Overhaul (6 Core Enhancements)
**Date**: 2026-08-20

---

## 1. Feature Specifications

1. **Taxonomy & Tag Consistency Auditor**: Scan orphan tags, provide `POST /api/audit/clean-tags`.
2. **Health Score History Sparkline**: `audit_health_history` SQLite table, `GET /api/audit/health-history`, SVG sparkline UI.
3. **Automated Post-Import Triage**: Toast notification trigger after import with direct `[View Audit]` link.
4. **1-Click Undo Batch Repair**: Snapshot buffer before batch repair, `POST /api/audit/undo-batch-repair`, UI undo banner.
5. **AI Lore Gap Finder**: Pillars analysis (`Locations`, `Characters`, `Factions`, `Magic Systems`), Lore Gap Hero Card.
6. **Unmapped Location Atlas Checker**: Cross-reference `Locations` vs `map_pins`, flag unmapped location articles.

---

## 🔥 Arthur's Grilling Sign-Off (Stage 2 Gate 1)
**Arthur's Verdict**: PASSED. Specs are complete and modular. Proceed to Stage 3 (Implementation Plan).
