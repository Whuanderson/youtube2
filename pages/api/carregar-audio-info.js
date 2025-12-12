import fs from 'fs/promises';
import path from 'path';

/**
 * Carrega informações salvas do áudio
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const projectRoot = process.cwd();
    const outputDir = path.join(projectRoot, 'output');
    const audioInfoPath = path.join(outputDir, 'audio-info.json');

    try {
      const content = await fs.readFile(audioInfoPath, 'utf-8');
      const audioInfo = JSON.parse(content);
      
      console.log('📂 Informações de áudio carregadas:', audioInfoPath);
      
      res.status(200).json({ success: true, audioInfo });
    } catch (err) {
      // Arquivo não existe ainda
      if (err.code === 'ENOENT') {
        return res.status(200).json({ success: true, audioInfo: null });
      }
      throw err;
    }
  } catch (err) {
    console.error('❌ Erro ao carregar informações de áudio:', err);
    res.status(500).json({ error: err.message });
  }
}
