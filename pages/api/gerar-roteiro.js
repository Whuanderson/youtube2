import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function asString(v, fallback = "") {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function openaiSupportsTemperature(model) {
  // gpt-5-mini / gpt-5-nano / gpt-5 (e outros reasoning) não suportam temperature
  // temperature só rola no gpt-5.2 (e 5.1) quando reasoning.effort = "none"
  return (
    model.startsWith("gpt-4o") ||
    model.startsWith("gpt-4.1") ||
    model === "gpt-5.2" ||
    model === "gpt-5.1"
  );
}

async function gerarComOpenAI(prompt, model, { temperature = 0.7, maxOutputTokens = 4000 } = {}) {
  const payload = {
    model,
    input: prompt,
    max_output_tokens: maxOutputTokens,
  };

  // Se for gpt-5.2/5.1 e você quiser temperature, precisa colocar reasoning effort = none
  if (model === "gpt-5.2" || model === "gpt-5.1") {
    payload.reasoning = { effort: "none" };
  }

  if (openaiSupportsTemperature(model)) {
    payload.temperature = temperature;
  }

  const response = await openai.responses.create(payload);
  return response.output_text || "";
}


async function gerarComAnthropic(prompt, model, { maxTokens = 4000 } = {}) {
  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  // Claude retorna array de blocos; juntamos só texto
  const text = (message.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  return text || "";
}

async function gerarComGemini(prompt, model, { temperature = 0.7 } = {}) {
  const genModel = genAI.getGenerativeModel({
    model,
    generationConfig: { temperature },
  });

  const result = await genModel.generateContent(prompt);
  return result?.response?.text?.() || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tema = asString(req.body?.tema).trim();
  const duracao = parseInt(req.body?.duracao) || 1; // duração em minutos
  const quantidadeImagens = parseInt(req.body?.quantidadeImagens) || 4;
  const tom = asString(req.body?.tom).trim();
  const provider = asString(req.body?.provider, "openai").trim();
  const model = asString(req.body?.model, "gpt-5-mini").trim();

  if (!tema) return res.status(400).json({ error: "Campo 'tema' é obrigatório." });

  const duracaoSegundos = duracao * 60;

  const promptRoteiro = `Crie um roteiro detalhado para um vídeo do YouTube com as seguintes especificações:

Tema: ${tema}
Duração: ${duracao} minuto(s) (${duracaoSegundos} segundos)
Tom: ${tom || "neutro"}

O roteiro deve incluir:
1. Introdução impactante (10% da duração)
2. Desenvolvimento completo com pontos-chave (70% da duração)
3. Conclusão com call-to-action (20% da duração)
4. Marcações de tempo para cada seção

Formato: Texto corrido, natural para narração, sem colchetes e sem formatação excessiva. Seja direto e engajante.`;

  const promptImagens = `Baseado no tema "${tema}", crie EXATAMENTE ${quantidadeImagens} prompts para gerar imagens que acompanhem o vídeo.

Cada prompt deve:
- Ser descritivo e específico para Whisk/Midjourney
- Estar relacionado ao tema do vídeo
- Ser visualmente interessante
- Ter entre 10-20 palavras

Retorne APENAS um array JSON com os prompts, sem explicações:
["prompt 1", "prompt 2", ...]`;

  try {
    let roteiro = "";
    let promptsResposta = "";

    switch (provider) {
      case "openai":
        roteiro = await gerarComOpenAI(promptRoteiro, model, { temperature: 0.7, maxOutputTokens: 5000 });
        promptsResposta = await gerarComOpenAI(promptImagens, model, { temperature: 0.8, maxOutputTokens: 1000 });
        break;
      case "anthropic":
        roteiro = await gerarComAnthropic(promptRoteiro, model, { maxTokens: 4000 });
        promptsResposta = await gerarComAnthropic(promptImagens, model, { maxTokens: 1000 });
        break;
      case "gemini":
        roteiro = await gerarComGemini(promptRoteiro, model, { temperature: 0.7 });
        promptsResposta = await gerarComGemini(promptImagens, model, { temperature: 0.8 });
        break;
      default:
        return res.status(400).json({ error: "Provedor não suportado" });
    }

    // Extrai array JSON dos prompts
    let prompts = [];
    try {
      const jsonMatch = promptsResposta.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.error("Erro ao parsear prompts:", err);
      // Fallback: tenta dividir por linhas
      prompts = promptsResposta
        .split('\n')
        .filter(line => line.trim() && !line.includes('[') && !line.includes(']'))
        .map(line => line.replace(/^["\d\.\-\*\s]+/, '').replace(/["]+$/, '').trim())
        .filter(line => line.length > 10);
    }

    return res.status(200).json({ roteiro, prompts });
  } catch (err) {
    console.error("Erro ao gerar roteiro:", err);
    return res.status(500).json({
      error: err?.message || "Erro interno",
      details: "Verifique as API keys e se o model/provedor está correto.",
    });
  }
}
