const path = require('path');
const fs = require('fs');
const db = require('../db');

const storageDir = path.join(__dirname, '..', '..', 'storage', 'articles');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

function syncFileToStorage(id, content) {
  const filePath = path.join(storageDir, `${id}.md`);
  fs.writeFile(filePath, content, 'utf8', (err) => {
    if (err) console.error(`Error saving file ${id}.md:`, err);
  });

  try {
    const historyDir = path.join(storageDir, 'history', id);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    const timestamp = Date.now();
    const revPath = path.join(historyDir, `${timestamp}_rev.md`);
    fs.writeFileSync(revPath, content, 'utf8');
  } catch (e) {
    console.error('[syncFileToStorage error]', e);
  }
}

function extractCrossLinks(sourceArticleId, content) {
  if (!content) return;
  const linkRegex = /@\[(.*?)\]\((.*?)\)/g;
  let match;
  const targetTitles = [];

  while ((match = linkRegex.exec(content)) !== null) {
    targetTitles.push(match[1]);
  }

  if (targetTitles.length === 0) return;

  db.get('SELECT world_id FROM articles WHERE id = ?', [sourceArticleId], (err, row) => {
    if (err || !row) return;
    const worldId = row.world_id;

    targetTitles.forEach(targetTitle => {
      db.get('SELECT id, title FROM articles WHERE (world_id = ? OR ? = "all") AND LOWER(title) = LOWER(?)', [worldId, worldId, targetTitle], (err, targetRow) => {
        if (targetRow && targetRow.id !== sourceArticleId) {
          const insertQuery = `
            INSERT INTO lore_relationships (world_id, source_entity_id, source_entity_title, target_entity_id, target_entity_title, relationship_type, summary)
            VALUES (?, ?, ?, ?, ?, 'Mentions / Cross-Link', 'Auto-generated cross-link from article text')
            ON CONFLICT(world_id, source_entity_id, target_entity_id) DO NOTHING
          `;
          db.run(insertQuery, [worldId, sourceArticleId, targetTitle, targetRow.id, targetRow.title]);
        }
      });
    });
  });
}

function parseMarkdownWithFrontmatter(rawContent) {
  if (!rawContent) return { title: '', category: 'General', tags: [], content: '' };
  
  let title = '';
  let category = 'General';
  let tags = [];
  let bodyContent = rawContent;

  if (rawContent.startsWith('---')) {
    const parts = rawContent.split('---');
    if (parts.length >= 3) {
      const frontmatter = parts[1];
      bodyContent = parts.slice(2).join('---').trim();

      const lines = frontmatter.split('\n');
      for (const line of lines) {
        if (line.startsWith('title:')) {
          title = line.replace('title:', '').trim().replace(/^["']|["']$/g, '');
        } else if (line.startsWith('category:')) {
          category = line.replace('category:', '').trim().replace(/^["']|["']$/g, '');
        } else if (line.startsWith('tags:')) {
          const tagsStr = line.replace('tags:', '').trim().replace(/^\[|\]$/g, '');
          tags = tagsStr.split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
      }
    }
  }

  return { title, category, tags, content: bodyContent };
}

function filterArticleVisibility(article, isPlayerMode = false) {
  if (!article) return article;
  const copy = { ...article };

  if (isPlayerMode) {
    if (copy.content) copy.content = stripSecretBlocks(copy.content);
    if (copy.summary) copy.summary = stripSecretBlocks(copy.summary);
  }

  return copy;
}

function stripSecretBlocks(text) {
  if (!text) return text;
  return text
    .replace(/\[secret\][\s\S]*?\[\/secret\]/gi, '*(🔒 DM Secret - Hidden)*')
    .replace(/\[dm\][\s\S]*?\[\/dm\]/gi, '*(🔒 DM Secret - Hidden)*');
}

function serializeMarkdown(article, statblock) {
  let md = `---
title: "${article.title}"
category: "${article.category}"
sub_category: "${article.sub_category || ''}"
tags: ${JSON.stringify(article.tags || [])}
updated_at: "${article.updated_at || new Date().toISOString()}"
---

# ${article.title}

${article.content || ''}`;

  if (statblock) {
    md += `\n\n## Statblock\n`;
    md += `- **AC**: ${statblock.armor_class} | **HP**: ${statblock.hit_points} | **Speed**: ${statblock.speed}\n`;
    md += `- **STR**: ${statblock.str} | **DEX**: ${statblock.dex} | **CON**: ${statblock.con} | **INT**: ${statblock.int} | **WIS**: ${statblock.wis} | **CHA**: ${statblock.cha}\n`;
  }

  return md;
}

function serializeXML(article, statblock) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<article id="${article.id}">
  <title>${escapeXml(article.title)}</title>
  <category>${escapeXml(article.category)}</category>
  <summary>${escapeXml(article.summary || '')}</summary>
  <content>${escapeXml(article.content || '')}</content>
</article>`;
}

function escapeXml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function serializeJSON(article, statblock) {
  return JSON.stringify({ article, statblock }, null, 2);
}

function serializeYAML(article, statblock) {
  return `title: "${article.title}"\ncategory: "${article.category}"\nsummary: "${article.summary || ''}"`;
}

function serializeContext(article, statblock) {
  return `Title: ${article.title}\nCategory: ${article.category}\nContent:\n${article.content}`;
}

module.exports = {
  storageDir,
  syncFileToStorage,
  extractCrossLinks,
  parseMarkdownWithFrontmatter,
  filterArticleVisibility,
  stripSecretBlocks,
  serializeMarkdown,
  serializeXML,
  serializeJSON,
  serializeYAML,
  serializeContext
};
