# The Weave Matrix Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build The Weave Matrix context compilation engine with hybrid secret filtering, multi-format serializers (Markdown, XML, JSON, YAML), three-tier priority token budgeting, and an interactive frontend control drawer.

**Architecture:** Add SQLite database migration for `visibility`, implement secret parsing and format serializers in `server.js`, expose the `POST /api/context/compile` API endpoint, and add the `#weave-matrix-drawer` UI component in `public/index.html` & `public/js/app.js`.

**Tech Stack:** Node.js, Express, SQLite3, Vanilla JavaScript, CSS.

## Global Constraints

- Preserve WorldAnvil formatting guidelines (thematic quotes, rows, columns, tables).
- Zero silent error masks; return clean JSON error payloads on failures.
- Zero horizontal UI overflow.

---

### Task 1: Database Migration & Hybrid Secret Filter Engine

**Files:**
- Modify: `server.js` (DB schema initialization & secret filter helper)
- Create: `scratch/test-secret-filter.js`

**Interfaces:**
- Consumes: Existing SQLite `articles` table schema
- Produces: `visibility` column on `articles` table (`'public'` | `'dm_only'`) & `stripSecretBlocks(content)` function

- [ ] **Step 1: Write failing test script for secret filtering**

Create `scratch/test-secret-filter.js`:
```javascript
const assert = require('assert');

function stripSecretBlocks(content) {
  if (!content) return '';
  return content.replace(/\[(secret|dm)\][\s\S]*?\[\/(secret|dm)\]/gi, '').trim();
}

const sampleMarkdown = `
# Public Title
Overview text.
[secret]This is a DM-only secret note.[/secret]
Public section text.
[dm]Another DM note here.[/dm]
Conclusion text.
`;

const cleanText = stripSecretBlocks(sampleMarkdown);
console.log('Cleaned output:\n', cleanText);

assert(!cleanText.includes('DM-only secret note'), 'Failed to strip [secret] block');
assert(!cleanText.includes('Another DM note'), 'Failed to strip [dm] block');
assert(cleanText.includes('Public section text'), 'Stripped public content by mistake');
console.log('✅ Secret filter unit test passed!');
```

- [ ] **Step 2: Run test script to verify it works**

Run: `node scratch/test-secret-filter.js`
Expected output: `✅ Secret filter unit test passed!`

- [ ] **Step 3: Add DB migration and helper to server.js**

In `server.js`, ensure `visibility` column is added during DB serialization:
```javascript
db.run("ALTER TABLE articles ADD COLUMN visibility TEXT DEFAULT 'public'", (err) => {
  // Ignore error if column already exists
});

function stripSecretBlocks(content) {
  if (!content) return '';
  return content.replace(/\[(secret|dm)\][\s\S]*?\[\/(secret|dm)\]/gi, '').trim();
}
```

- [ ] **Step 4: Commit Task 1**

```bash
git add server.js scratch/test-secret-filter.js
git commit -m "feat: add article visibility column and secret block filter"
```

---

### Task 2: Multi-Format Context Serializers (Markdown, XML, JSON, YAML)

**Files:**
- Modify: `server.js`
- Create: `scratch/test-serializers.js`

**Interfaces:**
- Consumes: Cleaned article objects `{ id, title, category, summary, content }`
- Produces: `serializeContext(articles, format)` returning formatted string in Markdown, XML, JSON, or YAML

- [ ] **Step 1: Write failing test script for multi-format serializers**

Create `scratch/test-serializers.js`:
```javascript
const assert = require('assert');

const sampleArticles = [
  { id: 'art-1', title: 'Valoria', category: 'Factions', summary: 'Empire', content: 'Empire lore' }
];

function serializeMarkdown(articles) {
  return articles.map(a => `# Entity: ${a.title} (${a.category})\n> ${a.summary}\n\n${a.content}`).join('\n\n---\n\n');
}

function serializeXML(articles) {
  const items = articles.map(a => `  <entity id="${a.id}" category="${a.category}">\n    <title>${a.title}</title>\n    <summary>${a.summary}</summary>\n    <content><![CDATA[${a.content}]]></content>\n  </entity>`).join('\n');
  return `<context>\n${items}\n</context>`;
}

function serializeJSON(articles) {
  return JSON.stringify({ count: articles.length, entities: articles }, null, 2);
}

function serializeYAML(articles) {
  let yaml = 'entities:\n';
  articles.forEach(a => {
    yaml += `  - id: ${a.id}\n    title: "${a.title}"\n    category: "${a.category}"\n    summary: "${a.summary}"\n    content: |\n      ${a.content.replace(/\n/g, '\n      ')}\n`;
  });
  return yaml;
}

function serializeContext(articles, format) {
  switch ((format || '').toLowerCase()) {
    case 'xml': return serializeXML(articles);
    case 'json': return serializeJSON(articles);
    case 'yaml': return serializeYAML(articles);
    default: return serializeMarkdown(articles);
  }
}

assert(serializeContext(sampleArticles, 'xml').includes('<entity id="art-1"'), 'XML serializer failed');
assert(serializeContext(sampleArticles, 'json').includes('"id": "art-1"'), 'JSON serializer failed');
assert(serializeContext(sampleArticles, 'yaml').includes('id: art-1'), 'YAML serializer failed');
assert(serializeContext(sampleArticles, 'markdown').includes('# Entity: Valoria'), 'Markdown serializer failed');

console.log('✅ Serializer unit tests passed!');
```

- [ ] **Step 2: Run test to verify serializers pass**

Run: `node scratch/test-serializers.js`
Expected output: `✅ Serializer unit tests passed!`

- [ ] **Step 3: Integrate serializer functions into server.js**

Add `serializeMarkdown`, `serializeXML`, `serializeJSON`, `serializeYAML`, and `serializeContext` to `server.js`.

- [ ] **Step 4: Commit Task 2**

```bash
git add server.js scratch/test-serializers.js
git commit -m "feat: add context serializer functions for Markdown, XML, JSON, and YAML"
```

---

### Task 3: Priority Token Stacker & Context Compilation API (`POST /api/context/compile`)

**Files:**
- Modify: `server.js`
- Create: `scratch/test-context-compiler.js`

**Interfaces:**
- Consumes: `{ world_id, pinned_ids, query, format, visibility, max_tokens }`
- Produces: Express route `POST /api/context/compile` returning `{ status: 'success', compiled_context, token_metrics }`

- [ ] **Step 1: Write integration test script for API compilation endpoint**

Create `scratch/test-context-compiler.js`:
```javascript
const http = require('http');

const postData = JSON.stringify({
  world_id: 'all',
  pinned_ids: [],
  query: 'Valoria',
  format: 'xml',
  visibility: 'public',
  max_tokens: 4000
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/context/compile',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    const data = JSON.parse(body);
    console.log('Compiler Response:', data.status, 'Tokens:', data.token_metrics);
    if (data.status === 'success' && data.compiled_context) {
      console.log('✅ Context compilation endpoint integration test passed!');
    } else {
      console.error('❌ Endpoint test failed:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.write(postData);
req.end();
```

- [ ] **Step 2: Implement POST /api/context/compile in server.js**

Add `POST /api/context/compile` endpoint in `server.js`:
```javascript
app.post('/api/context/compile', (req, res) => {
  const { world_id, pinned_ids = [], query = '', format = 'markdown', visibility = 'public', max_tokens = 4000 } = req.body;

  let sql = 'SELECT * FROM articles';
  let params = [];
  if (world_id && world_id !== 'all') {
    sql += ' WHERE world_id = ?';
    params.push(world_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Filter by visibility
    let available = rows.map(r => filterArticleVisibility(r, visibility)).filter(Boolean);

    // Priority Tiers
    let tier1 = [], tier2 = [], tier3 = [];
    const pinnedSet = new Set(pinned_ids);

    available.forEach(art => {
      if (pinnedSet.has(art.id)) {
        tier1.push(art);
      } else if (query && (art.title.toLowerCase().includes(query.toLowerCase()) || art.content.toLowerCase().includes(query.toLowerCase()))) {
        tier2.push(art);
      } else {
        tier3.push(art);
      }
    });

    let selected = [];
    let currentChars = 0;
    const maxChars = max_tokens * 4;

    [...tier1, ...tier2, ...tier3].forEach(art => {
      const artChars = (art.title + art.content).length;
      if (currentChars + artChars <= maxChars) {
        selected.push(art);
        currentChars += artChars;
      }
    });

    const compiled_context = serializeContext(selected, format);
    const estimated_tokens = Math.ceil(compiled_context.length / 4);

    res.json({
      status: 'success',
      format,
      visibility,
      compiled_context,
      token_metrics: {
        total_tokens: estimated_tokens,
        max_budget: max_tokens,
        selected_count: selected.length,
        total_available: available.length
      }
    });
  });
});
```

- [ ] **Step 3: Run integration test against server**

Run `node scratch/test-context-compiler.js` while server is running.
Expected output: `✅ Context compilation endpoint integration test passed!`

- [ ] **Step 4: Commit Task 3**

```bash
git add server.js scratch/test-context-compiler.js
git commit -m "feat: add POST /api/context/compile priority token stacker endpoint"
```

---

### Task 4: Frontend Weave Matrix UI Drawer (`#weave-matrix-drawer`)

**Files:**
- Modify: `public/index.html` (Add top nav button & modal drawer HTML)
- Modify: `public/js/app.js` (Add drawer logic, format/visibility handlers, API calls)
- Modify: `public/css/styles.css` (Add drawer styling)

**Interfaces:**
- Consumes: `POST /api/context/compile` endpoint
- Produces: Slide-over `#weave-matrix-drawer` UI with live format/visibility preview and token budget slider

- [ ] **Step 1: Add HTML markup for Weave Matrix button & drawer in public/index.html**

Add `#weave-matrix-btn` to header actions and `#weave-matrix-drawer` side drawer container.

- [ ] **Step 2: Add CSS styles for drawer in public/css/styles.css**

Add CSS rules for `.weave-matrix-drawer`, `.format-chip`, `.visibility-switch`, and token progress bar.

- [ ] **Step 3: Implement drawer JavaScript handlers in public/js/app.js**

Add functions `openWeaveMatrixDrawer()`, `compileWeaveContext()`, `copyCompiledContext()`.

- [ ] **Step 4: Verify manual E2E in browser**

Verify clicking `🕸️ Weave Matrix` opens the side panel, changing format updates compiled output preview, and token slider adjusts budget correctly.

- [ ] **Step 5: Commit Task 4**

```bash
git add public/index.html public/css/styles.css public/js/app.js
git commit -m "feat: implement frontend Weave Matrix drawer and controls"
```
