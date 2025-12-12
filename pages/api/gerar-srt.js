import fs from 'fs';
import path from 'path';

/**
 * Formata segundos para o formato SRT (HH:MM:SS,mmm)
 */
function formatarTempoSRT(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = Math.floor(segundos % 60);
  const milissegundos = Math.floor((segundos % 1) * 1000);

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')},${String(milissegundos).padStart(3, '0')}`;
}

/**
 * Divide texto em blocos de no máximo maxChars caracteres
 * Garante que não corta frases no meio e respeita parágrafos
 */
function splitTextIntoBlocks(text, maxChars) {
  const paragraphs = text.split(/\n\n+/);
  const blocks = [];
  
  for (const para of paragraphs) {
    // Dividir em sentenças (usando pontuação . ! ? como referência)
    const sentences = para.split(/(?<=[.!?])\s+/);
    let currentBlock = '';
    
    for (const sentence of sentences) {
      if (currentBlock.length + sentence.length + 1 <= maxChars) {
        currentBlock = currentBlock ? currentBlock + ' ' + sentence : sentence;
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        
        // Se a sentença sozinha for maior que maxChars, forçar quebra
        if (sentence.length > maxChars) {
          let remainingSentence = sentence;
          while (remainingSentence.length > maxChars) {
            const splitPoint = remainingSentence.lastIndexOf(' ', maxChars);
            const breakPoint = splitPoint === -1 ? maxChars : splitPoint;
            blocks.push(remainingSentence.substring(0, breakPoint));
            remainingSentence = remainingSentence.substring(breakPoint).trim();
          }
          currentBlock = remainingSentence;
        } else {
          currentBlock = sentence;
        }
      }
    }
    
    if (currentBlock) {
      blocks.push(currentBlock);
    }
  }
  
  return blocks;
}

/**
 * Cria conteúdo SRT baseado no texto completo
 * Usa lógica de blocos de até 400 caracteres com 40 segundos cada
 */
function criarConteudoSRT(textoCompleto) {
  const maxCharsPerBlock = 400;
  const secondsPerBlock = 40;
  
  // Dividir texto em blocos respeitando frases
  const blocks = splitTextIntoBlocks(textoCompleto, maxCharsPerBlock);
  
  let subtitles = '';
  let tempoAcumulado = 0;
  
  for (let i = 0; i < blocks.length; i++) {
    const inicio = formatarTempoSRT(tempoAcumulado);
    tempoAcumulado += secondsPerBlock;
    const fim = formatarTempoSRT(tempoAcumulado);
    
    subtitles += `${i + 1}\n`;
    subtitles += `${inicio} --> ${fim}\n`;
    subtitles += `${blocks[i]}\n\n`;
  }
  
  return {
    srtContent: subtitles,
    blocosTotal: blocks.length,
    duracaoTotalSegundos: tempoAcumulado,
    blocos: blocks
  };
}

/**
 * Cria conteúdo SRT ajustado para duração específica
 */
function criarConteudoSRTComDuracao(textoCompleto, duracaoTotalSegundos) {
  const totalCaracteres = textoCompleto.length;
  
  // Calcula quantos blocos cabem na duração
  const secondsPerBlock = 40;
  const totalBlocos = Math.ceil(duracaoTotalSegundos / secondsPerBlock);
  
  // Calcula caracteres por bloco para distribuir uniformemente
  const charsPerBlock = Math.ceil(totalCaracteres / totalBlocos);
  
  // Divide texto em blocos
  const blocks = splitTextIntoBlocks(textoCompleto, charsPerBlock);
  
  let subtitles = '';
  let tempoAcumulado = 0;
  
  for (let i = 0; i < blocks.length; i++) {
    const inicio = formatarTempoSRT(tempoAcumulado);
    tempoAcumulado += secondsPerBlock;
    const fim = formatarTempoSRT(tempoAcumulado);
    
    subtitles += `${i + 1}\n`;
    subtitles += `${inicio} --> ${fim}\n`;
    subtitles += `${blocks[i]}\n\n`;
  }
  
  return {
    srtContent: subtitles,
    blocosTotal: blocks.length,
    duracaoTotalSegundos: tempoAcumulado,
    blocos: blocks
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roteiro, duracaoMinutos } = req.body;

  if (!roteiro) {
    return res.status(400).json({ error: 'Roteiro é obrigatório' });
  }

  try {
    let resultado;
    
    if (duracaoMinutos) {
      // Gera SRT baseado na duração específica
      const duracaoSegundos = duracaoMinutos * 60;
      resultado = criarConteudoSRTComDuracao(roteiro, duracaoSegundos);
    } else {
      // Gera SRT automático (padrão)
      resultado = criarConteudoSRT(roteiro);
    }
    
    // Salva arquivo SRT
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const srtPath = path.join(outputDir, 'legendas.srt');
    fs.writeFileSync(srtPath, resultado.srtContent, 'utf-8');
    
    console.log(`✅ SRT gerado com ${resultado.blocosTotal} blocos (${Math.floor(resultado.duracaoTotalSegundos / 60)}m ${resultado.duracaoTotalSegundos % 60}s)`);
    
    res.status(200).json({
      success: true,
      srtPath,
      srtContent: resultado.srtContent,
      blocos: resultado.blocosTotal,
      duracaoSegundos: resultado.duracaoTotalSegundos,
      duracaoMinutos: (resultado.duracaoTotalSegundos / 60).toFixed(1),
      blocosTexto: resultado.blocos
    });
  } catch (err) {
    console.error('Erro ao gerar SRT:', err);
    res.status(500).json({ error: err.message });
  }
}
