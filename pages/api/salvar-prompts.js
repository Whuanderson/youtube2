import fs from 'fs';
import path from 'path';

const promptsPath = path.join(process.cwd(), 'output', 'prompts.json');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompts } = req.body;

  try {
    const outputDir = path.dirname(promptsPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2), 'utf-8');
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar prompts:', err);
    res.status(500).json({ error: err.message });
  }
}
