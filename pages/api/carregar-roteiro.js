import fs from 'fs';
import path from 'path';

const roteiroPath = path.join(process.cwd(), 'output', 'roteiro.txt');

export default async function handler(req, res) {
  try {
    if (fs.existsSync(roteiroPath)) {
      const roteiro = fs.readFileSync(roteiroPath, 'utf-8');
      res.status(200).json({ roteiro });
    } else {
      res.status(200).json({ roteiro: '' });
    }
  } catch (err) {
    console.error('Erro ao carregar roteiro:', err);
    res.status(500).json({ error: err.message });
  }
}
