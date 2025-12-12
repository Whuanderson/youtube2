import { metadataPath } from '../../src/config.js';
import fs from 'fs';

export default async function handler(req, res) {
  try {
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      const audioPath = metadata.audioPath || '';
      res.status(200).json({ audioPath });
    } else {
      res.status(200).json({ audioPath: '' });
    }
  } catch (err) {
    console.error('Erro ao carregar áudio:', err);
    res.status(500).json({ error: err.message });
  }
}
