import fs from 'fs';
import path from 'path';

const seoPath = path.join(process.cwd(), 'output', 'seo.json');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { titulo, descricao, tags, categoria } = req.body;

  try {
    const outputDir = path.dirname(seoPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const seo = { titulo, descricao, tags, categoria };
    fs.writeFileSync(seoPath, JSON.stringify(seo, null, 2), 'utf-8');
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar SEO:', err);
    res.status(500).json({ error: err.message });
  }
}
