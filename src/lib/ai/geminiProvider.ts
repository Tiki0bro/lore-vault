import type { IAiProvider, AiCompletionOptions, ConnectionTestResult } from './aiProviderTypes';
import { safeExtractJSON } from './safeJsonParser';

export class GeminiProvider implements IAiProvider {
  id: 'gemini' = 'gemini';
  name = 'Google Gemini AI';

  private getApiKey: () => string;
  private getModel: () => string;

  constructor(
    getApiKey: () => string,
    getModel: () => string
  ) {
    this.getApiKey = getApiKey;
    this.getModel = getModel;
  }

  private getCandidateModels(requestedModel?: string): string[] {
    const list = [
      requestedModel || this.getModel() || 'gemini-2.0-flash',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    return Array.from(new Set(list)).filter(Boolean);
  }

  async generateText(prompt: string, options?: AiCompletionOptions): Promise<string> {
    const apiKey = this.getApiKey().trim();
    if (!apiKey) {
      throw new Error('No Google Gemini API key configured. Please enter your API key in AI Settings.');
    }

    const candidateModels = this.getCandidateModels(this.getModel());
    let lastError: Error | null = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const contents: any[] = [];
        contents.push({
          role: 'user',
          parts: [{ text: prompt }]
        });

        const bodyPayload: any = {
          contents,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 2048,
          }
        };

        if (options?.systemInstruction) {
          bodyPayload.systemInstruction = {
            parts: [{ text: options.systemInstruction }]
          };
        }

        if (options?.responseJsonSchema) {
          bodyPayload.generationConfig.responseMimeType = 'application/json';
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[GeminiProvider] Model ${model} returned ${res.status}: ${errText}. Attempting fallback model...`);
          lastError = new Error(`Gemini HTTP ${res.status}: ${errText}`);
          continue;
        }

        const data = await res.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          return candidateText.trim();
        } else {
          lastError = new Error(`Gemini returned empty candidate content from ${model}`);
        }
      } catch (err: any) {
        console.warn(`[GeminiProvider] Network error with model ${model}:`, err);
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini candidate models failed to generate content.');
  }

  async generateStructured<T>(prompt: string, fallbackDefault?: T, options?: AiCompletionOptions): Promise<T> {
    const raw = await this.generateText(prompt, { ...options, responseJsonSchema: true });
    return safeExtractJSON<T>(raw, fallbackDefault);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const apiKey = this.getApiKey().trim();
    const model = this.getModel() || 'gemini-2.0-flash';
    if (!apiKey) {
      return {
        success: false,
        provider: 'gemini',
        model,
        message: 'No Gemini API key provided. Please paste your key in Settings.',
        error: 'Missing API key'
      };
    }

    try {
      const ping = await this.generateText('Respond with exactly "READY: CONNECTION ESTABLISHED".', {
        maxTokens: 30,
        temperature: 0.1,
      });

      return {
        success: true,
        provider: 'gemini',
        model,
        message: 'Connected to Google Gemini API successfully!',
        sample: ping
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'gemini',
        model,
        message: `Connection test failed: ${err.message}`,
        error: err.message
      };
    }
  }
}
