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

function startDownloadWatcherOnce(onDone, timeoutMs = 25000) {
  console.log('[My Whisk Helper] Iniciando watcher de downloads...');

  const root = document.body;
  const clicked = new WeakSet();
  let finished = false;
  let observer;

  const handleNodes = () => {
    const nodes = Array.from(
      document.querySelectorAll(
        '[aria-label="download"], [aria-label="Download"], [aria-label="Baixar"]'
      )
    );

    if (!nodes.length) return;

    console.log(
      `[My Whisk Helper] Encontrados ${nodes.length} elementos com aria-label de download.`
    );

    let anyClicked = false;

    nodes.forEach((node) => {
      const btn = node.closest('button') || node;
      if (clicked.has(btn)) return;
      clicked.add(btn);
      btn.click();
      anyClicked = true;
    });

    if (anyClicked && !finished) {
      finished = true;
      setTimeout(() => {
        if (observer) observer.disconnect();
        console.log('[My Whisk Helper] Downloads clicados, encerrando watcher.');
        onDone?.();
      }, 2000);
    }
  };

  observer = new MutationObserver(handleNodes);
  observer.observe(root, { childList: true, subtree: true });

  // tenta clicar em downloads que já estejam na tela
  handleNodes();

  // timeout de segurança
  setTimeout(() => {
    if (!finished) {
      finished = true;
      if (observer) observer.disconnect();
      console.log(
        '[My Whisk Helper] Timeout de downloads; seguindo para a próxima cena.'
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
        });
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
