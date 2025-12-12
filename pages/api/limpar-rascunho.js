import fs from 'fs/promises';
import path from 'path';

/**
 * API para limpar todo o rascunho do vídeo
 * Apaga todos os arquivos salvos e reseta o projeto
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const projectRoot = process.cwd();
    const outputDir = path.join(projectRoot, 'output');

    console.log('🗑️  Limpando rascunho...');

    // Lista de arquivos para deletar
    const filesToDelete = [
      path.join(outputDir, 'roteiro.txt'),
      path.join(outputDir, 'legendas.srt'),
      path.join(outputDir, 'prompts.json'),
      path.join(outputDir, 'scenes.generated.json'),
      path.join(outputDir, 'audio_sem_silencio.mp3'),
      path.join(outputDir, 'final.mp4'),
    ];

    // Diretórios para limpar completamente
    const dirsToClean = [
      path.join(outputDir, 'frames'),
      path.join(outputDir, 'uploads'),
    ];

    // Adiciona audio-info.json à lista de arquivos para deletar
    filesToDelete.push(path.join(outputDir, 'audio-info.json'));

    // Deleta arquivos individuais
    for (const file of filesToDelete) {
      try {
        await fs.unlink(file);
        console.log('   ✅ Deletado:', path.basename(file));
      } catch (err) {
        // Ignora se o arquivo não existe
        if (err.code !== 'ENOENT') {
          console.log('   ⚠️  Erro ao deletar:', path.basename(file), err.message);
        }
      }
    }

    // Limpa diretórios
    for (const dir of dirsToClean) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          await fs.unlink(path.join(dir, file));
        }
        console.log('   ✅ Diretório limpo:', path.basename(dir), `(${files.length} arquivos)`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.log('   ⚠️  Erro ao limpar:', path.basename(dir), err.message);
        }
      }
    }

    console.log('✅ Rascunho limpo com sucesso!');

    res.status(200).json({
      success: true,
      message: 'Rascunho limpo com sucesso',
      deletedFiles: filesToDelete.length,
      cleanedDirs: dirsToClean.length,
    });
  } catch (err) {
    console.error('❌ Erro ao limpar rascunho:', err);
    res.status(500).json({ error: err.message });
  }
}
