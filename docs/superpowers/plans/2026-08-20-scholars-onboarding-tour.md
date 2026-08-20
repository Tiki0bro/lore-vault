# Scholar's Orientation Tour & Onboarding Guide Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an interactive 5-step UI spotlight tour and onboarding guide mode in LoreVault to hand-hold first-time users through navigation, article creation, cartography maps, Zen focus mode, Weave Matrix, and AI Concierge hotkeys.

**Architecture:** Create `#onboarding-spotlight-overlay` and `#onboarding-tooltip-card` DOM containers in `public/index.html`. Add CSS animations (`.spotlight-active-ring`, `@keyframes ringPulse`) in `public/css/styles.css`. Add `OnboardingManager` state machine in `public/js/app.js` with `startScholarTour()`, `renderTourStep()`, `nextStep()`, `prevStep()`, `endScholarTour()`, and Command Palette integration.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5, CSS3 Glassmorphism & Keyframe Animations, Node Test Runner (`node --test`).

## Global Constraints

- **5-Step Sequence**: 1) Navigation Tabs, 2) Lore Creation & `@` Cross-Links, 3) World Atlas & Pins, 4) Zen Writer & Weave Matrix, 5) Concierge & Hotkeys.
- **Pass-Through Interactivity**: Users MUST be able to click the highlighted UI element directly during the tour.
- **State Persistence**: Onboarding completion MUST persist in `localStorage.getItem('lorevault_onboarding_completed')`.
- **Theme Parity**: Tooltip card MUST support Ancient Codex, Sci-Fi Aetherpunk, and Scholar's Parchment Light Mode.

---

### Task 1: Onboarding Spotlight Markup & CSS Styling

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Outer backdrop container in `public/index.html`
- Produces: `#onboarding-spotlight-overlay`, `#onboarding-tooltip-card`, `.spotlight-active-ring`

- [ ] **Step 1: Add Onboarding Spotlight overlay & tooltip card to `public/index.html`**

In `public/index.html` (before `#toast-container`):
```html
  <!-- Scholar's Orientation Tour Spotlight Overlay -->
  <div id="onboarding-spotlight-overlay" class="spotlight-overlay hidden">
    <div id="spotlight-active-ring" class="spotlight-active-ring"></div>
    <div id="onboarding-tooltip-card" class="onboarding-tooltip-card">
      <div class="onboarding-card-header">
        <span class="onboarding-badge" id="tour-step-badge">🎓 SCHOLAR'S TOUR — STEP 1 OF 5</span>
        <button class="btn-close-tour" title="Skip Tour" onclick="window.app.endScholarTour()">✕</button>
      </div>
      <h3 id="tour-step-title" class="tour-title">Welcome to LoreVault</h3>
      <p id="tour-step-desc" class="tour-desc">Let's take a quick 2-minute tour of your worldbuilding workspace.</p>
      <div id="tour-step-kbd" class="tour-kbd-container"></div>
      <div class="onboarding-card-footer">
        <button id="tour-btn-prev" class="btn btn-secondary btn-sm" onclick="window.app.prevScholarTourStep()">⏮ Back</button>
        <div class="tour-footer-right">
          <button class="btn-text-skip" onclick="window.app.endScholarTour()">Skip Tour</button>
          <button id="tour-btn-next" class="btn btn-primary btn-sm" onclick="window.app.nextScholarTourStep()">Next ➔</button>
        </div>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Add Scholar Tour banner button to `#welcome-concierge-modal` in `public/index.html`**

In `#welcome-concierge-modal` inside `public/index.html`:
```html
      <!-- Scholar Tour Prompt Banner -->
      <div id="concierge-tour-banner" class="concierge-tour-banner" onclick="window.app.startScholarTour()">
        <span>🎓 New traveler? Take the 2-Minute Scholar's Orientation Tour</span>
        <span class="banner-arrow">➔</span>
      </div>
```

- [ ] **Step 3: Add Spotlight Overlay & Tooltip CSS in `public/css/styles.css`**

Add CSS rules to `public/css/styles.css`:
```css
/* --- SCHOLAR'S ORIENTATION TOUR SPOTLIGHT --- */
.spotlight-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.spotlight-active-ring {
  position: absolute;
  border-radius: 8px;
  pointer-events: none;
  animation: ringPulse 2s infinite ease-in-out;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 10001;
}

@keyframes ringPulse {
  0% { box-shadow: 0 0 0 2px var(--accent-gold, #d4af37), 0 0 15px rgba(212, 175, 55, 0.4); }
  50% { box-shadow: 0 0 0 4px var(--accent-gold, #d4af37), 0 0 25px rgba(212, 175, 55, 0.7); }
  100% { box-shadow: 0 0 0 2px var(--accent-gold, #d4af37), 0 0 15px rgba(212, 175, 55, 0.4); }
}

.onboarding-tooltip-card {
  position: absolute;
  z-index: 10002;
  width: 340px;
  padding: 1.25rem;
  border-radius: 14px;
  background: var(--surface-card, rgba(20, 16, 12, 0.95));
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color, rgba(212, 175, 55, 0.4));
  color: var(--text-primary);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.7), 0 0 20px rgba(212, 175, 55, 0.2);
  pointer-events: auto;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.onboarding-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.onboarding-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--accent-gold, #d4af37);
  background: rgba(212, 175, 55, 0.15);
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  border: 1px solid var(--accent-gold, #d4af37);
}

.btn-close-tour {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.9rem;
}

.tour-title {
  font-family: var(--font-heading, 'Cinzel', serif);
  font-size: 1.1rem;
  margin: 0;
}

.tour-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

.onboarding-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.btn-text-skip {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
  margin-right: 0.5rem;
}

.concierge-tour-banner {
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(12, 10, 8, 0.85) 100%);
  border: 1px solid var(--accent-gold, #d4af37);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.concierge-tour-banner:hover {
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(20, 16, 12, 0.95) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
}

[data-mode="light"] .onboarding-tooltip-card {
  background: var(--bg-surface, #faf6ed);
  border-color: #d6c5a3;
  color: #2c221e;
}
```

---

### Task 2: Onboarding Tour Controller Engine in `public/js/app.js`

**Files:**
- Modify: `public/js/app.js`
- Test: `test/api-suite.js`

**Interfaces:**
- Consumes: `#onboarding-spotlight-overlay`, `#welcome-concierge-modal`
- Produces: `startScholarTour()`, `renderTourStep()`, `nextScholarTourStep()`, `prevScholarTourStep()`, `endScholarTour()`

- [ ] **Step 1: Write integration tests for Scholar's Tour state in `test/api-suite.js`**

Add tests:
```javascript
test('Scholar Tour state & step definitions validation', async () => {
  const tourSteps = [
    { title: 'Navigation Tabs', target: '#nav-tabs-container' },
    { title: 'Lore Creation & Cross-Links', target: '#btn-new-article' },
    { title: 'Interactive World Atlas', target: '#tab-atlas' },
    { title: 'Zen Writer & Weave Matrix', target: '#zen-mode-toggle' },
    { title: 'Concierge & Hotkeys', target: '#concierge-nav-btn' }
  ];
  assert.strictEqual(tourSteps.length, 5);
  assert.strictEqual(tourSteps[0].title, 'Navigation Tabs');
});
```

- [ ] **Step 2: Implement Onboarding Tour methods in `public/js/app.js`**

Add methods to `LoreVaultApp` in `public/js/app.js`:
```javascript
  // --- SCHOLAR'S ORIENTATION TOUR ENGINE ---
  initScholarTour() {
    this.tourSteps = [
      {
        target: '#nav-tabs-container',
        tab: 'frontpage',
        title: '🗺️ Workspace Navigation Tabs',
        desc: 'Switch effortlessly between World Wiki Frontpage, Reader Codex, World Atlas Maps, Timeline Chronology, and Faction Matrix.',
        kbd: ''
      },
      {
        target: '#btn-new-article',
        tab: 'library',
        title: '📝 Lore Creation & Cross-Linking',
        desc: 'Create rich lore articles with WorldAnvil templates. Type @ inside the editor to auto-complete cross-links to other articles!',
        kbd: ''
      },
      {
        target: '#tab-atlas',
        tab: 'atlas',
        title: '🪐 Interactive World Atlas',
        desc: 'Explore custom maps, drop location pins, draw expedition routes, and toggle DM Secret Filters for tabletop sessions.',
        kbd: ''
      },
      {
        target: '#zen-mode-toggle',
        tab: 'library',
        title: '📜 Zen Writer & Weave Matrix',
        desc: 'Draft prose in distraction-free Zen Reader mode. Stage your active chapter into the Weave Matrix context builder for AI assistance.',
        kbd: 'Ctrl + Shift + F & Ctrl + Shift + M'
      },
      {
        target: '#concierge-nav-btn',
        tab: 'frontpage',
        title: '✨ Welcome Concierge & Hotkeys',
        desc: 'Launch your AI Journey Concierge anytime with Ctrl+Shift+W, or press Ctrl+K for Universal Search across your entire world!',
        kbd: 'Ctrl + Shift + W & Ctrl + K'
      }
    ];
    this.currentTourStepIndex = 0;
  }

  startScholarTour() {
    this.closeConciergeModal();
    if (!this.tourSteps || this.tourSteps.length === 0) this.initScholarTour();
    this.currentTourStepIndex = 0;
    const overlay = document.getElementById('onboarding-spotlight-overlay');
    if (overlay) overlay.classList.remove('hidden');
    this.renderTourStep();
  }

  renderTourStep() {
    if (this.currentTourStepIndex < 0) this.currentTourStepIndex = 0;
    if (this.currentTourStepIndex >= this.tourSteps.length) {
      this.endScholarTour();
      return;
    }

    const step = this.tourSteps[this.currentTourStepIndex];
    if (step.tab) window.switchTab(step.tab);

    const badge = document.getElementById('tour-step-badge');
    const title = document.getElementById('tour-step-title');
    const desc = document.getElementById('tour-step-desc');
    const kbd = document.getElementById('tour-step-kbd');
    const btnPrev = document.getElementById('tour-btn-prev');
    const btnNext = document.getElementById('tour-btn-next');

    if (badge) badge.textContent = `🎓 SCHOLAR'S TOUR — STEP ${this.currentTourStepIndex + 1} OF ${this.tourSteps.length}`;
    if (title) title.textContent = step.title;
    if (desc) desc.textContent = step.desc;
    if (kbd) kbd.innerHTML = step.kbd ? `<span class="kbd-hint">${step.kbd}</span>` : '';

    if (btnPrev) btnPrev.disabled = this.currentTourStepIndex === 0;
    if (btnNext) btnNext.textContent = this.currentTourStepIndex === this.tourSteps.length - 1 ? '🎉 Finish Tour' : 'Next ➔';

    // Position spotlight ring and tooltip card
    setTimeout(() => {
      const targetEl = document.querySelector(step.target);
      const ring = document.getElementById('spotlight-active-ring');
      const card = document.getElementById('onboarding-tooltip-card');

      if (targetEl && ring && card) {
        const rect = targetEl.getBoundingClientRect();
        ring.style.top = `${rect.top - 4 + window.scrollY}px`;
        ring.style.left = `${rect.left - 4 + window.scrollX}px`;
        ring.style.width = `${rect.width + 8}px`;
        ring.style.height = `${rect.height + 8}px`;

        // Position card under or above target
        let cardTop = rect.bottom + 12 + window.scrollY;
        if (cardTop + 200 > window.innerHeight) {
          cardTop = rect.top - 210 + window.scrollY;
        }
        let cardLeft = Math.max(16, Math.min(window.innerWidth - 360, rect.left + (rect.width / 2) - 170));

        card.style.top = `${Math.max(16, cardTop)}px`;
        card.style.left = `${cardLeft}px`;
      }
    }, 150);
  }

  nextScholarTourStep() {
    this.currentTourStepIndex++;
    this.renderTourStep();
  }

  prevScholarTourStep() {
    this.currentTourStepIndex--;
    this.renderTourStep();
  }

  endScholarTour() {
    const overlay = document.getElementById('onboarding-spotlight-overlay');
    if (overlay) overlay.classList.add('hidden');
    localStorage.setItem('lorevault_onboarding_completed', 'true');
    this.showToast('🎓 Scholar\'s Orientation Tour completed! Re-launch anytime via Ctrl+K.');
  }
```

- [ ] **Step 3: Update `Command Palette` navigation in `app.js`**

Add `"🎓 Start Scholar's Orientation Tour"` item to `navItems` array inside `updateCommandPaletteResults()` in `public/js/app.js`.

- [ ] **Step 4: Run test suite to verify 100% green pass**

Run: `node --test test/api-suite.js`
Expected: PASS

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-20-scholars-onboarding-tour.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach would you like to take?
