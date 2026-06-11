import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Add OPENAI_API_KEY to your Render environment variables.",
    );
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

export const openai = new Proxy({} as OpenAI, {
  get(_, prop: string | symbol) {
    return Reflect.get(getClient(), prop);
  },
});
