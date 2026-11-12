document.documentElement.classList.add('game-surface');
let mobileRender = matchMedia('(any-pointer:coarse)').matches;
try { mobileRender ||= parent.document.documentElement.dataset.gameRenderProfile === 'mobile'; } catch {}
document.documentElement.dataset.renderProfile = mobileRender ? 'mobile' : 'desktop';

// The parent owns a single confirmation above the scaled game. Capture before
// the original link/button handlers so a cancelled request cannot leave a room.
(() => {
  let pending = null;
  let bypass = null;
  let serial = 0;
  const selector = '.nav-home-btn,#btn-cancel,#btn-leave';
  document.addEventListener('click', event => {
    const target = event.target?.closest?.(selector);
    if (!target || window.parent === window) return;
    if (bypass === target) { bypass = null; return; }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending) return;
    const requestId = `navigation-${Date.now().toString(36)}-${++serial}`;
    pending = {requestId, target};
    window.parent.postMessage({
      type:'battleship:request-navigation',
      requestId,
      kind:target.matches('.nav-home-btn') ? 'menu' : 'leave-room'
    }, location.origin);
  }, true);
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== location.origin ||
        event.data?.type !== 'battleship:navigation-answer' ||
        !pending || event.data.requestId !== pending.requestId) return;
    const {target} = pending;
    pending = null;
    if (event.data.approved !== true || target.isConnected === false || target.disabled) return;
    bypass = target;
    try { target.click(); } finally { bypass = null; }
  });
  window.addEventListener('pagehide', () => { pending = null; bypass = null; });
})();
// Keep direct game links in the same landscape host as the portfolio entry.
if (window.top === window.self) {
  const allowed = ['index','multiplayer','online','Human_VS_BOT','Human_VS_Human'];
  const name = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  if (allowed.includes(name)) location.replace(`./arena.html?screen=${name}`);
}
