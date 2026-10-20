/**
 * AI Horde Client for Lore Vault
 * Integrates with the decentralized AI Horde network (https://aihorde.net)
 * Supports free anonymous generation (apikey: '0000000000') as well as custom API keys.
 */

export interface HordeGenerateParams {
  prompt: string;
  negativePrompt?: string;
  sourceImage?: string; // Base64 or URL for img2img reference
  denoisingStrength?: number; // 0.1 (subtle) to 0.9 (heavy redesign)
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  models?: string[];
  apiKey?: string;
  onProgress?: (status: {
    queuePosition: number;
    waitTime: number;
    processing: number;
    done: boolean;
  }) => void;
}

export interface HordeGenerateResult {
  imageUrl: string;
  seed: string;
  model: string;
  workerName: string;
}

const DEFAULT_HORDE_MODELS = [
  'Flat-2D Animerge',
  'stable_diffusion',
  'Deliberate',
  'AbsoluteReality',
  'AlbedoBase XL (SDXL)',
  'ICBINP - I Can\'t Believe It\'s Not Photography'
];

export class AIHordeClient {
  private static BASE_URL = 'https://stablehorde.net/api/v2';
  private static ANONYMOUS_KEY = '0000000000';

  /**
   * Calculate standard 64-multiple dimensions suitable for Stable Diffusion / SDXL workers
   */
  public static getHordeDimensions(ratio: string = 'portrait'): { width: number; height: number } {
    switch (ratio) {
      case 'portrait':
        return { width: 512, height: 768 }; // 2:3 vertical portrait
      case 'cinematic':
        return { width: 768, height: 512 }; // 3:2 landscape
      case 'banner':
        return { width: 768, height: 448 }; // wide banner
      case 'square':
      default:
        return { width: 512, height: 512 }; // 1:1 square
    }
  }

  /**
   * Submit async generation job to AI Horde
   */
  public static async submitJob(params: HordeGenerateParams): Promise<string> {
    const apiKey = params.apiKey?.trim() || this.ANONYMOUS_KEY;
    const models = params.models && params.models.length > 0 ? params.models : DEFAULT_HORDE_MODELS;

    // AI Horde formats negative prompt after ### separator or in payload
    const effectivePrompt = params.negativePrompt
      ? `${params.prompt} ### ${params.negativePrompt}`
      : params.prompt;

    const payload: Record<string, any> = {
      prompt: effectivePrompt,
      params: {
        steps: params.steps || 25,
        width: params.width || 512,
        height: params.height || 768,
        cfg_scale: params.cfgScale || 7,
        seed: params.seed !== undefined ? String(params.seed) : undefined,
        sampler_name: 'k_euler',
      },
      nsfw: false,
      censor_nsfw: true,
      models,
    };

    // If sourceImage is provided, enable img2img transformation
    if (params.sourceImage) {
      // Strip data URL scheme prefix if present
      const cleanBase64 = params.sourceImage.replace(/^data:image\/[a-z]+;base64,/, '');
      payload.source_image = cleanBase64;
      payload.source_processing = 'img2img';
      payload.params.denoising_strength = params.denoisingStrength ?? 0.65;
    }

    const res = await fetch(`${this.BASE_URL}/generate/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Agent': 'LoreVault:1.0:community',
        'apikey': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `AI Horde submission failed: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.id) {
      throw new Error(data.message || 'AI Horde did not return a job ID');
    }

    return data.id;
  }

  /**
   * Poll generation status until completed or timed out
   */
  public static async pollJob(
    jobId: string,
    onProgress?: HordeGenerateParams['onProgress'],
    maxWaitSeconds = 180
  ): Promise<HordeGenerateResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const checkRes = await fetch(`${this.BASE_URL}/generate/check/${jobId}`);
      if (!checkRes.ok) {
        throw new Error(`AI Horde status check failed: ${checkRes.statusText}`);
      }

      const checkData = await checkRes.json();
      onProgress?.({
        queuePosition: checkData.queue_position ?? 0,
        waitTime: checkData.wait_time ?? 0,
        processing: checkData.processing ?? 0,
        done: Boolean(checkData.done),
      });

      if (checkData.faulted) {
        throw new Error('AI Horde worker encountered a fault generating this image.');
      }

      if (checkData.done) {
        const statusRes = await fetch(`${this.BASE_URL}/generate/status/${jobId}`);
        if (!statusRes.ok) {
          throw new Error('Failed to retrieve finalized image from AI Horde.');
        }

        const statusData = await statusRes.json();
        const generation = statusData.generations?.[0];
        if (!generation || !generation.img) {
          throw new Error('AI Horde completed without an image payload.');
        }

        return {
          imageUrl: generation.img,
          seed: generation.seed,
          model: generation.model || 'stable_diffusion',
          workerName: generation.worker_name || 'Worker',
        };
      }
    }

    throw new Error('AI Horde request timed out waiting for an active worker.');
  }

  /**
   * Complete end-to-end generate method
   */
  public static async generate(params: HordeGenerateParams): Promise<HordeGenerateResult> {
    const jobId = await this.submitJob(params);
    return await this.pollJob(jobId, params.onProgress);
  }
}
