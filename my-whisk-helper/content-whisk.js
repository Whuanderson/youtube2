// content-whisk.js

console.log('My Whisk Helper content script loaded');

// ---------- helpers de DOM ----------

let isRunningBatch = false;

function findPromptBox() {
  return (
    document.querySelector('textarea') ||
    document.querySelector('[data-testid="prompt-input"]') ||
    document.querySelector('div[contenteditable="true"]')
  );
}

function setPromptInBox(prompt) {
  const box = findPromptBox();
  if (!box) {
    console.warn('[My Whisk Helper] campo de prompt não encontrado.');
    return false;
  }

  if (box.tagName === 'TEXTAREA') {
    box.focus();
    box.value = prompt;
    box.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt,
      })
    );
  } else {
    // contenteditable
    box.focus();
    box.innerText = prompt;
    box.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt,
      })
    );
  }

  console.log('[My Whisk Helper] Prompt aplicado:', prompt);
  return true;
}

function clickGenerateButton() {
  const btn =
    document.querySelector('button[aria-label="Enviar comando"]') ||
    document.querySelector('button[aria-label="Generate"]') ||
    document.querySelector('button[aria-label="Gerar"]') ||
    document.querySelector('button[data-testid="generate-button"]');

  if (!btn) {
    console.warn('[My Whisk Helper] Botão de gerar não encontrado.');
    return false;
  }

  btn.click();
  console.log('[My Whisk Helper] Cliquei no botão de gerar.');
  return true;
}




function findDownloadButtons() {
  const btns = Array.from(document.querySelectorAll('button'));
  return btns.filter((btn) => {
    const text = (btn.textContent || '').trim().toLowerCase();
    return text === 'download' || text.includes('download');
  });
}

function findImageForButton(btn) {
  // Sobe na árvore de DOM procurando o primeiro <img> relevante
  let node = btn;
  while (node && node !== document.body) {
    if (node.querySelector) {
      const img =
        node.querySelector('img') ||
        node.querySelector('picture img');
      if (img) return img;
    }
    node = node.parentElement;
  }
  return null;
}

function startDownloadWatcherOnce(onDone, timeoutMs = 25000, expectedDownloads = 1) {
  console.log('[My Whisk Helper] Iniciando watcher de downloads...');

  const root = document.body;

  // Botões de download que já existiam ANTES desta cena
  const existingButtons = new Set(findDownloadButtons());

  // Controle desta cena
  const clickedButtons = new WeakSet();
  const clickedImages = new WeakSet(); // ⬅️ dedupe por <img>
  let clickedCount = 0;
  let finished = false;
  let observer;

  const handleNodes = () => {
    const all = findDownloadButtons();

    // Candidatos = botões que surgiram depois + ainda não clicados
    const candidates = all.filter(
      (btn) => !existingButtons.has(btn) && !clickedButtons.has(btn),
    );

    if (!candidates.length) return;

    console.log(
      `[My Whisk Helper] Encontrados ${candidates.length} novos botões de download.`,
    );

    candidates.forEach((btn) => {
      const imgEl = findImageForButton(btn);

      // Se já baixamos essa imagem (mesmo que haja vários botões), pula
      if (imgEl && clickedImages.has(imgEl)) {
        return;
      }

      clickedButtons.add(btn);
      if (imgEl) clickedImages.add(imgEl);

      clickedCount += 1;
      console.log('[My Whisk Helper] Clicando download #', clickedCount);
      btn.click();
    });

    // Já clicamos o número esperado de imagens desta cena?
    if (!finished && clickedCount >= expectedDownloads) {
      finished = true;
      setTimeout(() => {
        if (observer) observer.disconnect();
        console.log(
          '[My Whisk Helper] Downloads desta cena concluídos, encerrando watcher.',
        );
        onDone?.();
      }, 2000);
    }
  };

  observer = new MutationObserver(handleNodes);
  observer.observe(root, { childList: true, subtree: true });

  // Timeout de segurança
  setTimeout(() => {
    if (!finished) {
      finished = true;
      if (observer) observer.disconnect();
      console.log(
        '[My Whisk Helper] Timeout de downloads; seguindo para a próxima cena.',
      );
      onDone?.();
    }
  }, timeoutMs);
}



// ---------- batch controlado pelo painel ----------

async function runBatchCore(scenes) {
  if (isRunningBatch) {
    console.log('[My Whisk Helper] Já existe um batch em execução, ignorando novo pedido.');
    return;
  }

  isRunningBatch = true;
  console.log(`[My Whisk Helper] Rodando batch com ${scenes.length} cenas.`);

  try {
    for (let i = 0; i < scenes.length; i += 1) {
      const scene = scenes[i];
      const label = `Cena ${i + 1}/${scenes.length}: ${scene.prompt || ''}`;
      console.log('[My Whisk Helper]', label);

      const ok = setPromptInBox(scene.prompt || '');
      if (!ok) {
        console.warn('[My Whisk Helper] Não foi possível aplicar o prompt, pulando cena.');
        continue;
      }

      clickGenerateButton();

      // espera downloads dessa cena
      await new Promise((resolve) => {
        startDownloadWatcherOnce(() => {
          setTimeout(resolve, 3000); // respiro depois do clique nos downloads
        }, 25000, 2); // ⬅️ 2 downloads por cena (Whisk gera 2 imagens)
      });

      // pequeno intervalo entre cenas
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log('[My Whisk Helper] Batch concluído.');
  } finally {
    isRunningBatch = false;
  }
}

// ---------- listener de mensagens ----------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[My Whisk Helper] Mensagem recebida:', message);

  // ainda permite o uso direto do popup (um prompt só)
  if (message.type === 'SET_WHISK_PROMPT') {
  const ok = setPromptInBox(message.prompt || '');
  if (ok && message.autoGenerate) {
    clickGenerateButton();
    // aqui basta 1 imagem:
    startDownloadWatcherOnce();
  }
  sendResponse?.({ ok });
  return;
}

  // chamado pelo background quando o painel clicar em "Gerar frames"
  if (message.type === 'RUN_BATCH_WITH_SCENES') {
    const scenes = message.scenes || [];
    if (!scenes.length) {
      console.log(
        '[My Whisk Helper] Nenhuma cena recebida em RUN_BATCH_WITH_SCENES.'
      );
      sendResponse?.({ ok: false, error: 'Sem cenas' });
      return;
    }

    runBatchCore(scenes)
      .then(() => sendResponse?.({ ok: true }))
      .catch((err) => {
        console.error('[My Whisk Helper] Erro no batch:', err);
        sendResponse?.({ ok: false, error: err.message });
      });

    return true; // resposta assíncrona
  }
});
