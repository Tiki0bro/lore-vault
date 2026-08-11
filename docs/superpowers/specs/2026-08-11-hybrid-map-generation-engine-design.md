# Hybrid Map Generation Engine — Technical Design Spec
**Feature**: Hybrid Map Image Generation (Procedural HTML5 Canvas + AI Image Synthesis)
**Date**: 2026-08-11
**Status**: APPROVED DESIGN SPEC

---

## 1. Overview & Purpose

Currently, `Upload Map` allows users to import custom map image files, while `Auto-Generate Map` places lore pins on a static default image.

The **Hybrid Map Generation Engine** upgrades `Auto-Generate Map` to synthesize **brand-new, unique map image files** on demand:
- **Procedural Canvas Engine** *(Default, Offline & Instant)*: Uses client-side 2D Perlin noise and Voronoi cell algorithms to generate custom landmasses (Pangaea, Archipelago, Inland Sea, Coastal Fjords) with ocean contour lines and parchment textures.
- **AI Art Engine** *(Optional)*: Uses generative AI to synthesize painterly fantasy world map artwork based on vault lore context.

---

## 2. Component Architecture

```
[ User Clicks "✨ Auto-Generate Map" ]
              │
              ▼
    ┌───────────────────────────────────┐
    │ Modal: #atlas-generate-modal      │
    │  - Title Input                    │
    │  - Mode: Procedural vs AI         │
    │  - Geography Preset (Pangaea...)  │
    │  - Theme (Parchment, Void...)     │
    │  - [🎲 Reroll Seed]               │
    └───────────────────────────────────┘
              │
     ┌────────┴─────────────────┐
     ▼                          ▼
[ Procedural Canvas ]   [ AI Art Engine ]
 2D Perlin Noise Land   Prompt Construction
 Voronoi Elevation      Gemini Imagen API
 Ocean Contour Rings    Save PNG to /uploads
 Export PNG Blob to API
     │                          │
     └────────┬─────────────────┘
              ▼
  ┌──────────────────────────────┐
  │ Save Map Record in SQLite    │
  │ Auto-Place Lore Pins          │
  │ Render in Leaflet Canvas     │
  └──────────────────────────────┘
```

---

## 3. UI/UX Specification (`#atlas-generate-modal`)

- **Modal Trigger**: `✨ Auto-Generate Map` button in the main Atlas toolbar.
- **Controls**:
  - `Map Title` text input (default: `"World of [WorldName]"`).
  - `Engine Selector`: Segmented control (`🎲 Procedural Canvas (Instant & Offline)` vs `🤖 AI Art Generator`).
  - `Geography Preset`: Visual card selector:
    - 🌍 **Pangaea Continent**: Single central landmass with coastal bays.
    - 🏝️ **Archipelago & Islands**: Scattered island chains and reefs.
    - 🌊 **Inland Sea**: Ring continent with central ocean.
    - 🏔️ **Mountain Fjords**: Jagged coastlines with high ridges.
  - `Cartography Theme`:
    - 📜 **Vintage Parchment**: Aged parchment, sepia ocean contours, dark ink landmasses.
    - 🌌 **Dark Fantasy Void**: Slate background with glowing cyan coastlines.
    - 🌿 **High Magic Emerald**: Rich emerald forests and deep blue oceans.
  - `Live Canvas Preview`: $400 \times 225$ real-time preview canvas updating live as options/seed change.
  - `[🎲 Reroll Seed]` button: Randomizes seed and updates preview instantly (<50ms).
  - `[✨ Generate & Load Map]` primary button.

---

## 4. Procedural Canvas Generator (`public/js/perlin-cartography.js`)

### 4.1 Perlin/Simplex Noise Landmass Synthesis
- Generates 2D heightmap $H(x, y) = \text{Perlin}(x \cdot f, y \cdot f) + 0.5 \cdot \text{Perlin}(x \cdot 2f, y \cdot 2f)$.
- Applies geography preset mask $M(x, y)$ (e.g. radial falloff for Pangaea, inverse falloff for Inland Sea).
- Elevation Threshold: $H(x, y) \ge 0.45 \implies \text{Landmass}$, $H(x, y) < 0.45 \implies \text{Ocean}$.

### 4.2 Ocean Contour Lines & Parchment Styling
- Computes Euclidean distance field from ocean pixels to nearest coastline.
- Renders 3 concentric ocean ripple contour lines ($5\text{px}$, $15\text{px}$, $30\text{px}$ off coastlines).
- Applies noise-based hachure shading along mountain ridges ($H(x, y) \ge 0.70$).
- Overlays parchment texture grain filter.

### 4.3 Image Blob Export & API Save
- Converts canvas content to high-res PNG blob ($1920 \times 1080$).
- Posts blob to `POST /api/maps/generate/procedural` via `FormData`.

---

## 5. API Endpoints (`server.js`)

### `POST /api/maps/generate/procedural`
- **Payload**: `FormData` containing `image` (PNG blob), `world_id`, `title`, `preset`, `theme`, `auto_pins` (boolean).
- **Behavior**:
  1. Saves uploaded image to `/uploads/images/map-proc-[timestamp].png`.
  2. Inserts new map row into SQLite `maps` table (`width: 1920`, `height: 1080`).
  3. If `auto_pins` is true, runs force-directed layout engine to scatter vault locations onto appropriate biomes (mountain pins on high elevation, port pins on coastlines).
  4. Returns `{ success: true, map, pins }`.

### `POST /api/maps/generate/ai`
- **Payload**: `{ world_id, title, preset, theme, auto_pins }`.
- **Behavior**:
  1. Constructs detailed prompt based on vault lore and parameters.
  2. Queries AI Image Generation API.
  3. Saves returned PNG to `/uploads/images/map-ai-[timestamp].png`.
  4. Inserts map row into SQLite and places lore pins.
  5. Fallback: If API call fails or key is missing, automatically delegates to procedural image synthesis and returns warning message.

---

## 6. Verification & QA Plan

### Automated Test Suite (`scratch/test-hybrid-map-generator.js`)
1. **Procedural Math Verification**: Verify 2D noise elevation heightmap generation and preset mask calculation.
2. **API Endpoint Verification**:
   - Test `POST /api/maps/generate/procedural` with binary blob payload.
   - Verify image file created on disk in `/uploads/images/`.
   - Verify SQLite `maps` row created.
   - Verify force-directed pin placement logic.
3. **AI Fallback Test**: Verify `POST /api/maps/generate/ai` fallback loop when AI credentials are absent.

---

## 7. Spec Self-Review Check
- ✅ No placeholders or TBDs.
- ✅ Clear distinction between client-side canvas rendering (for instant zero-dependency generation) and server-side image storage.
- ✅ Graceful AI API fallback handling.
