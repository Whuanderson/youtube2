import fs from 'fs';
import path from 'path';

const seoPath = path.join(process.cwd(), 'output', 'seo.json');

export default async function handler(req, res) {
  try {
    if (fs.existsSync(seoPath)) {
      const seo = JSON.parse(fs.readFileSync(seoPath, 'utf-8'));
      res.status(200).json(seo);
    } else {
      res.status(200).json({});
    }
  } catch (err) {
    console.error('Erro ao carregar SEO:', err);
    res.status(500).json({ error: err.message });
  }
}
