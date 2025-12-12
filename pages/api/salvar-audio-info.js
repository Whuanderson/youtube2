import fs from 'fs/promises';
import path from 'path';

/**
 * Salva informações do áudio (paths e durações)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioComSilencio, audioSemSilencio, duracaoAudioComSilencio, duracaoAudioSemSilencio } = req.body;

    const projectRoot = process.cwd();
    const outputDir = path.join(projectRoot, 'output');
    const audioInfoPath = path.join(outputDir, 'audio-info.json');

    const audioInfo = {
      audioComSilencio: audioComSilencio || null,
      audioSemSilencio: audioSemSilencio || null,
      duracaoAudioComSilencio: duracaoAudioComSilencio || 0,
      duracaoAudioSemSilencio: duracaoAudioSemSilencio || 0,
      timestamp: new Date().toISOString(),
    };

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(audioInfoPath, JSON.stringify(audioInfo, null, 2), 'utf-8');

    console.log('💾 Informações de áudio salvas:', audioInfoPath);

    res.status(200).json({ success: true, audioInfo });
  } catch (err) {
    console.error('❌ Erro ao salvar informações de áudio:', err);
    res.status(500).json({ error: err.message });
  }
}
