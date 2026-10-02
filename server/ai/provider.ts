/**
 * Extraction provider adapter.
 *
 * Any OpenAI-compatible multimodal chat endpoint works (OpenAI, Azure OpenAI,
 * OpenRouter, Together, a local vLLM). Swapping providers is a change of four
 * environment variables, not of application code — and adding a native Anthropic
 * or Gemini adapter means implementing this one interface.
 *
 * Runs on the server only: `AI_API_KEY` must never be a `VITE_*` variable, and
 * this module is never imported by client code.
 */

export interface ExtractionFile {
  /** Base64 payload without the data-URL prefix. */
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface ProviderRequest {
  file: ExtractionFile;
  /** Strict JSON-schema-ish instructions the model must follow. */
  systemPrompt: string;
  userPrompt: string;
  /** Set when retrying after an invalid response. */
  repairNote?: string;
}

export interface ProviderResponse {
  /** Raw assistant text; parsing and validation happen outside the adapter. */
  text: string;
  provider: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface ExtractionProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  complete(request: ProviderRequest): Promise<ProviderResponse>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface ProviderEnv {
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_BASE_URL?: string;
  AI_PROVIDER_NAME?: string;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

/** Formats the upload as an OpenAI-style multimodal content part. */
function contentPart(file: ExtractionFile): Record<string, unknown> {
  if (file.mimeType === 'application/pdf') {
    // Providers that accept PDFs natively use the `file` part; those that do not
    // reject it loudly, and the caller can fall back to an image upload.
    return {
      type: 'file',
      file: {
        filename: file.fileName,
        file_data: `data:${file.mimeType};base64,${file.base64}`,
      },
    };
  }
  return {
    type: 'image_url',
    image_url: {
      url: `data:${file.mimeType};base64,${file.base64}`,
      detail: 'high',
    },
  };
}

export function createProvider(env: ProviderEnv): ExtractionProvider | null {
  const apiKey = env.AI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = env.AI_MODEL?.trim() || DEFAULT_MODEL;
  const name = env.AI_PROVIDER_NAME?.trim() || 'openai-compatible';

  return {
    name,
    model,
    isConfigured: () => true,

    async complete(request: ProviderRequest): Promise<ProviderResponse> {
      const body = {
        model,
        // Low temperature: extraction should be repeatable, not creative.
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: 'json_object' as const },
        messages: [
          { role: 'system' as const, content: request.systemPrompt },
          {
            role: 'user' as const,
            content: [
              { type: 'text' as const, text: request.userPrompt },
              contentPart(request.file),
              ...(request.repairNote
                ? [{ type: 'text' as const, text: request.repairNote }]
                : []),
            ],
          },
        ],
      };

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        const retryable = response.status === 429 || response.status >= 500;
        throw new ProviderError(
          detail.slice(0, 400) || `Provider responded ${response.status}`,
          response.status,
          retryable,
        );
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string | null } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const text = payload.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || text.trim().length === 0) {
        throw new ProviderError('The model returned an empty response.', 502, true);
      }

      return {
        text,
        provider: name,
        model,
        usage: {
          inputTokens: payload.usage?.prompt_tokens,
          outputTokens: payload.usage?.completion_tokens,
        },
      };
    },
  };
}

/** The only thing the client may learn about the provider configuration. */
export function describeProvider(env: ProviderEnv): { configured: boolean; provider: string | null; model: string | null } {
  const provider = createProvider(env);
  return {
    configured: provider !== null,
    provider: provider?.name ?? null,
    model: provider?.model ?? null,
  };
}
