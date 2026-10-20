import type { LoreContextPayload } from './loreContextBuilder';
import { aiOrchestrator } from './aiOrchestrator';
import { useLoreStore } from '../../store/useLoreStore';

export interface AiMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  persona?: string;
}

export interface WorldDoctorReport {
  healthScore: number;
  executiveSummary: string;
  contradictions: Array<{
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    suggestedFix: string;
  }>;
  stubsToFleshOut: Array<{
    title: string;
    genre: string;
    proposedHook: string;
  }>;
}

export const geminiClient = {
  getApiKey(): string {
    return useLoreStore.getState().aiSettings.geminiApiKey || '';
  },

  setApiKey(key: string): void {
    useLoreStore.getState().updateAiSettings({ geminiApiKey: key.trim() });
  },

  getModel(): string {
    return useLoreStore.getState().aiSettings.geminiModel || 'gemini-2.0-flash';
  },

  setModel(model: string): void {
    useLoreStore.getState().updateAiSettings({ geminiModel: model });
  },

  async askWorldAi(prompt: string, context: LoreContextPayload): Promise<string> {
    const systemInstruction = `You are the LoreVault Worldbuilding AI Assistant for the realm "${context.world.name}" (Genre: ${context.world.genre}).
You have access to the following canonical lore context from the user's database:

${context.articlesContext}

Guidelines:
1. Ground your answers in the provided lore context whenever possible.
2. Whenever referencing characters, locations, or factions that exist in the world or could be added, wrap their names in double brackets like [[High Inquisitor Vaelen]] or [[The Sunken Citadel of Karas]] so the UI creates interactive wiki-links.
3. If Player Mode is active (${context.isPlayerMode ? 'TRUE' : 'FALSE'}), do NOT reveal any secret lore.
4. Maintain an immersive scholar tone.`;

    return await aiOrchestrator.generateWithFallback(prompt, {
      systemInstruction,
      temperature: 0.7,
      maxTokens: 1200,
    });
  },

  async runSocraticAudit(context: LoreContextPayload): Promise<string> {
    const prompt = `Perform an aggressive Socratic Causality Audit (Arthur "The Griller" Vance persona) on this world's lore:
Realm: ${context.world.name} (${context.world.genre})
Lore Context:
${context.articlesContext}

Identify 3 unspoken logistical holes, contradictory motivations, or hand-waved magic rules. Apply the 5-Whys probe.`;

    const systemInstruction = `You are Arthur "The Griller" Vance, Socratic Architect.
You interrogate worldbuilding with relentless logic: 5-Whys, logistical friction, supply chains, and causal trade-offs.
Tone: Razor-sharp, challenging, insightful.`;

    return await aiOrchestrator.generateWithFallback(prompt, {
      systemInstruction,
      temperature: 0.65,
      maxTokens: 1400,
    });
  },

  async runWorldDoctor(context: LoreContextPayload): Promise<WorldDoctorReport> {
    return await aiOrchestrator.runWorldDoctor({
      worldName: context.world.name,
      worldGenre: context.world.genre,
      articlesContext: context.articlesContext,
    });
  },
};
