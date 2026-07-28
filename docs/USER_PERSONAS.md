# LoreWeaver User Personas for The Weave Matrix & Feature Suite

This document contains the primary user personas established for **LoreWeaver**. These personas serve as reference archetypes when designing, refining, testing, and evaluating platform features—specifically **The Weave Matrix** (Context Compiler), **Canon Guard** (Graph Diagnostics & Secret Filters), **Narrative Slate** (Scene & Session Workspace), **Lore Codex** (World Knowledge Graph), and **Automated QA Pipelines**.

---

## 👔 1. Ethen — Product Owner & Project Lead

> *"I need to balance feature scope, user satisfaction across our target segments (VTT devs, worldbuilders, authors, QA, marketing), release velocity, and technical scalability while ensuring The Weave Matrix stays intuitive, extensible, and high-value."*

### Background & Profile
* **Role**: Product Owner & Strategic Project Lead for LoreWeaver.
* **Responsibilities**: Product vision, feature scoping, user feedback synthesis, milestone planning, UX prioritization, and aligning technical delivery with user value.
* **Core Goal**: Deliver a cohesive, high-impact **Weave Matrix** that delights all core user segments without over-complicating the user experience or suffering scope creep.

### Key Pain Points
* **Feature Scope Creep**: Trying to solve every niche power-user request at once, creating a bloated, confusing UI.
* **Fragmented UX**: Ensuring advanced developer settings don't alienate non-technical authors and worldbuilders.
* **Value Demonstration**: Needs clear metrics, visual presets, and "one-click" defaults so new users immediately see the power of LLM context building without a steep learning curve.

### Context Builder Wishlist & Requirements
1. **Preset Templates / Workflow Modes**: Out-of-the-box presets (`Session Prep`, `Co-Writer Slate`, `Developer API Mode`).
2. **Progressive Disclosure UI**: Keep default interface clean, with an "Advanced Settings" toggle for deep customizations.
3. **Token & Cost Transparency**: Visual summaries showing estimated token counts, breakdown by lore type, and model compatibility indicators.
4. **Extensibility Roadmap**: Modular architecture that allows adding future context sources seamlessly.

---

## 🧪 2. Riley "Solder" Chen — QA Lead & Edge-Case Specialist

> *"I need exhaustive boundary testing, zero silent error masks, deterministic error reporting, and robust automated regression suites so no malformed lore or edge-case prompt can crash LoreWeaver."*

### Background & Profile
* **Role**: Senior QA Automation Lead & System Reliability Specialist.
* **Environment**: Integration test scripts, API fuzzing suites, boundary checkers, performance monitors, and browser automation harnesses.
* **Core Goal**: Stress-test and validate every subsystem, endpoint, and edge case to guarantee 100% stability, exact schema compliance, and clean error recovery.

### Key Pain Points
* **Malformed Lore Inputs**: Unclosed tags, recursive `@[Cross-Links]`, circular relationships, or corrupt World Anvil JSON imports causing infinite loops or crashes.
* **Boundary & Token Overflows**: Oversized prompt configurations or 0-token empty slates breaking LLM API contracts or producing cryptic 500 errors.
* **Silent Errors & Masked Failures**: Systems that swallow exceptions or return empty fallbacks without diagnostic logging.
* **Race Conditions**: Rapid UI clicks (e.g., toggling presets or serializers mid-fetch) leading to state corruption or stale context renders.

### QA & Debugging Wishlist & Requirements
1. **Automated E2E Integration Suite**: Comprehensive test scripts (like `scratch/test-context-builder.js`) validating all endpoints, serializers, and DB operations.
2. **Structured Error Diagnostics**: Clear error payloads (`{ error: string, code: string, details: object }`) instead of generic crash responses.
3. **Boundary Guardrails**: Graceful handling of empty slates, missing articles, special regex characters in titles, and 0-character limits.
4. **Fuzzing & Sanitization Checks**: Automated checks ensuring user content cannot cause XSS or break XML/JSON prompt formatting.

---

## 🎭 3. Alex Vance — Full-Stack Developer & VTT/TTRPG Specialist

> *"I need deterministic, programmatic control over how lore, stats, and graph relationships are serialized into LLM prompts so my local and cloud AI models give consistent, schema-compliant responses with minimal token waste."*

### Background & Profile
* **Role**: Software engineer, homebrew Virtual Tabletop (VTT) module creator (Foundry VTT, custom Node.js apps).
* **Environment**: Uses local LLMs (via Ollama / LM Studio) alongside cloud APIs (OpenAI / Anthropic).
* **Core Goal**: Automate DM assistance, live NPC dialogue generation, and mechanical rule integration without manual prompt wrangling or high API latency/costs.

### Key Pain Points
* **Unpredictable Token Usage**: Hardcoded context pipelines often overflow context windows or truncate structured JSON responses.
* **Format Incompatibility**: Different models perform better with different serializations (XML, JSON, YAML, Markdown).
* **Lack of Graph Awareness**: Standard RAG often misses connected entity nodes.

### Context Builder Wishlist & Requirements
1. **Token Budget & Priority Stacker**: Ability to define token caps with priority tiers.
2. **Serializer Adapters**: Toggle context output formatting between Markdown, XML, JSON, and YAML.
3. **Graph Traversal Depth**: Configure relationship depth (e.g., "Include primary entity + all entities linked within 2 hops").
4. **Developer Inspection UI**: Raw prompt preview tab showing exact token counts per section, raw string output, and tokenization breakdown.

---

## 🎭 4. Morgan "Gifford" Reed — World Anvil Migrator & Power Worldbuilder

> *"I have 500+ articles covering nations, pantheons, timelines, and secret lore. I want LoreWeaver's AI to know my world inside out without me having to copy-paste 10 articles into ChatGPT every time I ask a question."*

### Background & Profile
* **Role**: Veteran Game Master running a multi-year TTRPG campaign in a rich custom world.
* **Environment**: Migrating away from a paid World Anvil subscription to maintain privacy, local control, and deeper AI automation.
* **Core Goal**: Seamlessly leverage established world articles, cross-links (`@[Title](template:id)`), categories, and secrets during AI brainstorming and session prep.

### Key Pain Points
* **Manual Context Assembly**: Copying background lore from multiple articles into external AI chats takes up half of their prep time.
* **Lore Hallucinations & Spoilers**: AI generating details that contradict existing canon or accidentally revealing DM-only secrets to players.
* **Lack of Categorical Filtering**: Difficulty selecting just the lore relevant to a specific region, faction, or historical era.

### Context Builder Wishlist & Requirements
1. **Automatic Cross-Link Resolution**: Typing or selecting `@City of Oakhaven` automatically pulls in Oakhaven's overview, key figures, and connected active quests.
2. **Category & Tag Scope Filters**: Filter context by tag (`#history`, `#magic-system`) or category.
3. **"Active Context Tray" with Visual Gauge**: Visual drawer where articles can be pinned/unpinned with color-coded token bars.
4. **Spoiler & Visibility Controls**: Toggle switch to strip `DM-Only / Secret` sections out of player-facing context budgets.

---

## 🎭 5. Elena Rostova — Novelist & Fiction Author

> *"I need the AI to stay in tune with my characters' internal motivations, relationships, and the tone of my narrative, without overwhelming it with irrelevant stats or world lore."*

### Background & Profile
* **Role**: Fantasy & Sci-Fi author writing multi-volume serials and novels.
* **Environment**: Writing tools, chapter outlines, character bibles, and generative co-writing suites.
* **Core Goal**: Use the LLM as a co-writer and sounding board to draft scenes, check character voice consistency, and outline chapter beats.

### Key Pain Points
* **Context Drift & Tone Loss**: The AI forgets character flaws, past emotional friction, or physical traits halfway through a chapter.
* **Lore Overload**: Standard lore dumps introduce static encyclopedia-like details into prose generation.
* **Cluttered Setup**: Re-entering style guidelines and story bibles repeatedly for every drafting session.

### Context Builder Wishlist & Requirements
1. **Layered Context Buckets**: Separate prompt context into System/Tone, Story Bible, Active Scene Cast, and Chapter Beats.
2. **Relationship & Flaw Injector**: Select active scene characters to automatically inject their dynamic relationship status and secret tensions.
3. **Prose & Style Presets**: Quick-select style injection chips (*Gritty*, *Fast-Paced*, *Whimsical*).
4. **Saved Context Snapshots**: Save named context setups (e.g., *"Chapter 14: The Heist Scene Slate"*).

---

## 🎭 6. Marcus "HypeSmith" Sterling — TTRPG, VTT & Fiction Marketing Strategist

> *"Marketing indie TTRPGs, VTT modules, and serial fiction isn't just about selling a product—it's about building a lore ecosystem. I need tools that instantly convert raw worldbuilding into high-converting Kickstarter teasers, VTT showcase copy, and reader newsletter hooks in our exact setting tone."*

### Background & Profile
* **Role**: Independent TTRPG Publisher, VTT Store Manager & Self-Published Fiction Marketer.
* **Environment**: Crowdfunding platforms (Kickstarter, BackerKit), VTT Marketplaces (Foundry VTT Hub, Roll20 Marketplace, DTRPG, itch.io), Fiction Platforms (Royal Road, Substack, Amazon KDP, BookTok), Discord, and Mailchimp/ConvertKit.
* **Core Goal**: Maximize audience growth, conversion, and community engagement across game systems, VTT platforms, and novel releases by leveraging rich setting lore for promotional content without spending hours manually drafting marketing assets.

### Domain-Specific Marketing Knowledge & Strategy
1. **TTRPG & Crowdfunding Growth**:
   * Quickstart PDF lead magnets, pledge tier strategy, stretch goal unlocks, playtest packet releases, and actual-play sponsorship media kits.
   * Native engagement on Reddit (`r/rpg`, `r/worldbuilding`), Discord server funnels, and DriveThruRPG/itch.io launch algorithms.
2. **VTT Marketplace & Product Positioning**:
   * Packaging campaign settings into ready-to-play VTT bundles with compelling store descriptions, feature callouts (dynamic lighting, macro automation, actor tokens), and video teaser copy.
3. **Serialized & Indie Novel Marketing**:
   * Royal Road/Scribble Hub serialization algorithms (shoutout swaps, tag optimization), ARC (Advance Reader Copy) team management, Substack reader magnets, and BookTok/BookTube hook generation.

### Key Pain Points
* **Marketing Friction & Burnout**: Spending more time writing promotional posts, press releases, and Kickstarter updates than working on the game/book itself.
* **Tonal Mismatch in Marketing Copy**: Generic AI tool outputs sound like sanitized corporate ad copy rather than rich, evocative dark fantasy/sci-fi narrative prose.
* **Spoiler & Canon Risk**: Accidentally revealing campaign twists or unreleased book endings in public promotional lore snippets.
* **Format Fatigue**: Reformatting the same lore entry into 5 different layouts (Kickstarter update, Royal Road author note, VTT store copy, Discord lore drop, Twitter/Bluesky teaser).

### Context Builder Wishlist & Requirements
1. **"Marketing & Promotional Slate" Presets**: Pre-configured context slates for generating Kickstarter updates, Royal Road author notes, newsletter reader magnets, and press releases.
2. **Tone & Hook Injector**: Style chips designed specifically for marketing copy (*Evocative Teaser*, *High-Stakes Blurb*, *Feature Showcase*, *Backer Call-to-Action*).
3. **Spoiler-Filtered Public Excerpts**: Ability to generate player-facing / public-safe promotional lore summaries with DM secrets automatically stripped.
4. **VTT & Web Store Asset Generator**: One-click formatting of lore articles into VTT store listings, itch.io devlogs, and DTRPG sales page descriptions.

---

## 🛠️ Summary Matrix for Feature & QA Evaluation

| Feature / Consideration | Ethen (PO) | Riley (QA / Debugging) | Alex (Developer / VTT) | Morgan (World Anvil) | Elena (Author) | Marcus (Marketing / Growth) |
|---|---|---|---|---|---|---|
| **Primary Goal** | Balanced Scope & UX | 100% Stability & Zero Regressions | API Control & Efficiency | Canon Accuracy & Prep Speed | Character Voice & Tone | Virality, Audience Conversion & Lore Distribution |
| **Primary Interface** | Presets & Progressive UI | Automated Test Suite & Trace Logs | Raw Prompt & JSON Inspection | Category / Tag / Cross-link Search | Scene Slate & Style Chips | Promo Slates, Hook Chips & Excerpt Exports |
| **Key Metric** | User Adoption & Roadmap | Test Coverage & Zero Crashes | Token Efficiency & Format Choice | Cross-Link Resolution & Secrets | Narrative & Tonal Flow | Click-Through Rates, Kickstarter Conversions & List Growth |
