# Stage 1: Persona Ideation & Initial Grilling

**Feature Title**: Chronos Matrix: Custom Calendars & Multi-Epoch Historical Era Forking
**Date**: 2026-08-21
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 👥 Persona Synthesis & Initial Perspectives

- 🎭 **Morgan (World Anvil Migrator)**: "Traditional tools force Gregorian 12-month calendars. In rich fantasy and sci-fi settings, worlds have custom moon cycles, 400-day solar years, and multiple distinct historical ages."
- 🎭 **Elena (Author)**: "Authors need to know what day of the week a festival occurred in Year 842 of the Second Age, and what moon was in the sky to keep scene descriptions consistent."
- 🧪 **Riley (QA Lead)**: "Calendar math is notoriously prone to off-by-one errors and leap day overflows. The calculation algorithm must be strictly deterministic."
- 👔 **Ethen (PO)**: "The UI must be simple out of the box with quick calculation presets, while supporting deep epoch divergence tracking."
- 🔍 **Arthur Vance**: "How do era forks interact with existing timeline events and article history?"

---

## 🔥 Arthur "The Griller" Vance's Socratic Interrogation

### Interrogation 1: Temporal Math & Edge-Case Overflow
> **Arthur**: *"What prevents a custom calendar with 13 unequal months from breaking when a user queries Day 400?"*
> 
> **Alex (Dev)**: *"The `calculateChronosDate` algorithm uses normalized absolute day accumulation across configured month definitions, wrapping day-in-year gracefully and bounding moon phase ratios strictly between 0.0 and 1.0."*

### Interrogation 2: Player View Secret Isolation
> **Arthur**: *"Can DMs create secret alternate timelines and future epochs without spoiling players?"*
> 
> **Riley (QA)**: *"Yes, both `custom_calendars` and `era_forks` support `is_secret = 1` and server-side `?mode=player` filtering."*

---

## 🎯 Stage 1 Verdict
**Arthur's Verdict**: PASSED (Auto-Approved). Proceed to Stage 2.
