/**
 * WorldAnvil Simplified Standard BBCode & Markdown Parser
 * Strictly adheres to user formatting directives:
 * 1. [quote]Quote text | — Source[/quote]
 * 2. [row] and [col] layout grid
 * 3. [h1], [h2], [h3] headers
 * 4. [table], [tr], [th], [td] plain-text tables
 * 5. [b]Label:[/b] detail emphasis
 * 6. [hr] dividers
 * 7. @[Title](template:id) cross-links
 */

const WAParser = {
  parse(input) {
    if (!input) return '';

    let html = input;

    // Sanitize basic script injection
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 0. Collapsible Spoilers & Stat Boxes
    html = html.replace(/\[spoiler=(.*?)\]([\s\S]*?)\[\/spoiler\]/gi, (match, title, content) => {
      return `<details class="wa-spoiler"><summary class="wa-spoiler-summary">🔒 ${title}</summary><div class="wa-spoiler-body">${content}</div></details>`;
    });

    html = html.replace(/\[box=(.*?)\]([\s\S]*?)\[\/box\]/gi, (match, title, content) => {
      return `<div class="wa-box"><h4 class="wa-box-title">📜 ${title}</h4><div class="wa-box-body">${content}</div></div>`;
    });

    // 1. [quote]“Quote” | — Source[/quote]
    html = html.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, (match, content) => {
      const parts = content.split('|');
      const text = parts[0] ? parts[0].trim() : '';
      const source = parts[1] ? parts[1].trim() : '';
      return `<blockquote class="wa-quote"><p>${text}</p>${source ? `<cite>${source}</cite>` : ''}</blockquote>`;
    });

    // 2. Grid [row], [col], and [section]
    html = html.replace(/\[row\]/gi, '<div class="wa-row">');
    html = html.replace(/\[\/row\]/gi, '</div>');
    html = html.replace(/\[col\]/gi, '<div class="wa-col">');
    html = html.replace(/\[\/col\]/gi, '</div>');
    html = html.replace(/\[section\]/gi, '<div class="wa-sidebar">');
    html = html.replace(/\[\/section\]/gi, '</div>');

    // 3. Headings [h1], [h2], [h3]
    html = html.replace(/\[h1\]([\s\S]*?)\[\/h1\]/gi, '<h1 class="wa-article-title">$1</h1>');
    html = html.replace(/\[h2\]([\s\S]*?)\[\/h2\]/gi, '<h2 class="wa-section-h2">$1</h2>');
    html = html.replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi, '<h3 class="wa-h3">$1</h3>');

    // 4. Tables: [table], [tr], [th], [td] (th renders plain text only - NO FontAwesome or icons)
    html = html.replace(/\[table\]/gi, '<div class="wa-table-container"><table class="wa-table">');
    html = html.replace(/\[\/table\]/gi, '</table></div>');
    html = html.replace(/\[tr\]/gi, '<tr>');
    html = html.replace(/\[\/tr\]/gi, '</tr>');
    html = html.replace(/\[th\]([\s\S]*?)\[\/th\]/gi, (match, inner) => {
      const plainText = inner
        .replace(/\[fa-[^\]]+\]/gi, '')
        .replace(/\[i\b[^\]]*\][\s\S]*?\[\/i\]/gi, '')
        .replace(/<i\b[^>]*>.*?<\/i>/gi, '')
        .trim();
      return `<th>${plainText}</th>`;
    });
    html = html.replace(/\[td\]/gi, '<td>');
    html = html.replace(/\[\/td\]/gi, '</td>');

    // 5. Bold detail labels: [b]Label:[/b]
    html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');

    // 6. Horizontal Rules: [hr]
    html = html.replace(/\[hr\]/gi, '<hr class="wa-hr" />');

    // 7. Cross Links: @[Title](category:id) or @[Title](id) or WikiLinks [[Article Title]]
    html = html.replace(/@\[([^\]]+)\]\((?:[^:]+:)?([^)]+)\)/gi, (match, title, id) => {
      const cleanId = id.trim();
      return `<a href="#" class="wa-cross-link" data-id="${cleanId}" onclick="event.preventDefault(); window.app.loadArticle('${cleanId}');">${title}</a>`;
    });

    html = html.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
      const cleanTitle = title.trim();
      const cleanId = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `<a href="#" class="wa-cross-link" data-title="${cleanTitle}" onclick="event.preventDefault(); window.app.loadArticleByTitle('${cleanTitle}');">${cleanTitle}</a>`;
    });

    // 8. Images: WorldAnvil [img] & Markdown ![caption](src)
    // Strip numeric ID-only image tags from WA exports that have no backing file payload
    html = html.replace(/\[img:\d+\]/gi, '');
    // 8. Images: WorldAnvil [img] & Markdown ![caption](src)
    html = html.replace(/\[img\b([^\]]*)\]([\s\S]*?)\[\/img\]/gi, (match, attrsStr, src) => {
      const cleanSrc = (src || '').trim();
      if (!cleanSrc) return '';

      let align = 'center';
      let caption = '';
      let width = '';
      let pinsStr = '';

      const alignMatch = attrsStr.match(/align=["']?([a-z]+)["']?/i);
      if (alignMatch) align = alignMatch[1].toLowerCase();

      const captionMatch = attrsStr.match(/caption=["']?([^"']+)["']?/i);
      if (captionMatch) caption = captionMatch[1];

      const widthMatch = attrsStr.match(/width=["']?([^"']+)["']?/i);
      if (widthMatch) width = widthMatch[1];

      const pinsMatch = attrsStr.match(/pins=["']([^"']+)["']/i);
      if (pinsMatch) pinsStr = pinsMatch[1];

      const escapedCaption = caption.replace(/'/g, "\\'");
      const styleAttr = width ? `style="max-width:${width};"` : '';

      let pinsHtml = '';
      if (pinsStr) {
        try {
          const pins = JSON.parse(pinsStr);
          if (Array.isArray(pins)) {
            pinsHtml = pins.map(p => {
              const x = p.x || 50;
              const y = p.y || 50;
              const targetId = p.articleId || p.target || '';
              const label = p.label || 'Pinned Location';
              const type = p.type || 'city';
              const iconMap = { city: '🏰', battle: '⚔️', relic: '🔮', nature: '🌲' };
              const icon = iconMap[type] || '📍';
              const escapedLabel = label.replace(/'/g, "\\'");

              return `
                <div class="wa-map-pin" style="top:${y}%; left:${x}%;" title="${escapedLabel}" onclick="event.stopPropagation(); window.app.loadArticle('${targetId}');">
                  <span class="pin-icon">${icon}</span>
                  <span class="pin-pulse"></span>
                  <div class="wa-pin-tooltip">
                    <strong>${label}</strong>
                    ${targetId ? '<div style="font-size:0.65rem; color:#38bdf8;">Click to open lore</div>' : ''}
                  </div>
                </div>
              `;
            }).join('');
          }
        } catch (e) {
          console.warn('Failed to parse map pins JSON:', e);
        }
      }

      return `<figure class="wa-image-card wa-map-container align-${align}" ${styleAttr}>
        <div class="wa-image-frame" onclick="window.openImageLightbox('${cleanSrc}', '${escapedCaption}')">
          <img src="${cleanSrc}" class="wa-image" alt="${caption || 'Article Media'}" onerror="this.style.display='none'" />
          ${pinsHtml}
        </div>
        ${caption ? `<figcaption class="wa-image-caption">${caption}</figcaption>` : ''}
      </figure>`;
    });

    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altStr, srcStr) => {
      const cleanSrc = (srcStr || '').trim();
      if (!cleanSrc) return '';

      let caption = altStr.trim();
      let align = 'center';

      if (caption.includes('|')) {
        const parts = caption.split('|');
        caption = parts[0].trim();
        align = parts[1].trim().toLowerCase() || 'center';
      }

      const escapedCaption = caption.replace(/'/g, "\\'");

      return `<figure class="wa-image-card align-${align}">
        <div class="wa-image-frame" onclick="window.openImageLightbox('${cleanSrc}', '${escapedCaption}')">
          <img src="${cleanSrc}" class="wa-image" alt="${caption || 'Article Media'}" onerror="this.style.display='none'" />
        </div>
        ${caption ? `<figcaption class="wa-image-caption">${caption}</figcaption>` : ''}
      </figure>`;
    });

    // Multi-Image Gallery Grids: [gallery]url1 | Caption1\nurl2 | Caption2[/gallery]
    html = html.replace(/\[gallery\]([\s\S]*?)\[\/gallery\]/gi, (match, bodyStr) => {
      const lines = (bodyStr || '').trim().split('\n').filter(Boolean);
      if (lines.length === 0) return '';

      const itemsHtml = lines.map(line => {
        const parts = line.split('|');
        const src = (parts[0] || '').trim();
        const caption = (parts[1] || '').trim();
        if (!src) return '';
        const escapedCaption = caption.replace(/'/g, "\\'");

        return `
          <div class="wa-gallery-item" onclick="window.openImageLightbox('${src}', '${escapedCaption}')">
            <img src="${src}" alt="${caption || 'Gallery Image'}" onerror="this.style.display='none'" />
            ${caption ? `<div class="wa-gallery-caption">${caption}</div>` : ''}
          </div>
        `;
      }).join('');

      return `<div class="wa-gallery-grid">${itemsHtml}</div>`;
    });

    // Standard Markdown Headings & Quotes
    html = html.replace(/^### (.*$)/gim, '<h3 class="wa-h3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="wa-h2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="wa-h1">$1</h1>');
    html = html.replace(/^>\s*(.*$)/gim, '<blockquote class="wa-quote"><p>$1</p></blockquote>');

    // Fallback markdown parsing for bold, italics, paragraphs & line breaks
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Process paragraphs for non-tag blocks
    const lines = html.split('\n');
    let inBlock = false;
    let formatted = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<div') || trimmed.startsWith('</div') || 
          trimmed.startsWith('<table') || trimmed.startsWith('</table') || 
          trimmed.startsWith('<tr') || trimmed.startsWith('</tr') || 
          trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || 
          trimmed.startsWith('<hr')) {
        return line;
      }
      return `<p>${line}</p>`;
    }).join('\n');

    return formatted;
  },

  parseWikiLinks(input) {
    if (!input) return '';
    return input.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
      const cleanTitle = title.trim();
      const escapedTitle = cleanTitle.replace(/'/g, "\\'");
      return `<a href="#" class="wa-cross-link" style="color:#38bdf8; font-weight:700; text-decoration:underline; cursor:pointer;" onclick="event.preventDefault(); window.app.loadArticleByTitle('${escapedTitle}');">[[${cleanTitle}]]</a>`;
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WAParser;
}
