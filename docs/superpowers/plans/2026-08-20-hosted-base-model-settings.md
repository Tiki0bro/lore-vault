# Hosted Base Model & Custom AI Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dual-tier AI settings manager in LoreVault providing an out-of-the-box zero-setup Hosted Base Model default (`Gemini 2.0 Flash`) with custom provider configuration, live connection testing, and header status indicator chips.

**Architecture:** Extend `getAIConfig()` in `server.js` to handle `use_custom_provider` state and provide system default hosted model credentials. Add REST endpoints `GET/POST /api/ai/config` and `POST /api/ai/test-connection`. Add glassmorphic `#ai-settings-modal` overlay and `#ai-status-chip` navbar badge in `public/index.html`, `public/css/styles.css`, and `public/js/app.js`.

**Tech Stack:** Node.js Express, Vanilla JavaScript (ES6+), HTML5, Vanilla CSS3 (Dual-Theme & Light Mode support), Node Test Runner (`node --test`).

## Global Constraints

- **Dual-Tier State**: Out-of-the-box default (`use_custom_provider: false`) uses `Gemini 2.0 Flash` system gateway.
- **Masked Keys**: `GET /api/ai/config` MUST mask custom API keys as `••••••••1234`.
- **Zero Silent Failures**: Connection tester MUST report empirical ping latency (`ms`) or detailed error codes.
- **Theme Parity**: Settings modal and navbar chip MUST support `ancient-codex`, `scifi-fantasy`, and `data-mode="light"`.

---

### Task 1: Backend AI Config Handler & Connection Test REST Endpoints

**Files:**
- Modify: `server.js:165-190`
- Test: `test/api-suite.js`

**Interfaces:**
- Consumes: `callGeminiApiWithFallback(prompt, apiKey, model)` in `server.js`
- Produces: `GET /api/ai/config`, `POST /api/ai/config`, `POST /api/ai/test-connection`

- [ ] **Step 1: Write failing tests for AI Config & Connection Test endpoints**

Add tests to `test/api-suite.js`:
```javascript
test('GET & POST /api/ai/config manages dual-tier AI settings', async () => {
  const getRes = await makeRequest('/api/ai/config');
  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.json.success, true);
  assert.ok('use_custom_provider' in getRes.json);

  const postRes = await makeRequest('/api/ai/config', { method: 'POST' }, {
    use_custom_provider: true,
    custom_provider: 'gemini',
    custom_api_key: 'AIzaSyTestKey12345',
    custom_model: 'gemini-2.0-flash'
  });
  assert.strictEqual(postRes.statusCode, 200);
  assert.strictEqual(postRes.json.success, true);
  assert.strictEqual(postRes.json.config.use_custom_provider, true);
  assert.strictEqual(postRes.json.config.masked_key, '••••••••2345');
});

test('POST /api/ai/test-connection verifies provider readiness', async () => {
  const testRes = await makeRequest('/api/ai/test-connection', { method: 'POST' }, {
    provider: 'gemini',
    api_key: '',
    use_custom_provider: false
  });
  assert.strictEqual(testRes.statusCode, 200);
  assert.strictEqual(testRes.json.success, true);
  assert.ok(typeof testRes.json.latency_ms === 'number');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/api-suite.js`
Expected: FAIL with missing endpoints `/api/ai/config` / `/api/ai/test-connection`

- [ ] **Step 3: Update `getAIConfig()` & implement REST endpoints in `server.js`**

In `server.js`:
```javascript
function getAIConfig() {
  let config = {
    use_custom_provider: false,
    default_model: 'gemini-2.0-flash',
    custom_provider: 'gemini',
    custom_api_key: '',
    custom_model: 'gemini-2.0-flash',
    ollama_url: 'http://localhost:11434'
  };
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed) {
        config = { ...config, ...parsed };
      }
    } catch (e) {}
  }
  return config;
}

app.get('/api/ai/config', (req, res) => {
  const cfg = getAIConfig();
  const rawKey = cfg.custom_api_key || '';
  const maskedKey = rawKey.length > 4 ? `••••••••${rawKey.slice(-4)}` : (rawKey ? '••••••••' : '');
  res.json({
    success: true,
    use_custom_provider: !!cfg.use_custom_provider,
    custom_provider: cfg.custom_provider || 'gemini',
    custom_model: cfg.custom_model || 'gemini-2.0-flash',
    ollama_url: cfg.ollama_url || 'http://localhost:11434',
    masked_key: maskedKey,
    has_custom_key: rawKey.length > 0,
    active_provider: cfg.use_custom_provider ? cfg.custom_provider : 'gemini_hosted',
    active_model: cfg.use_custom_provider ? cfg.custom_model : cfg.default_model
  });
});

app.post('/api/ai/config', (req, res) => {
  try {
    const { use_custom_provider, custom_provider, custom_api_key, custom_model, ollama_url } = req.body;
    const current = getAIConfig();
    const updated = {
      ...current,
      use_custom_provider: !!use_custom_provider,
      custom_provider: custom_provider || 'gemini',
      custom_model: custom_model || 'gemini-2.0-flash',
      ollama_url: ollama_url || 'http://localhost:11434'
    };
    if (custom_api_key !== undefined && !custom_api_key.startsWith('••••')) {
      updated.custom_api_key = custom_api_key;
    }
    saveAIConfig(updated);
    const rawKey = updated.custom_api_key || '';
    const maskedKey = rawKey.length > 4 ? `••••••••${rawKey.slice(-4)}` : (rawKey ? '••••••••' : '');
    res.json({
      success: true,
      config: {
        ...updated,
        masked_key: maskedKey
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/test-connection', async (req, res) => {
  const startTime = Date.now();
  try {
    const { use_custom_provider, provider, api_key, model, ollama_url } = req.body;
    if (use_custom_provider && provider === 'ollama') {
      const url = (ollama_url || 'http://localhost:11434') + '/api/tags';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        return res.json({
          success: true,
          latency_ms: Date.now() - startTime,
          message: 'Ollama local server reachable successfully!'
        });
      } else {
        return res.json({
          success: false,
          message: `Ollama returned status ${response.status}`
        });
      }
    }
    const testPrompt = 'Respond with "OK".';
    const keyToUse = api_key && !api_key.startsWith('••••') ? api_key : '';
    await callGeminiApi(testPrompt, keyToUse, model || 'gemini-2.0-flash');
    return res.json({
      success: true,
      latency_ms: Date.now() - startTime,
      message: 'AI Provider connection verified successfully!'
    });
  } catch (err) {
    return res.json({
      success: false,
      latency_ms: Date.now() - startTime,
      message: 'Connection test failed: ' + err.message
    });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/api-suite.js`
Expected: PASS

---

### Task 2: Navbar AI Status Badge & Settings Modal Markup & Styling

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Navbar actions in `public/index.html`
- Produces: `#ai-status-chip` in header, `#ai-settings-modal` overlay container

- [ ] **Step 1: Add `#ai-status-chip` to navbar header in `public/index.html`**

In `public/index.html`:
```html
        <!-- AI Model Status Chip Trigger -->
        <button id="ai-status-chip" class="ai-status-chip" title="AI Model Settings (Click to configure)" onclick="window.app.openAISettingsModal()">
          <span class="ai-status-dot">⚡</span> <span id="ai-status-label">AI: Hosted Base</span>
        </button>
```

- [ ] **Step 2: Add `#ai-settings-modal` overlay markup to `public/index.html`**

In `public/index.html`:
```html
  <!-- AI Model & Provider Settings Modal -->
  <div id="ai-settings-modal" class="modal-backdrop hidden" onclick="if(event.target===this) window.app.closeAISettingsModal()">
    <div class="ai-settings-container">
      <div class="ai-settings-header">
        <div class="ai-settings-badge">⚙️ AI CONFIGURATION</div>
        <h2>AI Model & Provider Settings</h2>
        <p class="ai-settings-subtitle">Choose between LoreVault's default hosted base model or bring your own API keys/local LLM engine.</p>
      </div>

      <!-- Tier Selection Radio Buttons -->
      <div class="ai-tier-selection">
        <label class="ai-tier-card" id="tier-card-hosted">
          <input type="radio" name="ai_tier" value="hosted" id="ai-tier-hosted" onchange="window.app.handleAITierToggle('hosted')">
          <div class="tier-card-content">
            <div class="tier-card-title">⚡ Built-in LoreVault Base Model (Default)</div>
            <div class="tier-card-desc">Zero-config hosted AI powered by Gemini 2.0 Flash. No API key required.</div>
          </div>
        </label>

        <label class="ai-tier-card" id="tier-card-custom">
          <input type="radio" name="ai_tier" value="custom" id="ai-tier-custom" onchange="window.app.handleAITierToggle('custom')">
          <div class="tier-card-content">
            <div class="tier-card-title">⚙️ Custom AI Provider & API Key</div>
            <div class="tier-card-desc">Configure custom Gemini keys, local Ollama, OpenAI, or OpenRouter.</div>
          </div>
        </label>
      </div>

      <!-- Custom Options Section -->
      <div id="ai-custom-controls" class="ai-custom-controls hidden">
        <div class="form-group">
          <label>Provider</label>
          <select id="ai-provider-select" class="form-control" onchange="window.app.handleAIProviderChange(this.value)">
            <option value="gemini">Google Gemini (Custom Key)</option>
            <option value="ollama">Ollama (Local LLM)</option>
            <option value="openai">OpenAI / OpenRouter Compatible</option>
          </select>
        </div>

        <div id="group-api-key" class="form-group">
          <label>API Key</label>
          <div class="input-with-action">
            <input type="password" id="ai-key-input" class="form-control" placeholder="Paste custom API key...">
            <button class="btn btn-secondary btn-sm" onclick="window.app.toggleAPIKeyVisibility()">👁️</button>
          </div>
        </div>

        <div id="group-model-name" class="form-group">
          <label>Model Name</label>
          <input type="text" id="ai-model-input" class="form-control" placeholder="e.g. gemini-2.0-flash or llama3:8b">
        </div>

        <div id="group-ollama-url" class="form-group hidden">
          <label>Ollama Server URL</label>
          <input type="text" id="ai-ollama-input" class="form-control" placeholder="http://localhost:11434">
        </div>
      </div>

      <!-- Status & Actions Footer -->
      <div class="ai-settings-footer">
        <button id="ai-test-btn" class="btn btn-secondary" onclick="window.app.testAIConnection()">⚡ Test Connection</button>
        <div class="ai-footer-right">
          <button class="btn btn-secondary" onclick="window.app.closeAISettingsModal()">Cancel</button>
          <button class="btn btn-primary" onclick="window.app.saveAISettings()">💾 Save Settings</button>
        </div>
      </div>
      <div id="ai-test-feedback" class="ai-test-feedback hidden"></div>
    </div>
  </div>
```

- [ ] **Step 3: Add CSS styles for status chip and AI settings modal in `public/css/styles.css`**

Add CSS rules:
```css
/* --- NAVBAR AI STATUS CHIP --- */
.ai-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  border-radius: 14px;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid var(--accent-gold, #d4af37);
  color: var(--accent-gold, #d4af37);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-status-chip:hover {
  background: rgba(212, 175, 55, 0.22);
  transform: translateY(-1px);
}

.ai-status-chip.custom-active {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  color: #38bdf8;
}

.ai-status-chip.ollama-active {
  background: rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
  color: #22c55e;
}

/* --- AI SETTINGS MODAL --- */
.ai-settings-container {
  background: var(--surface-card, rgba(20, 16, 12, 0.95));
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 90%;
  max-width: 580px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
}

.ai-tier-selection {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.ai-tier-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-tier-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--accent-primary);
}

.tier-card-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text-primary);
}

.tier-card-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}

.ai-test-feedback {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
}

.ai-test-feedback.success {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.ai-test-feedback.error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
```

---

### Task 3: Client Controller Integration & Auto Sync

**Files:**
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `/api/ai/config`, `/api/ai/test-connection`
- Produces: `openAISettingsModal()`, `saveAISettings()`, `testAIConnection()`, `updateAIStatusChip()`

- [ ] **Step 1: Implement AI Settings Controller methods in `public/js/app.js`**

Add methods to `LoreVaultApp` in `public/js/app.js`:
```javascript
  async fetchAIConfig() {
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (data.success) {
        this.aiConfig = data;
        this.updateAIStatusChip(data);
      }
    } catch (err) {
      console.warn('[AI Config] Fetch warning:', err);
    }
  }

  updateAIStatusChip(config) {
    const chip = document.getElementById('ai-status-chip');
    const label = document.getElementById('ai-status-label');
    if (!chip || !label) return;

    chip.classList.remove('custom-active', 'ollama-active');
    if (!config.use_custom_provider) {
      label.textContent = 'AI: Hosted Base';
    } else if (config.custom_provider === 'ollama') {
      label.textContent = 'AI: Local Ollama';
      chip.classList.add('ollama-active');
    } else {
      label.textContent = `AI: Custom (${config.custom_provider})`;
      chip.classList.add('custom-active');
    }
  }

  openAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (!modal) return;
    this.loadAISettingsToForm();
    modal.classList.remove('hidden');
  }

  closeAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (modal) modal.classList.add('hidden');
  }

  loadAISettingsToForm() {
    const cfg = this.aiConfig || { use_custom_provider: false, custom_provider: 'gemini', custom_model: 'gemini-2.0-flash', masked_key: '' };
    const radioHosted = document.getElementById('ai-tier-hosted');
    const radioCustom = document.getElementById('ai-tier-custom');
    const providerSel = document.getElementById('ai-provider-select');
    const keyInput = document.getElementById('ai-key-input');
    const modelInput = document.getElementById('ai-model-input');

    if (cfg.use_custom_provider) {
      if (radioCustom) radioCustom.checked = true;
      this.handleAITierToggle('custom');
    } else {
      if (radioHosted) radioHosted.checked = true;
      this.handleAITierToggle('hosted');
    }

    if (providerSel) providerSel.value = cfg.custom_provider || 'gemini';
    if (keyInput) keyInput.value = cfg.masked_key || '';
    if (modelInput) modelInput.value = cfg.custom_model || 'gemini-2.0-flash';
    this.handleAIProviderChange(cfg.custom_provider || 'gemini');
  }

  handleAITierToggle(tier) {
    const controls = document.getElementById('ai-custom-controls');
    if (!controls) return;
    if (tier === 'custom') {
      controls.classList.remove('hidden');
    } else {
      controls.classList.add('hidden');
    }
  }

  handleAIProviderChange(provider) {
    const groupKey = document.getElementById('group-api-key');
    const groupOllama = document.getElementById('group-ollama-url');
    if (provider === 'ollama') {
      if (groupKey) groupKey.classList.add('hidden');
      if (groupOllama) groupOllama.classList.remove('hidden');
    } else {
      if (groupKey) groupKey.classList.remove('hidden');
      if (groupOllama) groupOllama.classList.add('hidden');
    }
  }

  async saveAISettings() {
    const useCustom = document.getElementById('ai-tier-custom').checked;
    const provider = document.getElementById('ai-provider-select').value;
    const key = document.getElementById('ai-key-input').value;
    const model = document.getElementById('ai-model-input').value;
    const ollamaUrl = document.getElementById('ai-ollama-input') ? document.getElementById('ai-ollama-input').value : '';

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          use_custom_provider: useCustom,
          custom_provider: provider,
          custom_api_key: key,
          custom_model: model,
          ollama_url: ollamaUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        this.aiConfig = data.config;
        this.updateAIStatusChip(data.config);
        this.closeAISettingsModal();
        this.showToast('⚙️ AI Settings saved successfully!');
      }
    } catch (err) {
      this.showToast('❌ Failed to save AI settings');
    }
  }

  async testAIConnection() {
    const feedback = document.getElementById('ai-test-feedback');
    const testBtn = document.getElementById('ai-test-btn');
    if (testBtn) { testBtn.disabled = true; testBtn.textContent = '⏳ Testing...'; }

    const useCustom = document.getElementById('ai-tier-custom').checked;
    const provider = document.getElementById('ai-provider-select').value;
    const key = document.getElementById('ai-key-input').value;
    const model = document.getElementById('ai-model-input').value;

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          use_custom_provider: useCustom,
          provider: provider,
          api_key: key,
          model: model
        })
      });
      const data = await res.json();
      if (feedback) {
        feedback.classList.remove('hidden', 'success', 'error');
        if (data.success) {
          feedback.classList.add('success');
          feedback.textContent = `✔ ${data.message} (${data.latency_ms}ms)`;
        } else {
          feedback.classList.add('error');
          feedback.textContent = `✖ ${data.message}`;
        }
      }
    } catch (err) {
      if (feedback) {
        feedback.classList.remove('hidden', 'success');
        feedback.classList.add('error');
        feedback.textContent = '✖ Network error testing connection';
      }
    } finally {
      if (testBtn) { testBtn.disabled = false; testBtn.textContent = '⚡ Test Connection'; }
    }
  }
```

- [ ] **Step 2: Add `this.fetchAIConfig()` call to `async init()` in `app.js`**

In `app.js`:
```javascript
  async init() {
    this.initThemeMode();
    await this.fetchWorlds();
    await this.fetchAIConfig();
    ...
```

- [ ] **Step 3: Run full automated test suite to verify everything passes**

Run: `node --test test/api-suite.js`
Expected: PASS (100% green)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-20-hosted-base-model-settings.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach would you like to use?
