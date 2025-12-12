export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Implementar geração de thumbnail com ImageMagick ou Canvas
    res.status(501).json({ 
      error: 'Geração de thumbnail não implementada ainda.',
      message: 'Configure ImageMagick ou use a biblioteca Sharp para processar imagens.'
    });
  } catch (err) {
    console.error('Erro ao gerar thumbnail:', err);
    res.status(500).json({ error: err.message });
  }
}
