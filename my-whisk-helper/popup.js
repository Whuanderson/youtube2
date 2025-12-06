// my-whisk-helper/popup.js
const promptEl = document.getElementById('prompt');
const sendBtn = document.getElementById('send');
const batchBtn = document.getElementById('run-batch');

// 1) Modo manual: prompt digitado
sendBtn.addEventListener('click', async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) return;

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  chrome.tabs.sendMessage(tab.id, {
    type: 'SET_WHISK_PROMPT',
    prompt,
    ratio: 'landscape',
    autoGenerate: true,
  });
});

// 2) Modo batch: consumir cenas do app
batchBtn.addEventListener('click', async () => {
  const API_URL = 'http://localhost:3000/api/scenes'; // ajuste porta se precisar

  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error('Erro ao buscar cenas');

    const json = await resp.json();
    const scenes = Array.isArray(json) ? json : json.scenes || [];

    if (!Array.isArray(scenes) || scenes.length === 0) {
      alert('Nenhuma cena encontrada em /api/scenes');
      return;
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Envia uma cena por vez, com delay entre elas
    for (let i = 0; i < scenes.length; i += 1) {
      const scene = scenes[i];
      const prompt = scene.prompt || '';

      if (!prompt) continue;

      console.log('[My Whisk Helper] Enviando cena', i, prompt);

      await new Promise((resolve) => {
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: 'SET_WHISK_PROMPT',
            prompt,
            ratio: 'landscape',
            autoGenerate: true,
          },
          () => {
            // espera o Whisk gerar e baixar antes da próxima
            setTimeout(resolve, 12000); // 12s – ajuste se precisar de mais/menos
          },
        );
      });
    }

    alert('Batch concluído: prompts enviados ao Whisk. Agora volte pro app e importe as imagens.');
  } catch (err) {
    console.error('[My Whisk Helper] Erro no batch:', err);
    alert('Erro ao rodar batch. Veja o console da extensão.');
  }
});
