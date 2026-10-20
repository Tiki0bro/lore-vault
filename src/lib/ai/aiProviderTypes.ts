import type { TonePreset, AiProviderType } from '../../types/lore';

export interface AiCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  tonePreset?: TonePreset;
  responseJsonSchema?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  provider: AiProviderType;
  model: string;
  message: string;
  sample?: string;
  error?: string;
}

export interface IAiProvider {
  id: AiProviderType;
  name: string;
  generateText(prompt: string, options?: AiCompletionOptions): Promise<string>;
  generateStructured<T>(prompt: string, fallbackDefault?: T, options?: AiCompletionOptions): Promise<T>;
  testConnection(): Promise<ConnectionTestResult>;
}
