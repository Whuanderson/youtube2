export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Integrar com YouTube Data API v3
    // Requer OAuth2 e configuração do Google Cloud Console
    res.status(501).json({ 
      error: 'Publicação no YouTube não implementada ainda.',
      message: 'Configure YouTube Data API v3 com OAuth2 no Google Cloud Console.'
    });
  } catch (err) {
    console.error('Erro ao publicar no YouTube:', err);
    res.status(500).json({ error: err.message });
  }
}
