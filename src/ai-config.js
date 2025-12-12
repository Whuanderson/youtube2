// Configuração dos modelos de IA disponíveis (atualizado)
export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-5-mini', name: 'GPT-5 mini (custo/benefício)', maxTokens: 16000 }, // :contentReference[oaicite:1]{index=1}
      { id: 'gpt-5.2', name: 'GPT-5.2 (top / código & agentes)', maxTokens: 16000 }, // :contentReference[oaicite:0]{index=0}
      { id: 'gpt-5-nano', name: 'GPT-5 nano (mais barato e rápido)', maxTokens: 8000 }, // :contentReference[oaicite:2]{index=2}

      // opcional: aponta pro snapshot usado no ChatGPT (bom p/ testar “o mais novo” do chat)
      { id: 'gpt-5.2-chat-latest', name: 'GPT-5.2 Chat (snapshot do ChatGPT)', maxTokens: 16384 }, // :contentReference[oaicite:3]{index=3}
    ],
  },

  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5 (top)', maxTokens: 8000 }, // :contentReference[oaicite:4]{index=4}
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (equilíbrio)', maxTokens: 8000 }, // :contentReference[oaicite:5]{index=5}
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (rápido/barato)', maxTokens: 8000 }, // :contentReference[oaicite:6]{index=6}
    ],
  },

  gemini: {
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (mais capaz)', maxTokens: 8000 }, // :contentReference[oaicite:7]{index=7}
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (ótimo custo/latência)', maxTokens: 8000 }, // :contentReference[oaicite:8]{index=8}
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (ultrarrápido)', maxTokens: 8000 }, // :contentReference[oaicite:9]{index=9}

      // opcional fallback (ainda atual, só não é “topo” como 2.5)
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (fallback)', maxTokens: 8000 }, // :contentReference[oaicite:10]{index=10}
    ],
  },
};

export const DEFAULT_PROVIDER = 'openai';
export const DEFAULT_MODEL = 'gpt-5-mini';
