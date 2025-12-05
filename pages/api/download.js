import fs from 'fs';
import path from 'path';
import { outputDir } from '../../src/config.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const file = req.query.file || 'final.mp4';
  const safeName = path.basename(file.toString());
  const resolved = path.join(outputDir, safeName);
  const relative = path.relative(outputDir, resolved);
  if (relative.startsWith('..')) {
    return res.status(400).json({ error: 'Caminho inválido' });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  const stream = fs.createReadStream(resolved);
  stream.pipe(res);
}
