"""Offline, deterministic surface maps. Color artwork is never an input/output.
Run with Python + Pillow + NumPy when changing the study; committed PNGs are
the build inputs, so ordinary npm builds do not require Python.
"""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

PROJECT_ID = sys.argv[1] if len(sys.argv) > 1 else 'between-spaces'
if not PROJECT_ID or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-_' for c in PROJECT_ID):
    raise ValueError('Use a stable, lowercase project ID.')
SIZE = 1024
seed = int.from_bytes(hashlib.sha256(PROJECT_ID.encode()).digest()[:4], 'little')
rng = np.random.default_rng(seed)
y, x = np.mgrid[:SIZE, :SIZE].astype(np.float64)
x -= (SIZE - 1) / 2
y -= (SIZE - 1) / 2
r = np.hypot(x, y)
radius = r / (SIZE / 2)
fade = np.clip((radius - .2) / .07, 0, 1) * np.clip((1 - radius) / .025, 0, 1)
# A very shallow radial height profile, not a visible ring painted over the art.
RING_PITCH = 8.5
GRAIN_CELL = 4
phase = r * (2 * np.pi / RING_PITCH)
height = np.sin(phase) * .065 * fade
# Correlated 4px grain replaces single-pixel noise: visible as fine granular
# reflection at the actual browsing distance, rather than subpixel shimmer.
coarse = rng.normal(0, 1, (SIZE // GRAIN_CELL, SIZE // GRAIN_CELL)).astype(np.float32)
noise = np.asarray(Image.fromarray(coarse).resize((SIZE, SIZE), Image.Resampling.BICUBIC), dtype=np.float64)
fine = rng.normal(0, 1, (SIZE, SIZE))
height += (noise * .06 + fine * .008) * fade

scratches = []
scratch = Image.new('L', (SIZE, SIZE))
draw = ImageDraw.Draw(scratch)
for _ in range(2):
    distance = float(rng.uniform(.872, .946))
    start = float(rng.uniform(0, 360))
    length = float(rng.uniform(5, 12))
    rr = distance * SIZE / 2
    center = (SIZE - 1) / 2
    draw.arc((center-rr, center-rr, center+rr, center+rr), start, start+length, fill=150, width=1)
    scratches.append({'radius': distance, 'startDegrees': start, 'lengthDegrees': length})
scratch = np.asarray(scratch.filter(ImageFilter.GaussianBlur(.6)), dtype=np.float64) / 255
height -= scratch * .14

# A few shallow coating creases, stable for this project. They only affect the
# normal and roughness maps: never drawn as dark lines on the photograph.
crease_rng = np.random.default_rng(seed ^ 0xC4EA5E)
creases = []
crease_mask = np.zeros((SIZE, SIZE), dtype=np.float64)
for _ in range(3):
    angle = float(crease_rng.uniform(0, 2 * np.pi))
    turn = float(crease_rng.uniform(-.07, .07))
    r0, r1 = float(crease_rng.uniform(.88, .94)), float(crease_rng.uniform(.72, .82))
    points = []
    for t in np.linspace(0, 1, 16):
        radius_t = (1-t)*r0+t*r1
        angle_t = angle + np.sin(t*np.pi)*turn
        points.append(((SIZE-1)/2+np.cos(angle_t)*radius_t*SIZE/2, (SIZE-1)/2+np.sin(angle_t)*radius_t*SIZE/2))
    layer = Image.new('L', (SIZE, SIZE))
    ImageDraw.Draw(layer).line(points, fill=255, width=3)
    ridge = np.asarray(layer.filter(ImageFilter.GaussianBlur(1.8)), dtype=np.float64) / 255
    height += ridge * 1.4 - np.roll(ridge, 4, axis=1) * .85
    crease_mask = np.maximum(crease_mask, ridge)
    creases.append({'angleDegrees': angle*180/np.pi, 'startRadius': r0, 'endRadius': r1, 'bendRadians': turn})
gy, gx = np.gradient(height)
normal = np.stack((-gx, gy, np.ones_like(gx)), axis=-1)
normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
normal = np.clip((normal * .5 + .5) * 255, 0, 255).astype(np.uint8)
# Scalar maps subtly modulate the original .45/.2 roughness values.
roughness = np.clip(.94 + np.sin(phase) * .018 * fade + noise * .035 - scratch * .1 - crease_mask * .12, 0, 1)
coat = np.clip(.91 + np.sin(phase) * .025 * fade + noise * .04 - scratch * .16 - crease_mask * .16, 0, 1)
output = Path(__file__).resolve().parents[1] / 'assets/disc-surfaces' / PROJECT_ID
output.mkdir(parents=True, exist_ok=True)
Image.fromarray(normal).save(output / 'normal.png', optimize=True)
Image.fromarray((roughness * 255).astype(np.uint8)).save(output / 'roughness.png', optimize=True)
Image.fromarray((coat * 255).astype(np.uint8)).save(output / 'coat-roughness.png', optimize=True)
(output / 'manifest.json').write_text(json.dumps({
    'projectId': PROJECT_ID, 'seed': seed, 'size': SIZE,
    'ringPitchPixels': RING_PITCH, 'grainCellPixels': GRAIN_CELL,
    'scratches': scratches, 'creases': creases,
    'colorArtworkModified': False,
    'maps': ['normal.png', 'roughness.png', 'coat-roughness.png']
}, indent=2) + '\n')
print(output)
