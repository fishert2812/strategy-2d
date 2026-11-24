#!/usr/bin/env python3
"""Кадры вязаного воина из поз Романа (GPT): бег — его три позы, удар — его стойка,
у которой рука с иголкой вырезана и повёрнута в плече. Красный — перекраска синих ниток.

Запуск: python3 -I tools/art/warrior_frames.py ПАПКА_С_ПОЗАМИ art/table
В папке: step1.png, stand.png, step2.png (1254x1254, фон прозрачный, лицом влево).
Пишет warrior_<цвет>_<n>.png 256x256: 0 шаг, 1 стойка, 2 другой шаг, 3 замах, 4 укол.
Все кадры на одном холсте, подошвы на одной высоте (SOLE), точка опоры в data/look.json.
"""
import sys

import numpy as np
from PIL import Image

SIZE = 256
CROP = (4, 110, 1064, 1170)  # квадрат 1060x1060 вокруг фигурки во всех позах
SOLE = 1115  # нижний край подошвы в исходных позах: все кадры подтягиваем к нему
# Рука с иголкой: игла выше плеча и рукав до жилета. Кусок руки заходит под жилет на
# OVERLAP точек, чтобы при повороте в плече не было щели.
NEEDLE = (140, 260, 330, 520)
ARM = (140, 515, 455, 705)
EYE = (140, 700, 390, 775)  # ушко иглы под кулаком
OVERLAP = 70
SHOULDER = (450, 610)
# Поза удара: поворот руки в градусах (+ вперёд, к врагу) и сдвиг в исходных точках.
STRIKE = [(-22, (6, -4)), (16, (-45, 0))]
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


def _hsv(rgb: np.ndarray) -> np.ndarray:
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn + 1e-9
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    return np.stack([h, np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0), mx], -1)


def _rgb(hsv: np.ndarray) -> np.ndarray:
    h, s, v = hsv[..., 0] * 6, hsv[..., 1], hsv[..., 2]
    i, f = np.floor(h) % 6, h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.zeros(hsv.shape)
    for k, c in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        for j in range(3):
            out[..., j] = np.where(i == k, c[j], out[..., j])
    return out


# Перекраска в красную команду: синяя ткань GPT тёмная и серая, поэтому красный делаем
# заметно насыщеннее и светлее, чтобы на телефоне он не сливался с синим и не уходил в бордовый.
BLUE = (0.52, 0.78, 0.10)  # оттенок от, до и наименьшая насыщенность синих ниток
RED_S = (0.55, 1.3, 0.92)  # насыщенность красного: основа, рост от исходной, потолок
RED_V = (1.6, 0.08)  # яркость красного: множитель и прибавка


def recolor(img: Image.Image, hue: float) -> Image.Image:
    """Синие нитки (шапка, жилет, щит, ткань построек) — в яркий красный; кожа, дерево, стежки не трогаем."""
    a = np.array(img).astype(np.float64) / 255
    hsv = _hsv(a[..., :3])
    blue = (hsv[..., 0] > BLUE[0]) & (hsv[..., 0] < BLUE[1]) & (hsv[..., 1] > BLUE[2])
    hsv[..., 0] = np.where(blue, hue, hsv[..., 0])
    hsv[..., 1] = np.where(blue, np.minimum(RED_S[2], RED_S[0] + (hsv[..., 1] - BLUE[2]) * RED_S[1]), hsv[..., 1])
    hsv[..., 2] = np.where(blue, np.minimum(1, hsv[..., 2] * RED_V[0] + RED_V[1]), hsv[..., 2])
    a[..., :3] = _rgb(hsv)
    return Image.fromarray((a * 255).round().astype(np.uint8))


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
