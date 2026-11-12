"""Crop the supplied aircraft-seat report into isolated narrative visuals.

Input: the canonical PDF rendered at 1600 x 900 with pdftoppm -scale-to 1600.
All boxes use source-render pixels, and every crop stays at native resolution.
These are report-derived concept visuals, not photographs of tested products.
"""
import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# File, physical PDF page, source box (left, top, right, bottom), English caption.
CROPS = [
    ("seat-concept.webp", 25, (813, 79, 1187, 529),
     "Final concept · Three modular aircraft seats"),
    ("teardown.webp", 4, (815, 90, 1154, 450),
     "Reference-seat teardown · Separated frame, cushions and covers"),
    ("primary-frame-development.webp", 19, (171, 196, 789, 623),
     "Primary-frame development · Assembled and exploded CAD views"),
    ("primary-structure.webp", 27, (495, 191, 801, 604),
     "Final primary structure · Lightweight frame and carbon-fibre backrests"),
    ("cushion-exploded.webp", 27, (813, 191, 1123, 604),
     "Secondary-system concept · TPU lattice cushion and removable cover"),
]

# One clean details board, made only from five image panels on physical page 28.
ACCESSORY_BOXES = [
    (478, 113, 775, 244),  # Removable food tray.
    (478, 273, 775, 404),  # rPET device holder.
    (478, 432, 775, 565),  # Adjustable polyester pocket.
    (478, 593, 775, 724),  # USB-C port position.
    (478, 752, 775, 884),  # Proposed QR-code safety information.
]


def source_page(directory, number):
    image = Image.open(directory / f"page-{number:02d}.png").convert("RGB")
    if image.size != (1600, 900):
        raise ValueError(f"Page {number}: expected a 1600 x 900 source render, got {image.size}")
    return image


def save(image, path):
    image.save(path, "WEBP", quality=88, method=6)
    print(f"{path.name}: {image.width} x {image.height}, {path.stat().st_size:,} bytes")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--render-directory", required=True, type=Path)
    parser.add_argument("--output-directory", type=Path,
                        default=ROOT / "assets/projects/soft-signals/aircraft-seat")
    args = parser.parse_args()
    args.output_directory.mkdir(parents=True, exist_ok=True)
    outputs = []
    for filename, page, box, _caption in CROPS:
        output = args.output_directory / filename
        save(source_page(args.render_directory, page).crop(box), output)
        outputs.append(output)

    page = source_page(args.render_directory, 28)
    # Fixed 297 x 133 cells retain every source pixel without scaling panels.
    cell_width, cell_height, gap = 297, 133, 12
    board = Image.new("RGB", (3 * cell_width + 2 * gap, 2 * cell_height + gap), "white")
    for index, box in enumerate(ACCESSORY_BOXES):
        crop = page.crop(box)
        x = (index % 3) * (cell_width + gap)
        y = (index // 3) * (cell_height + gap)
        board.paste(crop, (x, y))
    output = args.output_directory / "accessory-details.webp"
    save(board, output)
    outputs.append(output)
    total = sum(path.stat().st_size for path in outputs)
    if total > 450 * 1024:
        raise ValueError(f"Narrative images exceed the 450 KiB budget: {total:,} bytes")
    print(f"Total: {len(outputs)} images, {total:,} bytes (limit 460,800)")


if __name__ == "__main__":
    main()
