import fs from 'fs';
import path from 'path';

const srtPath = path.join(process.cwd(), 'output', 'legendas.srt');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { srtContent } = req.body;

  if (!srtContent) {
    return res.status(400).json({ error: 'Conteúdo SRT é obrigatório' });
  }

  try {
    const outputDir = path.dirname(srtPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(srtPath, srtContent, 'utf-8');
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar SRT:', err);
    res.status(500).json({ error: err.message });
  }
}
