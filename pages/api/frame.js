// pages/api/frame.js
import fs from 'fs';
import path from 'path';
import { metadataPath } from '../../src/config.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const index = Number(req.query.index);
  if (Number.isNaN(index) || index < 0) {
    return res.status(400).json({ error: 'index inválido' });
  }

  try {
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'metadata não encontrada' });
    }

    const raw = fs.readFileSync(metadataPath, 'utf8');
    const meta = JSON.parse(raw);
    const scenes = Array.isArray(meta.scenes) ? meta.scenes : [];
    const scene = scenes[index];

    if (!scene || !scene.framePath) {
      return res.status(404).json({ error: 'framePath não encontrado para esta cena' });
    }

    const resolved = scene.framePath;
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'arquivo de imagem não encontrado' });
    }

    const ext = path.extname(resolved).toLowerCase();
    let mime = 'image/jpeg';
    if (ext === '.png') mime = 'image/png';
    if (ext === '.webp') mime = 'image/webp';

    res.setHeader('Content-Type', mime);
    const stream = fs.createReadStream(resolved);
    stream.pipe(res);
  } catch (err) {
    console.error('[/api/frame] Erro:', err);
    return res.status(500).json({ error: err.message });
  }
}
