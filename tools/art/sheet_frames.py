#!/usr/bin/env python3
"""Лист кадров Романа (GPT, сетка колонок x рядов на полупрозрачном фоне) → кадры 256x256 как в пакете
«Ночь на кухне»: опора (128, 222), полупрозрачный фон листа убран, красные — перекраска.

Запуск: python3 -I tools/art/sheet_frames.py ЛИСТ.png КОЛОНОК РЯДОВ МАСШТАБ ИМЯ art/table
Пишет ИМЯ_<цвет>_NN.png. Все ячейки сдвигаются одинаково: движение фигурки внутри ячейки сохраняется.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from warrior_frames import RED_HUE, recolor  # noqa: E402

SIZE, FOOT = 256, (128, 222)
BG = (70, 160)  # прозрачность фона листа ниже первого числа — убрать, до второго — плавно


def clean(cell: Image.Image) -> Image.Image:
    a = np.array(cell).astype(np.float32)
    al = a[:, :, 3]
    a[:, :, 3] = np.clip((al - BG[0]) / (BG[1] - BG[0]), 0, 1) * 255
    return Image.fromarray(a.astype(np.uint8))


def main(path: str, cols: int, rows: int, scale: float, name: str, dst: str) -> None:
    sheet = Image.open(path).convert("RGBA")
    cw, ch = sheet.width / cols, sheet.height / rows
    cells = [clean(sheet.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))))
             for r in range(rows) for c in range(cols)]
    sole = max(int(np.where(np.array(c)[:, :, 3] > 200)[0].max()) for c in cells)
    for i, cell in enumerate(cells):
        small = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.LANCZOS)
        out = Image.new("RGBA", (SIZE, SIZE))
        out.alpha_composite(small, (round(FOOT[0] - cell.width * scale / 2), round(FOOT[1] - sole * scale)))
        out.save(f"{dst}/{name}_blue_{i:02d}.png", optimize=True)
        recolor(out, RED_HUE).save(f"{dst}/{name}_red_{i:02d}.png", optimize=True)
    print(f"{name}: {len(cells)} кадров, масштаб {scale}, подошва листа {sole}")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), sys.argv[5], sys.argv[6])
