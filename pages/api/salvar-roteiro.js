import fs from 'fs';
import path from 'path';

const roteiroPath = path.join(process.cwd(), 'output', 'roteiro.txt');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roteiro } = req.body;

  try {
    const outputDir = path.dirname(roteiroPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(roteiroPath, roteiro, 'utf-8');
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar roteiro:', err);
    res.status(500).json({ error: err.message });
  }
}
