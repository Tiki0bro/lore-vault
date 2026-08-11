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

## 🎨 7. Maya Lin — Lead UI/UX & Product App Designer

> *"An app can have incredible features under the hood, but if UI buttons overflow off the screen, navigation is cluttered, or settings are scattered arbitrarily, the user experience breaks. UI must be responsive, visually balanced, and organized with intuitive progressive disclosure."*

### Background & Profile
* **Role**: Lead UI/UX Architect & Product Design Specialist.
* **Responsibilities**: Interface layout hierarchy, component responsiveness, visual spacing/contrast, action grouping, preventing screen clipping, and ensuring high-density desktop tools feel elegant and readable.
* **Core Goal**: Guarantee that LoreVault's interface scales cleanly across all screen sizes (from 1080p laptops to 4K displays), eliminating horizontal overflow, organizing settings logically, and keeping primary actions front-and-center.

### Key Pain Points
* **Header / Navbar Overload**: Too many buttons packed inline into the top navigation bar, causing rightmost actions (`AI Settings`, `World Doctor`, `Import`, `New Article`) to get clipped or cut off.
* **Vertical Tag Cloud Sprawl**: Unconstrained tag lists taking up half of the sidebar and forcing excessive scrolling.
* **Inconsistent Control Grouping**: Action buttons (`Edit`, `Delete`, `Move to World`) floating without clean container grouping.
* **Horizontal Scrollbar Bugs**: Unchecked flex containers causing page-level horizontal overflow (`overflow-x`).

### UI/UX Wishlist & Design Directives
1. **Responsive Navbar Restructuring**: Streamline top header into 3 clean zones: Brand/Title, Core View Switcher (`Lore Codex`, `Narrative Slate`, `Weave Matrix`), and a consolidated `⚙️ Tools & World Actions` dropdown menu paired with a single prominent `+ New Article` primary CTA button.
2. **Compact Sidebar Accordion**: Wrap tag clouds into a collapsible accordion or horizontal filter chip strip so Categories stay prominent.
3. **Parchment Action Header**: Encapsulate article viewing/editing controls (`Edit`, `Move to World`, `Delete`) inside a clean toolbar above the article reader.
4. **Zero-Overflow Layout Contract**: Enforce strict `overflow-x: hidden` and responsive flex wrapping so no UI element is ever clipped off screen.

---

## 🤖 8. Grant Harlow — AI-Forward Novelist & Tech Enthusiast

> *"AI is a creative multiplier. I want every possible workflow — brainstorming, outlining, drafting, editing, consistency checking — to have an AI-assisted path. If there's a manual step left, I want to know why it hasn't been automated yet."*

### Background & Profile
* **Role**: Fantasy & Sci-Fi novelist and independent author with a strong software engineering background.
* **Environment**: Uses multiple AI services (OpenAI, Anthropic, Google, Mistral, local models), follows AI product launches obsessively (reads changelogs, benchmarks new models on release day), and actively beta-tests competitor worldbuilding and writing tools.
* **Core Goal**: Maximise AI integration at every layer of the creative process — from ideation and world generation through drafting, revision, and publishing prep — so that Loreweave becomes a fully AI-native writing platform.

### Key Pain Points
* **Under-utilised AI Surface Area**: Tools that offer a single "Ask AI" button but lack deep integration into outlining, relationship mapping, timeline generation, and style coaching.
* **Stale Model Support**: Products that lock into a single LLM provider or lag months behind the latest model releases, missing out on improved context windows, reasoning, and cost reductions.
* **Manual Bottlenecks**: Any workflow step that requires copy-pasting between tools, manually re-entering context, or hand-curating prompts that the system could assemble automatically.
* **Competitor Awareness**: Frustrated when Loreweave falls behind features already shipped by rivals (e.g., Sudowrite's story engine, Novelcrafter's codex injection, Campfire's AI integrations).

### Context Builder Wishlist & Requirements
1. **AI-Everywhere Philosophy**: Expects AI assistance to be woven into every major feature — article generation, relationship inference, timeline suggestions, plot-hole detection, style transfer, and even marketing copy generation.
2. **Model Agnosticism & Rapid Adoption**: First-class support for swapping between LLM providers and models; automatic adoption of new model releases with minimal configuration.
3. **Automated Context Assembly**: Zero-click context building — the system should infer which lore, characters, and scenes are relevant based on the user's current task and active document.
4. **AI Pipeline Transparency**: Full visibility into how context is assembled, what tokens cost, which model is being used, and why certain lore was included or excluded — not a black box.
5. **Competitive Feature Parity Tracker**: Wants Loreweave to actively track and match (or exceed) AI capabilities offered by competing platforms.

---

## 🖋️ 9. Merryn Ashford — Creative Purist & Craft-First Author

> *"The words on the page need to be mine. I'll happily let a tool organise my notes, catch my plot holes, and keep my timeline straight — but the moment it starts writing my prose, it's overstepped."*

### Background & Profile
* **Role**: Literary fantasy author and poet focused on voice-driven, character-rich fiction.
* **Environment**: Prefers distraction-free writing environments, handwritten notebooks for ideation, and structured digital tools for organisation. Uses Scrivener, Obsidian, and spreadsheets for world management.
* **Core Goal**: A powerful organisational and analytical tool that respects the boundary between *her craft* (prose, dialogue, voice) and *tool assistance* (structure, consistency, search, cross-referencing).

### Key Pain Points
* **Unwanted Generative AI in the Writing Flow**: Auto-complete suggestions, AI-drafted paragraphs, or "Write for me" buttons that interrupt her creative process and undermine her sense of authorship.
* **AI-Generated Content Contamination**: Fear that AI-written text will creep into her manuscripts, diluting her voice and raising ethical concerns with publishers and readers.
* **All-or-Nothing AI Toggle**: Products that force users to either embrace full AI generation or get no AI assistance at all — no middle ground for analytical-only AI use.
* **Organisational Gaps Without AI**: Non-AI tools that lack the smart cross-referencing, timeline validation, and consistency auditing that would genuinely save her time without touching her prose.

### Context Builder Wishlist & Requirements
1. **AI-Assisted Organisation (Not Generation)**: Smart tagging, automatic cross-link suggestions, timeline conflict detection, and character relationship mapping — all without generating prose.
2. **Strict "No-Generate" Mode**: A clear, enforceable setting that disables all generative AI features (drafting, rewriting, auto-complete) while keeping analytical and organisational AI fully active.
3. **Canon Consistency Auditor**: AI-powered validation that flags contradictions, timeline errors, and relationship inconsistencies across articles — reporting problems, not writing fixes.
4. **Clean, Distraction-Free UI**: Writing interface that prioritises focus and readability, with AI features tucked away behind intentional user actions rather than surfaced proactively.
5. **Transparent AI Boundaries**: Clear labelling of which features use generative AI vs. analytical AI, so she can make informed choices about what to enable.

---

## 🔍 10. Arthur "The Griller" Vance — Socratic Architect & Stress Tester ("Grill Me")

> *"If an architecture, lore rule, or feature design can't survive five consecutive 'Why?' questions, it isn't ready for implementation."*

### Background & Profile
* **Role**: Principal Systems Architect, Socratic Design Auditor, and Narrative Stress-Tester.
* **Environment**: Architecture reviews, feature spec discussions, worldbuilding lore sanity checks, design gates, and interactive grilling sessions.
* **Core Goal**: Uncover hidden assumptions, unexamined dependencies, scope creep, and plot holes before code is written or lore is locked in.

### Key Grilling Domains & Interrogation Focus
1. **The 5-Whys Deep Probe**: Interrogating feature requests down to their root value (*"Why do we need this button? What breaks if we don't build it?"*).
2. **Edge-Case & Failure-Mode Auditing**: Forcing failure mode definitions upfront (*"What happens if the API times out? What if an article cross-links to itself?"*).
3. **YAGNI & Complexity Tax**: Challenging over-engineered solutions and calculating ongoing maintenance debt vs. user utility.
4. **Lore & Narrative Sanity Testing**: Interrogating magic systems, faction motivations, and timeline logic for contradictions.
5. **Cross-Persona Interrogations**: Stress-testing proposals from Ethen (scope), Grant (AI enthusiasm), Alex (dev complexity), or Merryn (craft boundaries).

---

## 🛠️ Summary Matrix for Feature & QA Evaluation

| Feature / Consideration | Ethen (PO) | Maya (UI/UX) | Riley (QA) | Alex (Dev / VTT) | Morgan (World Anvil) | Elena (Author) | Marcus (Marketing) | Grant (AI-Forward) | Merryn (Purist) | Arthur (Grill Me) |
|---|---|---|---|---|---|---|---|---|---|---|
| **Primary Goal** | Balanced Scope & UX | Zero-Overflow & Clean Hierarchy | 100% Stability & Zero Regressions | API Control & Efficiency | Canon Accuracy & Prep Speed | Character Voice & Tone | Virality & Lore Distribution | Maximum AI Integration | Craft Ownership & Analytical AI | Expose Assumptions & Stress-Test Designs |
| **Primary Interface** | Presets & Progressive UI | Streamlined Navbar & Responsive Grids | Automated Test Suite & Trace Logs | Raw Prompt & JSON Inspection | Category / Tag / Search | Scene Slate & Style Chips | Promo Slates & Excerpt Exports | AI Pipeline & Model Switcher | No-Generate Mode & Auditor | Socratic Q&A & Interactive Grilling |
| **Key Metric** | User Adoption & Roadmap | Screen Compliance & Zero Clipping | Test Coverage & Zero Crashes | Token Efficiency & Format Choice | Cross-Link Resolution & Secrets | Narrative & Tonal Flow | Click-Through Rates & Conversion | AI Feature Coverage | Zero AI Prose & Org Efficiency | Zero Unexamined Assumptions & Robust Specs |
