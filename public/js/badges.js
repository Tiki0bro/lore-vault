/**
 * LoreVault - SVG RPG Badge Asset Library & Icon Generator
 * Renders high-resolution framed SVG badges for UI navigation, categories, and actions.
 */
(function() {
  'use strict';

  // SVG badge definitions (viewBox 0 0 32 32)
  const BADGE_SVGS = {
    // 1. Scroll (Library / Articles)
    scroll: `
      <path d="M6 8C6 6.89543 6.89543 6 8 6H22C23.1046 6 24 6.89543 24 8V24C24 25.1046 23.1046 26 22 26H8C6.89543 26 6 25.1046 6 24V8Z" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/>
      <path d="M8 6C6.34315 6 5 7.34315 5 9C5 10.6569 6.34315 12 8 12H24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M24 26C25.6569 26 27 24.6569 27 23C27 21.3431 25.6569 20 24 20H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M8 12V20" stroke="currentColor" stroke-width="1.5"/>
      <path d="M24 12V20" stroke="currentColor" stroke-width="1.5"/>
      <line x1="11" y1="15" x2="19" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="11" y1="18" x2="16" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    `,

    // 2. Quill (Editor / Writing)
    quill: `
      <path d="M25 5C25 5 17 6 12 14C9.5 18 8 22 7 26C11 25 15 23.5 19 21C27 16 28 8 28 8L25 5Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M7 26L13 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M12 14L18 20" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1 2"/>
      <path d="M4 28L7 26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="23" cy="10" r="1.5" fill="currentColor"/>
    `,

    // 3. Shield (Scene Studio / Factions)
    shield: `
      <path d="M16 4L6 8V15C6 21.5 10.5 26.5 16 28C21.5 26.5 26 21.5 26 15V8L16 4Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M16 7V25" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2"/>
      <path d="M9 13H23" stroke="currentColor" stroke-width="1.2"/>
      <circle cx="16" cy="13" r="2.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
    `,

    // 4. Wax Seal (Categories / Badges)
    waxSeal: `
      <path d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M16 7C11.0294 7 7 11.0294 7 16C7 20.9706 11.0294 25 16 25C20.9706 25 25 20.9706 25 16C25 11.0294 20.9706 7 16 7Z" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" fill="none"/>
      <polygon points="16,10 17.8,14 22,14.5 18.8,17.5 19.8,21.6 16,19.3 12.2,21.6 13.2,17.5 10,14.5 14.2,14" stroke="currentColor" stroke-width="1.2" fill="none"/>
    `,

    // 5. Compass Rose (World Selector & Locations)
    compass: `
      <circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M16 5V27" stroke="currentColor" stroke-width="1" opacity="0.4"/>
      <path d="M5 16H27" stroke="currentColor" stroke-width="1" opacity="0.4"/>
      <polygon points="16,7 18.5,13.5 25,16 18.5,18.5 16,25 13.5,18.5 7,16 13.5,13.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <polygon points="16,7 18.5,13.5 16,16" fill="currentColor"/>
      <polygon points="16,25 13.5,18.5 16,16" fill="currentColor"/>
      <circle cx="16" cy="16" r="2" fill="currentColor"/>
    `,

    // 6. Healer Flask (World Doctor)
    healer: `
      <path d="M13 5H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M14 5V10L8.5 19.5C7.3 21.6 8.8 24.2 11.2 24.2H20.8C23.2 24.2 24.7 21.6 23.5 19.5L18 10V5" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M10 17C10 17 13 16 16 16C19 16 22 17 22 17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="16" y1="18" x2="16" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="14" y1="20" x2="18" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    `,

    // 7. Crystal Gem (LLM Context Builder / AI Chat)
    crystal: `
      <polygon points="16,3 24,9 24,21 16,29 8,21 8,9" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="16" y1="3" x2="16" y2="29" stroke="currentColor" stroke-width="1.2"/>
      <line x1="8" y1="9" x2="24" y2="9" stroke="currentColor" stroke-width="1.2"/>
      <line x1="8" y1="21" x2="24" y2="21" stroke="currentColor" stroke-width="1.2"/>
      <polygon points="16,9 24,15 16,21 8,15" stroke="currentColor" stroke-width="1" fill="none" opacity="0.5"/>
    `,

    // 8. Gear (AI Settings)
    gear: `
      <path d="M16 10C12.6863 10 10 12.6863 10 16C10 19.3137 12.6863 22 16 22C19.3137 22 22 19.3137 22 16C22 12.6863 19.3137 10 16 10Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <circle cx="16" cy="16" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M16 4V7M16 25V28M4 16H7M25 16H28M7.5 7.5L9.6 9.6M22.4 22.4L24.5 24.5M24.5 7.5L22.4 9.6M9.6 22.4L7.5 24.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    `,

    // 9. Plus (Create / Add)
    plus: `
      <circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="16" y1="10" x2="16" y2="22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="10" y1="16" x2="22" y2="16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    `,

    // 10. Search (Global Search)
    search: `
      <circle cx="14" cy="14" r="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="20" y1="20" x2="27" y2="27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M11 11C12 10 13.5 9.5 15 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
    `,

    // 11. Import (World Import)
    import: `
      <path d="M6 16V24C6 25.1 6.9 26 8 26H24C25.1 26 26 25.1 26 24V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <line x1="16" y1="6" x2="16" y2="19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <polyline points="11,14 16,19 21,14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    `
  };

  // Name aliases mapping common UI terms to badge keys
  const ALIASES = {
    library: 'scroll',
    articles: 'scroll',
    book: 'scroll',
    editor: 'quill',
    write: 'quill',
    studio: 'shield',
    factions: 'shield',
    scene: 'shield',
    category: 'waxSeal',
    categories: 'waxSeal',
    badge: 'waxSeal',
    world: 'compass',
    location: 'compass',
    locations: 'compass',
    doctor: 'healer',
    health: 'healer',
    context: 'crystal',
    chat: 'crystal',
    ai: 'crystal',
    settings: 'gear',
    config: 'gear',
    add: 'plus',
    create: 'plus',
    find: 'search',
    upload: 'import'
  };

  /**
   * LoreBadges Public API Module
   */
  const LoreBadges = {
    /**
     * Get SVG string for a given badge name and options.
     * @param {string} name - Badge identifier (e.g. 'scroll', 'quill', 'shield')
     * @param {Object} [options] - Configuration options { size, class, color }
     * @returns {string} SVG HTML string
     */
    get(name, options = {}) {
      const key = ALIASES[name] || name;
      const innerSvg = BADGE_SVGS[key] || BADGE_SVGS.scroll;
      const size = options.size || 20;
      const className = options.class || '';
      const style = options.color ? `style="color:${options.color};"` : '';

      return `<svg class="lore-badge-icon lore-badge-${key} ${className}" viewBox="0 0 32 32" width="${size}" height="${size}" ${style} xmlns="http://www.w3.org/2000/svg">${innerSvg}</svg>`;
    },

    /**
     * Alias for get()
     */
    render(name, options = {}) {
      return this.get(name, options);
    },

    /**
     * Scans document for elements with [data-badge] and injects generated SVG.
     */
    renderAll() {
      const elements = document.querySelectorAll('[data-badge]');
      elements.forEach(el => {
        const name = el.getAttribute('data-badge');
        if (!name) return;
        const size = parseInt(el.getAttribute('data-badge-size') || '18', 10);
        const cls = el.getAttribute('data-badge-class') || '';
        const color = el.getAttribute('data-badge-color') || '';
        
        el.innerHTML = this.get(name, { size, class: cls, color });
      });
    },

    /**
     * Alias for renderAll()
     */
    injectAll() {
      return this.renderAll();
    }
  };

  // Export to global window object
  window.LoreBadges = LoreBadges;

  // Auto-render on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LoreBadges.renderAll());
  } else {
    LoreBadges.renderAll();
  }
})();
