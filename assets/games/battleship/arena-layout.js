// One logical resolution for every game screen. Only the host scales it.
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const SHELL_HEIGHT = 768;

export function needsLandscape(width, height, touch) {
  return Boolean(touch) && height > width;
}

export function fitArena(width, height) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const scale = Math.min(w / GAME_WIDTH, h / SHELL_HEIGHT);
  return {scale, angle: 0, width: GAME_WIDTH * scale, height: SHELL_HEIGHT * scale};
}

const screens = new Set(['index', 'multiplayer', 'online', 'Human_VS_BOT', 'Human_VS_Human']);
export function gameScreen(value) {
  const name = String(value || 'index').split('/').pop().replace(/\.html$/, '');
  return screens.has(name) ? name : 'index';
}

// Setup screens can leave immediately. Protect progress only after the actual
// fleet-placement or battle UI has started, in both solo and multiplayer games.
export function shouldConfirmGameExit(screen, phaseClasses = '') {
  const playable = ['Human_VS_BOT', 'Human_VS_Human'].includes(gameScreen(screen));
  return playable && /(?:^|\s)(?:placing-player-[12]|battle-phase)(?=\s|$)/.test(phaseClasses);
}
