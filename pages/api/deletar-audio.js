import fs from 'fs/promises';
import path from 'path';

/**
 * Deleta arquivo de áudio e limpa info salva
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audioPath } = req.body;

  if (!audioPath) {
    return res.status(400).json({ error: 'audioPath é obrigatório' });
  }

  try {
    const projectRoot = process.cwd();
    
    // Remove de public/audio/
    if (audioPath.startsWith('/audio/')) {
      const fileName = path.basename(audioPath);
      const publicPath = path.join(projectRoot, 'public', 'audio', fileName);
      
      try {
        await fs.unlink(publicPath);
        console.log('🗑️  Arquivo deletado de public/audio:', fileName);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error('❌ Erro ao deletar arquivo público:', err);
        }
      }
    }
    
    // Remove de output/uploads/
    if (audioPath.startsWith('/api/download?file=uploads/')) {
      const fileName = audioPath.split('file=uploads/')[1];
      const uploadsPath = path.join(projectRoot, 'output', 'uploads', fileName);
      
      try {
        await fs.unlink(uploadsPath);
        console.log('🗑️  Arquivo deletado de output/uploads:', fileName);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error('❌ Erro ao deletar arquivo de uploads:', err);
        }
      }
    }
    
    // Limpa audio-info.json
    const audioInfoPath = path.join(projectRoot, 'output', 'audio-info.json');
    try {
      await fs.unlink(audioInfoPath);
      console.log('🗑️  audio-info.json deletado');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('❌ Erro ao deletar audio-info:', err);
      }
    }

    console.log('✅ Áudio deletado com sucesso');

    res.status(200).json({
      success: true,
      message: 'Áudio deletado com sucesso',
    });
  } catch (err) {
    console.error('❌ Erro ao deletar áudio:', err);
    res.status(500).json({ error: err.message });
  }
}
