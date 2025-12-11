// pages/api/frame.js
import fs from 'fs';
import path from 'path';
import { metadataPath } from '../../src/config.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { index, path: framePath } = req.query;

  // Modo 1: Buscar por path direto (novo - tempo real)
  if (framePath) {
    try {
      if (!fs.existsSync(framePath)) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }

      const ext = path.extname(framePath).toLowerCase();
      let mime = 'image/jpeg';
      if (ext === '.png') mime = 'image/png';
      if (ext === '.webp') mime = 'image/webp';

      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      const stream = fs.createReadStream(framePath);
      stream.pipe(res);
      return;
    } catch (err) {
      console.error('[/api/frame] Erro (path mode):', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // Modo 2: Buscar por index no metadata (legado)
  const idx = Number(index);
  if (Number.isNaN(idx) || idx < 0) {
    return res.status(400).json({ error: 'index ou path inválido' });
  }

  try {
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'metadata não encontrada' });
    }

    const raw = fs.readFileSync(metadataPath, 'utf8');
    const meta = JSON.parse(raw);
    const scenes = Array.isArray(meta.scenes) ? meta.scenes : [];
    const scene = scenes[idx];

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
