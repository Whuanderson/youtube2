import fs from 'fs';
import path from 'path';

const thumbnailPath = path.join(process.cwd(), 'output', 'thumbnail-info.json');

export default async function handler(req, res) {
  try {
    if (fs.existsSync(thumbnailPath)) {
      const data = JSON.parse(fs.readFileSync(thumbnailPath, 'utf-8'));
      res.status(200).json(data);
    } else {
      res.status(200).json({ thumbnailPath: '' });
    }
  } catch (err) {
    console.error('Erro ao carregar thumbnail:', err);
    res.status(500).json({ error: err.message });
  }
}
