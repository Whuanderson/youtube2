import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function asString(v, fallback = "") {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function extractJsonObject(text) {
  // tenta parse direto
  try {
    return JSON.parse(text);
  } catch (_) { }

  // fallback: extrai o primeiro {...} grande
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Resposta não contém JSON válido");
  return JSON.parse(m[0]);
}

function openaiSupportsTemperature(model) {
  return (
    model.startsWith("gpt-4o") ||
    model.startsWith("gpt-4.1") ||
    model === "gpt-5.2" ||
    model === "gpt-5.1"
  );
}

async function gerarComOpenAIJson(prompt, model, { temperature = 0.2, maxOutputTokens = 1200 } = {}) {
  const payload = {
    model,
    input: prompt,
    max_output_tokens: maxOutputTokens,
    text: { format: { type: "json_object" } },
  };

  if (model === "gpt-5.2" || model === "gpt-5.1") {
    payload.reasoning = { effort: "none" };
  }

  if (openaiSupportsTemperature(model)) {
    payload.temperature = temperature;
  }

  const response = await openai.responses.create(payload);
  return response.output_text || "";
}


async function gerarComAnthropic(prompt, model, { maxTokens = 1200 } = {}) {
  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (message.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  return text || "";
}

async function gerarComGeminiJson(prompt, model, { temperature = 0.2 } = {}) {
  const genModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
    },
  });

  const result = await genModel.generateContent(prompt);
  return result?.response?.text?.() || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const titulo = asString(req.body?.titulo).trim();
  const provider = asString(req.body?.provider, "openai").trim();
  const model = asString(req.body?.model, "gpt-5-mini").trim();

  if (!titulo) return res.status(400).json({ error: "Campo 'titulo' é obrigatório." });

  const prompt = `Você é um especialista em SEO para YouTube.

Gere metadados otimizados para um vídeo com o título: "${titulo}"

Retorne APENAS um JSON válido (sem markdown, sem explicações) exatamente no formato:
{
  "titulo": "título otimizado com até 100 caracteres, chamativo e SEO-friendly",
  "descricao": "descrição completa de 300-500 caracteres com emojis, hashtags e call-to-action",
  "tags": "tags separadas por vírgula, máximo 15 tags relevantes"
}`;

  try {
    let raw = "";

    switch (provider) {
      case "openai":
        raw = await gerarComOpenAIJson(prompt, model, { temperature: 0.2, maxOutputTokens: 1200 });
        break;
      case "anthropic":
        raw = await gerarComAnthropic(prompt, model, { maxTokens: 1200 });
        break;
      case "gemini":
        raw = await gerarComGeminiJson(prompt, model, { temperature: 0.2 });
        break;
      default:
        return res.status(400).json({ error: "Provedor não suportado" });
    }

    const seo = extractJsonObject(raw);

    // validação mínima
    if (!seo?.titulo || !seo?.descricao || !seo?.tags) {
      throw new Error("JSON veio incompleto (faltando titulo/descricao/tags).");
    }

    return res.status(200).json(seo);
  } catch (err) {
    console.error("Erro ao gerar SEO:", err);
    return res.status(500).json({
      error: err?.message || "Erro interno",
      details: "Verifique as API keys e se o model/provedor está correto.",
    });
  }
}
