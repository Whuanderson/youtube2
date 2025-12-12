export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { titulo } = req.body;

  try {
    // TODO: Integrar com OpenAI para gerar SEO otimizado
    // Por enquanto retorna template
    const seo = {
      titulo,
      descricao: `${titulo}

Neste vídeo, você vai descobrir tudo sobre o tema. Não perca!

📌 Tópicos abordados:
• Introdução completa
• Dicas práticas
• Exemplos reais

👉 Inscreva-se no canal e ative o sininho para não perder nenhum conteúdo!

#tutorial #dicas #${titulo.split(' ').slice(0, 3).join(' #')}`,
      tags: titulo.toLowerCase().split(' ').slice(0, 10).join(', ')
    };

    res.status(200).json(seo);
  } catch (err) {
    console.error('Erro ao gerar SEO:', err);
    res.status(500).json({ error: err.message });
  }
}
