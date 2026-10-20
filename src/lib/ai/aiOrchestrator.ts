import { GeminiProvider } from './geminiProvider';
import { OllamaProvider } from './ollamaProvider';
import { HeuristicProvider } from './heuristicProvider';
import type { IAiProvider, ConnectionTestResult } from './aiProviderTypes';
import { promptTemplates } from './promptTemplates';
import type { WorldDoctorReport } from './geminiClient';
import { useLoreStore } from '../../store/useLoreStore';
import type { ArticleCategory, Statblock } from '../../types/lore';

class AiOrchestrationService {
  private geminiProvider: GeminiProvider;
  private ollamaProvider: OllamaProvider;
  private heuristicProvider: HeuristicProvider;

  constructor() {
    this.geminiProvider = new GeminiProvider(
      () => useLoreStore.getState().aiSettings.geminiApiKey,
      () => useLoreStore.getState().aiSettings.geminiModel
    );

    this.ollamaProvider = new OllamaProvider(
      () => useLoreStore.getState().aiSettings.ollamaEndpoint,
      () => useLoreStore.getState().aiSettings.ollamaModel
    );

    this.heuristicProvider = new HeuristicProvider();
  }

  getActiveProvider(): IAiProvider {
    const providerType = useLoreStore.getState().aiSettings.provider;
    if (providerType === 'ollama') return this.ollamaProvider;
    if (providerType === 'simulation') return this.heuristicProvider;
    return this.geminiProvider;
  }

  async generateWithFallback(
    prompt: string,
    options?: Parameters<IAiProvider['generateText']>[1]
  ): Promise<string> {
    const active = this.getActiveProvider();
    try {
      return await active.generateText(prompt, options);
    } catch (err: any) {
      console.warn(`[AiOrchestrator] Active provider ${active.id} failed:`, err);
      if (active.id !== 'simulation') {
        console.info('[AiOrchestrator] Falling back to Built-in Heuristic Simulator...');
        return await this.heuristicProvider.generateText(prompt, options);
      }
      throw err;
    }
  }

  async generateStructuredWithFallback<T>(
    prompt: string,
    fallbackDefault?: T,
    options?: Parameters<IAiProvider['generateStructured']>[2]
  ): Promise<T> {
    const active = this.getActiveProvider();
    try {
      return await active.generateStructured<T>(prompt, fallbackDefault, options);
    } catch (err: any) {
      console.warn(`[AiOrchestrator] Structured generation with ${active.id} failed:`, err);
      if (active.id !== 'simulation') {
        console.info('[AiOrchestrator] Falling back to Built-in Heuristic Simulator for structured data...');
        return await this.heuristicProvider.generateStructured<T>(prompt, fallbackDefault, options);
      }
      return fallbackDefault as T;
    }
  }

  // --- Worldbuilding Codex Methods ---
  async fleshOutArticleStub(params: {
    title: string;
    category: ArticleCategory;
    summary: string;
    worldName: string;
    worldGenre: string;
    existingArticlesContext: string;
  }): Promise<string> {
    const { tonePreset, noGenerateMode } = useLoreStore.getState().aiSettings;
    const { systemPrompt, userPrompt } = promptTemplates.fleshOutArticleStub({
      ...params,
      tone: tonePreset,
      noGenerateMode,
    });

    return await this.generateWithFallback(userPrompt, {
      systemInstruction: systemPrompt,
      tonePreset,
      temperature: 0.7,
      maxTokens: 2048,
    });
  }

  // --- Novel Studio Co-Pilot Methods ---
  async continueProse(params: {
    chapterTitle: string;
    precedingText: string;
    povCharacter?: string;
    sceneSlateContext?: string;
    customDirection?: string;
  }): Promise<string> {
    const { tonePreset } = useLoreStore.getState().aiSettings;
    const { systemPrompt, userPrompt } = promptTemplates.proseContinuation({
      ...params,
      tone: tonePreset,
    });

    return await this.generateWithFallback(userPrompt, {
      systemInstruction: systemPrompt,
      tonePreset,
      temperature: 0.8,
      maxTokens: 1024,
    });
  }

  async expandBeat(params: {
    chapterTitle: string;
    outlineBeat: string;
    sceneSlateContext?: string;
  }): Promise<string> {
    const { tonePreset } = useLoreStore.getState().aiSettings;
    const { systemPrompt, userPrompt } = promptTemplates.expandBeat({
      ...params,
      tone: tonePreset,
    });

    return await this.generateWithFallback(userPrompt, {
      systemInstruction: systemPrompt,
      tonePreset,
      temperature: 0.75,
      maxTokens: 1536,
    });
  }

  async polishProse(params: {
    rawText: string;
    focus: 'sensory' | 'punchy' | 'dialogue' | 'grimdark';
  }): Promise<string> {
    const { tonePreset } = useLoreStore.getState().aiSettings;
    const { systemPrompt, userPrompt } = promptTemplates.sensoryPolish({
      rawText: params.rawText,
      focus: params.focus,
      tone: tonePreset,
    });

    return await this.generateWithFallback(userPrompt, {
      systemInstruction: systemPrompt,
      tonePreset,
      temperature: 0.6,
      maxTokens: 1200,
    });
  }

  // --- Dynamic World Doctor & Auditor ---
  async runWorldDoctor(params: {
    worldName: string;
    worldGenre: string;
    articlesContext: string;
  }): Promise<WorldDoctorReport> {
    const prompt = `Perform a comprehensive World Doctor Audit on "${params.worldName}" (${params.worldGenre}).
Canon Articles:
${params.articlesContext}

Scan for:
1. Timeline and causal contradictions
2. Unwritten stubs that need fleshing out
3. Calculate an overall World Health Score (0-100) and an Executive Summary.

Return valid JSON adhering to:
{
  "healthScore": number,
  "executiveSummary": "string",
  "contradictions": [
    { "title": "string", "description": "string", "severity": "high"|"medium"|"low", "suggestedFix": "string" }
  ],
  "stubsToFleshOut": [
    { "title": "string", "genre": "string", "proposedHook": "string" }
  ]
}`;

    const fallbackReport: WorldDoctorReport = {
      healthScore: 88,
      executiveSummary: `The world of ${params.worldName} maintains a strong thematic core. Minor temporal gaps exist between historical events.`,
      contradictions: [
        {
          title: 'Foundational Timeline Collision',
          description: 'Historical records suggest overlapping control of the central citadel prior to the Cataclysm.',
          severity: 'medium',
          suggestedFix: 'Clarify that the citadel was co-governed during the treaty era.',
        },
      ],
      stubsToFleshOut: [
        {
          title: 'The Sunshard Reliquary',
          genre: params.worldGenre,
          proposedHook: 'A subterranean vault holding the crystal core of the fallen astral monolith.',
        },
      ],
    };

    return await this.generateStructuredWithFallback<WorldDoctorReport>(prompt, fallbackReport, {
      systemInstruction: 'You are the World Doctor narrative auditor. Output strict JSON diagnostics only.',
      temperature: 0.3,
      responseJsonSchema: true,
    });
  }

  // --- AI Bestiary Creature Generator ---
  async generateStatblock(params: {
    creatureConcept: string;
    system: 'dnd5e' | 'pf2e';
    crTarget?: string;
    loreContext?: string;
  }): Promise<Statblock> {
    const { systemPrompt, userPrompt } = promptTemplates.statblockConversion(params);

    const fallbackStatblock: Statblock = {
      id: `stat-${Date.now()}`,
      worldId: useLoreStore.getState().activeWorldId,
      system: params.system,
      name: params.creatureConcept || 'Astral Stalker',
      size: 'Medium',
      creatureType: 'Aberration',
      alignment: 'Neutral Evil',
      cr: params.crTarget || '5',
      ac: 15,
      acType: 'natural armor',
      hp: 78,
      hpFormula: '12d8 + 24',
      speed: '40 ft.',
      abilities: { str: 16, dex: 18, con: 14, int: 10, wis: 14, cha: 12 },
      actions: [
        {
          id: 'act-1',
          name: 'Rend',
          desc: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.',
          attackBonus: 7,
          formula: '1d20+7',
        },
      ],
      isSecret: false,
    };

    const structured = await this.generateStructuredWithFallback<any>(userPrompt, fallbackStatblock, {
      systemInstruction: systemPrompt,
      temperature: 0.4,
      responseJsonSchema: true,
    });

    return {
      ...fallbackStatblock,
      ...structured,
      id: `stat-${Date.now()}`,
      worldId: useLoreStore.getState().activeWorldId,
      system: params.system,
    };
  }

  // --- Interactive NPC Roleplay ---
  async chatWithNpc(params: {
    npcName: string;
    npcLore: string;
    worldName: string;
    dialogueHistory: Array<{ speaker: string; text: string }>;
    userMessage: string;
  }): Promise<string> {
    const { systemPrompt, userPrompt } = promptTemplates.npcRoleplay(params);
    return await this.generateWithFallback(userPrompt, {
      systemInstruction: systemPrompt,
      temperature: 0.8,
      maxTokens: 800,
    });
  }

  // --- Tactical Combat Battle Narrative ---
  async simulateCombatProse(params: {
    combatantA: string;
    combatantB: string;
    winner: string;
    rounds: number;
    turnLogs: string;
    environment?: string;
  }): Promise<string> {
    const { systemPrompt, userPrompt } = promptTemplates.fightSimulationProse(params);
    return await this.generateWithFallback(userPrompt, {
      systemInstruction: systemPrompt,
      temperature: 0.75,
      maxTokens: 1200,
    });
  }

  // --- Provider Testing ---
  async testActiveProviderConnection(): Promise<ConnectionTestResult> {
    const active = this.getActiveProvider();
    return await active.testConnection();
  }
}

export const aiOrchestrator = new AiOrchestrationService();
