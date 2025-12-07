// my-whisk-helper/background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log('My Whisk Helper installed');
});

// Organiza nomes de download (mantém isso!)
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const originalName = item.filename.split('/').pop();
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  const newName = `whisk/${stamp}-${originalName}`;

  suggest({
    filename: newName,
    conflictAction: 'overwrite',
  });
});

// ÚNICO listener de mensagens do background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Pedido vindo do app (painel) para rodar o batch
  if (message.type === 'RUN_BATCH_WITH_SCENES') {
    const scenes = message.scenes || [];

    // 🔍 Procura abas que sejam do domínio labs.google
    chrome.tabs.query({ url: ['https://labs.google/*'] }, (tabs) => {
      const urls = (tabs || []).map((t) => t.url);
      console.log('[My Whisk Helper][bg] Abas labs.google encontradas:', urls);

      // pega a primeira que contenha /tools/whisk
      const whiskTab = tabs.find((t) =>
        (t.url || '').includes('/tools/whisk')
      );

      if (!whiskTab) {
        console.warn('[My Whisk Helper][bg] Nenhuma aba do Whisk encontrada.');
        sendResponse({
          ok: false,
          error: 'Nenhuma aba do Whisk encontrada.',
        });
        return;
      }

      console.log(
        '[My Whisk Helper][bg] Enviando RUN_BATCH_WITH_SCENES para aba:',
        whiskTab.id,
        whiskTab.url
      );

      chrome.tabs.sendMessage(
        whiskTab.id,
        { type: 'RUN_BATCH_WITH_SCENES', scenes },
        (resp) => {
          console.log(
            '[My Whisk Helper][bg] Resposta da aba do Whisk:',
            resp
          );
          sendResponse(resp || { ok: true });
        }
      );
    });

    return true; // resposta assíncrona
  }

});
