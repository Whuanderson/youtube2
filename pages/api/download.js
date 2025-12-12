import fs from 'fs';
import path from 'path';
import { outputDir } from '../../src/config.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const file = req.query.file || 'final.mp4';
  // Permite subpastas como uploads/arquivo.mp3
  const filePath = file.toString().replace(/\.\./g, ''); // Remove .. por segurança
  const resolved = path.join(outputDir, filePath);
  const relative = path.relative(outputDir, resolved);
  if (relative.startsWith('..')) {
    return res.status(400).json({ error: 'Caminho inválido' });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'Arquivo não encontrado: ' + filePath });
  }

  // Detecta tipo MIME baseado na extensão
  const ext = path.extname(resolved).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.webm': 'audio/webm'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  const fileName = path.basename(resolved);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('Accept-Ranges', 'bytes');
  
  const stream = fs.createReadStream(resolved);
  stream.pipe(res);
}
