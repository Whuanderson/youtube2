import fs from 'fs';
import path from 'path';

const srtPath = path.join(process.cwd(), 'output', 'legendas.srt');

export default async function handler(req, res) {
  try {
    if (!fs.existsSync(srtPath)) {
      return res.status(200).json({ 
        success: false,
        message: 'Nenhum SRT gerado ainda' 
      });
    }

    const srtContent = fs.readFileSync(srtPath, 'utf-8');
    
    // Conta blocos (cada bloco tem um número no início)
    const blocos = (srtContent.match(/^\d+$/gm) || []).length;
    
    // Extrai última marcação de tempo para calcular duração
    const matches = srtContent.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g);
    let duracaoSegundos = 0;
    
    if (matches && matches.length > 0) {
      const ultimoTempo = matches[matches.length - 1];
      const [hms, ms] = ultimoTempo.split(',');
      const [h, m, s] = hms.split(':').map(Number);
      duracaoSegundos = h * 3600 + m * 60 + s + parseInt(ms) / 1000;
    }

    res.status(200).json({
      success: true,
      srtContent,
      blocos,
      duracaoSegundos: Math.floor(duracaoSegundos),
      duracaoMinutos: (duracaoSegundos / 60).toFixed(1),
      srtPath
    });
  } catch (err) {
    console.error('Erro ao carregar info do SRT:', err);
    res.status(500).json({ error: err.message });
  }
}
