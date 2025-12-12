import fs from 'fs';
import path from 'path';

const roteiroPath = path.join(process.cwd(), 'output', 'roteiro.txt');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tema, duracao, tom } = req.body;

  try {
    // TODO: Integrar com OpenAI GPT-4 ou Claude
    // Por enquanto, retorna um template
    const roteiro = `[ROTEIRO GERADO COM IA]

Tema: ${tema}
Duração: ${duracao}s
Tom: ${tom}

[INTRODUÇÃO - 0-10s]
Olá! Hoje vamos falar sobre ${tema}. Prepare-se para uma jornada incrível!

[DESENVOLVIMENTO - 10-${duracao - 10}s]
Este é o conteúdo principal do vídeo. Aqui você desenvolverá o tema com detalhes, exemplos práticos e dicas valiosas.

[CONCLUSÃO - ${duracao - 10}-${duracao}s]
E é isso! Se você gostou deste vídeo, não esqueça de curtir, comentar e se inscrever no canal. Até a próxima!

---
Prompts sugeridos para imagens:
1. "Intro dinâmica com logo e título: ${tema}"
2. "Explicação visual do conceito principal"
3. "Exemplo prático e aplicação real"
4. "Call to action com botão de inscrição"
`;

    res.status(200).json({ roteiro });
  } catch (err) {
    console.error('Erro ao gerar roteiro:', err);
    res.status(500).json({ error: err.message });
  }
}
