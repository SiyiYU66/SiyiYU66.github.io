import {loadTypography} from './typography.js';

const params = new URLSearchParams(location.search);
if (params.get('drawing') === 'ink') {
  let theme = params.get('theme') === 'light' ? 'light' : 'dark';
  // A figure may have been rendered before the visitor changed room themes.
  // Read the current preference when opening it, including cloned reel items.
  try {
    const saved = localStorage.getItem('lr-theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {}
  document.documentElement.dataset.drawing = 'ink';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f2f2f2' : '#171512';
}
if (params.get('surface') === 'navy') {
  document.documentElement.style.setProperty('--image-surface', '#111c35');
  document.querySelector('meta[name="theme-color"]').content = '#111c35';
}
const source = params.get('src') || '';
// Only existing same-origin project media can be displayed here.
const match = /^\/assets\/projects\/([a-z0-9-]+)\/(?:study|report)\/[a-z0-9-]+\.(?:png|webp)$/.exec(source);
if (match) {
  const caption = params.get('caption') || 'Engineering image';
  const image = document.getElementById('image');
  document.title = `${caption} — Listening Room`;
  document.getElementById('caption').textContent = caption;
  const back = document.getElementById('back');
  back.href = `./#project/${match[1]}`;
  back.textContent = '← Back to project';
  image.alt = caption;
  image.src = source;
  image.hidden = false;
  image.addEventListener('error', () => {image.hidden = true; document.getElementById('error').hidden = false;});
} else document.getElementById('error').hidden = false;
loadTypography();
