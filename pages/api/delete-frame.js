import fs from 'fs';
import path from 'path';
import { framesDir, metadataPath } from '../../src/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { framePath } = req.body;

  if (!framePath) {
    return res.status(400).json({ error: 'Missing framePath' });
  }

  try {
    // Extrai apenas o nome do arquivo
    const fileName = path.basename(framePath);
    const fullPath = path.join(framesDir, fileName);

    // Deleta o arquivo se existir
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('🗑️ Arquivo deletado:', fullPath);
    }

    // Atualiza o metadata removendo a cena
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      if (metadata.scenes) {
        metadata.scenes = metadata.scenes.filter(s => s.framePath !== framePath);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log('📝 Metadata atualizado');
      }
    }

    res.status(200).json({ success: true, deleted: fileName });
  } catch (err) {
    console.error('❌ Erro ao deletar frame:', err);
    res.status(500).json({ error: err.message });
  }
}
