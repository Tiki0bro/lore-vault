import type { IAiProvider, AiCompletionOptions, ConnectionTestResult } from './aiProviderTypes';
import { safeExtractJSON } from './safeJsonParser';

export class OllamaProvider implements IAiProvider {
  id: 'ollama' = 'ollama';
  name = 'Local Ollama Engine';

  private getEndpoint: () => string;
  private getModel: () => string;

  constructor(
    getEndpoint: () => string,
    getModel: () => string
  ) {
    this.getEndpoint = getEndpoint;
    this.getModel = getModel;
  }

  private cleanEndpoint(endpoint: string): string {
    return (endpoint || 'http://localhost:11434').replace(/\/+$/, '');
  }

  async listModels(): Promise<string[]> {
    const endpoint = this.cleanEndpoint(this.getEndpoint());
    try {
      const res = await fetch(`${endpoint}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: any) => m.name || m.model);
    } catch {
      return [];
    }
  }

  async generateText(prompt: string, options?: AiCompletionOptions): Promise<string> {
    const endpoint = this.cleanEndpoint(this.getEndpoint());
    const model = this.getModel() || 'llama3.2';

    const payload: any = {
      model,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_predict: options?.maxTokens ?? 2048,
      }
    };

    if (options?.systemInstruction) {
      payload.system = options.systemInstruction;
    }

    if (options?.responseJsonSchema) {
      payload.format = 'json';
    }

    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return (data.response || '').trim();
    } catch (err: any) {
      throw new Error(`Cannot reach local Ollama at ${endpoint}: ${err.message}. Ensure Ollama is running ('ollama serve').`);
    }
  }

  async generateStructured<T>(prompt: string, fallbackDefault?: T, options?: AiCompletionOptions): Promise<T> {
    const raw = await this.generateText(prompt, { ...options, responseJsonSchema: true });
    return safeExtractJSON<T>(raw, fallbackDefault);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const endpoint = this.cleanEndpoint(this.getEndpoint());
    const model = this.getModel() || 'llama3.2';

    try {
      const models = await this.listModels();
      if (models.length === 0) {
        return {
          success: false,
          provider: 'ollama',
          model,
          message: `Connected to ${endpoint}, but no models were detected. Run 'ollama pull llama3.2' in your terminal.`,
          error: 'No local models available'
        };
      }

      const activeModelAvailable = models.includes(model);
      const chosenModel = activeModelAvailable ? model : models[0];

      return {
        success: true,
        provider: 'ollama',
        model: chosenModel,
        message: `Ollama connected at ${endpoint}. Available models: ${models.join(', ')}`,
        sample: `Active model ready: ${chosenModel}`
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'ollama',
        model,
        message: `Connection failed to Ollama at ${endpoint}: ${err.message}`,
        error: err.message
      };
    }
  }
}
