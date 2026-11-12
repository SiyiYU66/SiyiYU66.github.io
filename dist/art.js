import {canvasFont} from './typography.js';
export function albumArt(index = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const c = canvas.getContext('2d');
  const colors = ['#bd4634', '#b6bd86', '#e5e2d8', '#303c3a', '#b1c5ca', '#cbc2a8', '#1e272a', '#b5bdcb', '#d6d8cf', '#989c72', '#d2c7b4'];
  c.fillStyle = colors[index % colors.length];
  c.fillRect(0, 0, 1024, 1024);
  if (index === 0) {
    c.fillStyle = '#f2e7d3';
    c.font = canvasFont(23,500);
    c.fillText('SPACES FOR EVERYDAY LIFE', 57, 65);
    c.textAlign = 'right';
    c.fillText('001', 967, 65);
    c.textAlign = 'left';
    c.fillRect(57, 90, 910, 1);
    c.font = canvasFont(140,500);
    c.letterSpacing = '-5px';
    c.fillText('Between', 45, 246);
    c.fillText('Spaces', 45, 376);
    c.letterSpacing = '0px';
    c.save();
    c.translate(514, 675);
    c.rotate(-0.18);
    for (let i = 0; i < 23; i++) {
      const w = 490 - i * 14.5;
      const h = 402 - i * 12;
      c.lineWidth = i === 0 ? 3 : 2;
      c.strokeStyle = i < 4 ? '#e9ddc4' : `rgba(239,226,199,${0.5 + i / 50})`;
      c.beginPath();
      c.roundRect(-w / 2, -h / 2 + i * 3, w, h, [w / 2, w / 2, 3, 3]);
      c.stroke();
    }
    c.restore();
    c.fillStyle = '#f2e7d3';
    c.fillRect(57, 931, 910, 1);
    c.font = canvasFont(24,500);
    c.fillText('BETWEEN SPACES', 57, 982);
    c.font = canvasFont(20);
    c.textAlign = 'right';
    c.fillText('A STUDY IN FINDING YOUR PLACE ↗', 967, 981);
    c.textAlign = 'left';
  } else {
    const light = [3, 6].includes(index);
    const ink = light ? '#d9ded3' : '#303c37';
    c.fillStyle = ink;
    c.font = canvasFont(22,500);
    c.fillText(`LISTENING ROOM / ${[3,4,5].includes(index) ? 'PROJECT' : 'ARCHIVE'} ${String(index + 1).padStart(2, '0')}`, 50, 64);
    c.fillRect(50, 89, 924, 1);
    if (index % 3 === 0) {
      for (let j = 0; j < 14; j++) { c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.arc(510, 538, 330 - j * 18, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#b6bd86';c.beginPath();c.arc(510, 538, 42, 0, Math.PI * 2);c.fill();
    } else if (index % 3 === 1) {
      c.save(); c.translate(512, 520); c.rotate(-Math.PI / 5);
      for (let j = -4; j < 5; j++) { c.globalAlpha = .3 + (j + 4) * .08; c.fillRect(j * 85 - 25, -310, 52, 620); }
      c.restore();
    } else {
      c.lineWidth = 3;
      for (let j = 0; j < 18; j++) { c.strokeStyle = ink; c.beginPath(); c.roundRect(150 + j * 15, 230 + j * 13, 710 - j * 30, 560 - j * 19, [200, 200, 0, 0]);c.stroke(); }
    }
    c.fillStyle = ink;c.font = canvasFont(72,500);
    c.fillText(['', 'Slow forms', 'A quiet place', 'Tally', 'BEADFLOW', 'Running Blade', 'After hours', 'New rituals', 'Open field', 'Still life', 'Future notes'][index], 49, 908);
    c.font = canvasFont(20);c.fillText(index === 3 ? 'TACTILE PAYMENTS / TEAM PROJECT' : 'COLLECTION STUDY / SLEEVE ART', 51, 970);
  }
  // Fine paper grain makes the sleeves feel physical without external textures.
  const pixels = c.getImageData(0, 0, 1024, 1024);
  let seed = 41 + index;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const grain = ((seed >>> 25) / 127 - .5) * 8;
    pixels.data[i] += grain;pixels.data[i + 1] += grain;pixels.data[i + 2] += grain;
  }
  c.putImageData(pixels, 0, 0);
  return canvas;
}


