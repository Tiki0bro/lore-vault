# Stage 2: Design Spec & Gap Remediation Loop

**Feature Title**: World Doctor Suite v4 Diagnostic Expansion (5 Advanced Features)
**Date**: 2026-08-20

---

## 1. Feature Specifications

1. **Timeline & Anachronism Auditor**: Cross-references timeline events against era ranges and character birth/death dates.
2. **Faction Web & Alliance Tension Auditor**: Scans faction relations for alliance triangle paradoxes (`A <-> B` allied, `B <-> C` allied, but `A <-> C` hostile).
3. **DM Secret & Spoiler Leak Auditor**: Catches public articles referencing secret statblocks (`is_secret = 1`) or secret tags.
4. **Cross-World Lore Bleed Guard**: Flags articles cross-linking to entries belonging exclusively to other `world_id` scopes.
5. **Category Depth & Readability Heatmap**: Computes average word count per category and renders depth progress bars.

---

## 🔥 Arthur's Grilling Sign-Off (Stage 2 Gate 1)
**Arthur's Verdict**: PASSED. Specs are complete. Proceed to Stage 3 (Implementation Plan).
