# Feature Loop Stage 6: Release Retrospective
**Feature**: Interactive World Atlas v2 (Nested Sub-Maps, Scale Ruler, Pin Search & Expedition Paths)
**Date**: 2026-08-11
**Status**: Feature Loop Complete & Released

---

## 1. Release Highlights

Interactive World Atlas v2 has been fully delivered, tested, and integrated into LoreVault:
- **Nested Sub-Map Hierarchy**: Drill-down from world maps to city/dungeon maps with dynamic breadcrumb navigation.
- **Distance Scale Ruler & Travel Calculator**: Calibrate map scale and measure travel distances with Foot, Horse, and Sail time estimators.
- **Pin Search & Category Chips**: Filter map pins by 8 standard categories and real-time text matching with single-match auto-panning.
- **Expedition Route Drawing**: Draw polyline travel paths with cumulative distance totals.
- **Offline HTML Atlas Exporter**: Single-file bundle exporter upgraded to package routes, sub-map trees, scale math, and search controls offline.

---

## 2. Key Decisions Logged in DECISIONS.md

- **Normalized Scale Calibration**: Stored scale calibration as `scale_pixels` / `scale_distance` relative to map width for screen-scaling safety.
- **Cyclic Sub-Map Detection**: Breadcrumbs stack resolves map tree ancestry dynamically and prevents recursive loop navigation.
- **Player Secret Filtering**: `is_secret = 0` enforced across pins, territories, routes, and sub-maps in player mode.
