import OpenAI from "openai";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

let _client: OpenAI | null = null;
let _fallbackClient: OpenAI | null = null;

// Maps cloud model names to local Ollama equivalents
const LOCAL_MODEL_MAP: Record<string, string> = {
  "gpt-4o-mini": "llama3.2",
  "gpt-5.4": "llama3.1:8b",
};

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("no-api-key");
  }
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  _client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  return _client;
}

function getFallbackClient(): OpenAI {
  if (_fallbackClient) return _fallbackClient;
  const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  _fallbackClient = new OpenAI({ apiKey: "ollama", baseURL });
  return _fallbackClient;
}

export const openai = new Proxy({} as OpenAI, {
  get(_, prop: string | symbol) {
    return Reflect.get(getClient(), prop);
  },
});

function isAvailabilityError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message ?? "";
  // Missing key, network failures, or upstream service down
  if (msg === "no-api-key") return true;
  const code = (err as NodeJS.ErrnoException).code ?? "";
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") return true;
  const status = (err as { status?: number }).status;
  if (status === 503 || status === 502 || status === 504) return true;
  return false;
}

/**
 * Drop-in replacement for openai.chat.completions.create that automatically
 * falls back to a local Ollama instance when OpenAI is unreachable or
 * unconfigured. Validation errors (400/422) are still thrown immediately.
 */
export async function chatWithFallback(
  params: ChatCompletionCreateParamsNonStreaming,
): Promise<ChatCompletion> {
  let primaryError: unknown;

  try {
    const client = getClient();
    return await client.chat.completions.create({ ...params, stream: false });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 400 || status === 422) throw err; // bad input — don't fall back
    primaryError = err;
    if (!isAvailabilityError(err)) throw err;
  }

  // Primary failed — try local Ollama
  const localModel = LOCAL_MODEL_MAP[params.model] ?? "llama3.2";
  try {
    return await getFallbackClient().chat.completions.create({
      ...params,
      model: localModel,
      stream: false,
    });
  } catch {
    throw primaryError; // surface original error if Ollama is also unavailable
  }
}
