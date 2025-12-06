// my-whisk-helper/content-app.js

console.log('My Whisk Helper app script loaded (localhost:3000)');

window.addEventListener('MY_WHISK_RUN_BATCH', (event) => {
  const scenes = event.detail?.scenes || [];
  console.log(
    '[My Whisk Helper][app] Evento MY_WHISK_RUN_BATCH com',
    scenes.length,
    'cenas',
  );

  // Envia pro background, que vai falar com a aba do Whisk
  chrome.runtime.sendMessage(
    { type: 'RUN_BATCH_WITH_SCENES', scenes },
    (response) => {
      console.log('[My Whisk Helper][app] Resposta do background:', response);
    },
  );
});
