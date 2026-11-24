#!/usr/bin/env python3
"""Кадры вязаного воина из поз Романа (GPT): бег — его три позы, удар — его стойка,
у которой рука с иголкой вырезана и повёрнута в плече. Красный — перекраска синих ниток.

Запуск: python3 -I tools/art/warrior_frames.py ПАПКА_С_ПОЗАМИ art/table
В папке: step1.png, stand.png, step2.png (1254x1254, фон прозрачный, лицом влево).
Пишет warrior_<цвет>_<n>.png 256x256: 0 шаг, 1 стойка, 2 другой шаг, 3 замах, 4 укол.
Все кадры на одном холсте, подошвы на одной высоте (SOLE), точка опоры в data/look.json.
"""
import colorsys
import sys

import numpy as np
from PIL import Image

SIZE = 256
CROP = (64, 110, 1124, 1170)  # квадрат 1060x1060 вокруг фигурки во всех позах
SOLE = 1115  # нижний край подошвы в исходных позах: все кадры подтягиваем к нему
# Рука с иголкой: игла выше плеча и рукав до жилета. Кусок руки заходит под жилет на
# OVERLAP точек, чтобы при повороте в плече не было щели.
NEEDLE = (140, 260, 330, 520)
ARM = (140, 515, 455, 705)
EYE = (140, 700, 390, 775)  # ушко иглы под кулаком
OVERLAP = 35
SHOULDER = (450, 610)
# Поза удара: поворот руки в градусах (+ вперёд, к врагу) и сдвиг в исходных точках.
STRIKE = [(-22, (6, -4)), (34, (-30, 8))]
RED_HUE = 0.0  # оттенок красной команды (0..1, 0 — красный)


def sole(a: np.ndarray) -> int:
    ys = np.where(a[:, :, 3] > 200)[0]
    return int(ys.max())


def settle(img: Image.Image) -> Image.Image:
    """Сдвинуть позу по вертикали так, чтобы подошва была на SOLE."""
    dy = SOLE - sole(np.array(img))
    out = Image.new("RGBA", img.size)
    out.paste(img, (0, dy))
    return out


def arm_mask(size, right: int) -> Image.Image:
    m = np.zeros((size[1], size[0]), np.uint8)
    x0, y0, x1, y1 = NEEDLE
    m[y0:y1, x0:x1] = 255
    for x0, y0, x1, y1 in (ARM, EYE):
        m[y0:y1, x0:min(x1, right)] = 255
    return Image.fromarray(m)


def strike(stand: Image.Image, angle: float, shift) -> Image.Image:
    """Стойка с рукой, повёрнутой в плече: тело без руки, сверху рука."""
    empty = Image.new("RGBA", stand.size)
    arm = Image.composite(stand, empty, arm_mask(stand.size, ARM[2]))
    body = Image.composite(empty, stand, arm_mask(stand.size, ARM[2] - OVERLAP))
    arm = arm.rotate(angle, Image.BICUBIC, center=SHOULDER, translate=shift)
    body.alpha_composite(arm)
    return body


def recolor(img: Image.Image, hue: float) -> Image.Image:
    """Синие нитки (шапка, жилет, щит) — в другой оттенок; кожа, штаны, нитки-стежки не трогаем."""
    a = np.array(img).astype(np.float32) / 255
    rgb = a[:, :, :3].reshape(-1, 3)
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in rgb])
    blue = (hsv[:, 0] > 0.55) & (hsv[:, 0] < 0.75) & (hsv[:, 1] > 0.2)
    hsv[blue, 0] = hue
    hsv[blue, 1] = np.minimum(1, hsv[blue, 1] * 1.45)
    hsv[blue, 2] = np.minimum(1, hsv[blue, 2] * 1.2)
    out = np.array([colorsys.hsv_to_rgb(*p) for p in hsv]).reshape(a.shape[0], a.shape[1], 3)
    a[:, :, :3] = out
    return Image.fromarray((a * 255).astype(np.uint8))


def main(src: str, dst: str) -> None:
    pose = {n: settle(Image.open(f"{src}/{n}.png").convert("RGBA")) for n in ("step1", "stand", "step2")}
    frames = [pose["step1"], pose["stand"], pose["step2"]]
    frames += [strike(pose["stand"], ang, sh) for ang, sh in STRIKE]
    for i, f in enumerate(frames):
        small = f.crop(CROP).resize((SIZE, SIZE), Image.LANCZOS)
        small.save(f"{dst}/warrior_blue_{i}.png", optimize=True)
        recolor(small, RED_HUE).save(f"{dst}/warrior_red_{i}.png", optimize=True)
    print(f"кадров: {len(frames)} x 2 цвета, {SIZE}x{SIZE}, опора y = {(SOLE - CROP[1]) / (CROP[3] - CROP[1]):.4f}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
