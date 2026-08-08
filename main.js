// ---------------- entry point ----------------
const MIN_SPLASH_MS = 700;

function hideSplash(){
  const splash = document.getElementById('splash');
  const root = document.getElementById('root');
  if(splash) splash.classList.add('hide');
  if(root) root.classList.add('ready');
}

async function init(){
  const started = Date.now();

  await initAuth();  // resolves state.user (and history, if logged in) from any existing session
  render();

  // Keep the splash up for a minimum stretch so it doesn't just flicker on
  // fast connections, but never block longer than necessary.
  const elapsed = Date.now() - started;
  setTimeout(hideSplash, Math.max(0, MIN_SPLASH_MS - elapsed));
}

// Wait for the full page load (fonts, Chart.js, etc.) before kicking off
// auth resolution and the first real render.
window.addEventListener('load', init);
