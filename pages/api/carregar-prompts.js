import fs from 'fs';
import path from 'path';

const promptsPath = path.join(process.cwd(), 'output', 'prompts.json');

export default async function handler(req, res) {
  try {
    if (fs.existsSync(promptsPath)) {
      const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
      res.status(200).json({ prompts });
    } else {
      res.status(200).json({ prompts: [] });
    }
  } catch (err) {
    console.error('Erro ao carregar prompts:', err);
    res.status(500).json({ error: err.message, prompts: [] });
  }
}
