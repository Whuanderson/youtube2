import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Remove silêncios de um arquivo de áudio usando FFmpeg
 * Baseado em detecção de silêncio com threshold de -44dB e duração mínima de 0.6s
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
    // Converte URL da API para path do sistema
    let inputPath;
    if (audioPath.startsWith('/api/download?file=')) {
      // Extrai o nome do arquivo da URL: /api/download?file=uploads/arquivo.mp3
      const fileName = audioPath.split('file=')[1];
      inputPath = path.join(process.cwd(), 'output', fileName);
    } else if (audioPath.startsWith('http')) {
      inputPath = path.join(process.cwd(), 'output', path.basename(audioPath));
    } else {
      inputPath = audioPath;
    }

    console.log('🔊 Processando áudio...');
    console.log('   📁 URL recebida:', audioPath);
    console.log('   📁 Path convertido:', inputPath);

    if (!fs.existsSync(inputPath)) {
      console.error('❌ Arquivo não encontrado!');
      console.log('   🔍 Procurando em:', inputPath);
      console.log('   📁 Arquivo existe?', fs.existsSync(inputPath));
      return res.status(404).json({ error: `Arquivo de áudio não encontrado: ${inputPath}` });
    }

    const projectRoot = process.cwd();
    const outputDir = path.join(projectRoot, 'output');
    const outputPath = path.join(outputDir, 'audio_sem_silencio.mp3');
    
    console.log('   🎯 Diretório de saída:', outputDir);

    console.log('🔊 Removendo silêncios do áudio...');
    console.log('   📁 Input:', inputPath);
    console.log('   📁 Output:', outputPath);

    // FFmpeg command para remover silêncios
    // silenceremove: detecta e remove silêncios
    // Parâmetros baseados no código TypeScript fornecido:
    // - stop_periods=-1: remove todos os silêncios
    // - stop_duration=0.6: silêncios de pelo menos 0.6s
    // - stop_threshold=-44dB: threshold de silêncio
    const ffmpegArgs = [
      '-i', inputPath,
      '-af', 'silenceremove=stop_periods=-1:stop_duration=0.6:stop_threshold=-44dB',
      '-y',
      outputPath
    ];

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ FFmpeg error:', stderr);
          reject(new Error('Erro ao processar áudio'));
        } else {
          resolve();
        }
      });

      ffmpeg.on('error', (err) => {
        console.error('❌ FFmpeg spawn error:', err);
        reject(err);
      });
    });

    // Obtém duração do áudio processado
    const duration = await getAudioDuration(outputPath);

    console.log('✅ Silêncios removidos!');
    console.log(`   ⏱️  Duração final: ${duration}s`);

    res.status(200).json({
      success: true,
      audioPath: '/api/download?file=audio_sem_silencio.mp3',
      duration,
      message: 'Silêncios removidos com sucesso'
    });
  } catch (err) {
    console.error('❌ Erro ao remover silêncios:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtém duração do áudio usando ffprobe
 */
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);

    let stdout = '';
    
    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Erro ao obter duração do áudio'));
      } else {
        const duration = parseFloat(stdout.trim());
        resolve(duration);
      }
    });

    ffprobe.on('error', reject);
  });
}
