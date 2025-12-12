export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { texto, voz, velocidade } = req.body;

  try {
    // TODO: Integrar com Azure TTS, ElevenLabs, ou Google TTS
    // Por enquanto retorna erro informativo
    res.status(501).json({ 
      error: 'TTS não implementado ainda. Configure Azure TTS ou ElevenLabs API.',
      message: 'Use a funcionalidade de upload de áudio por enquanto.'
    });
  } catch (err) {
    console.error('Erro ao gerar TTS:', err);
    res.status(500).json({ error: err.message });
  }
}
