#!/usr/bin/env python3
"""Пакет Романа «Ночь на кухне» (GPT, раскадровка) → art/table: синие кадры как есть, красные — перекраска.

Запуск: python3 -I tools/art/pack_import.py ПАПКА_ПАКЕТА art/table
Кадры не обрезаем: у всех человечков один холст 256x256 и опора (128, 222), у построек 512x512.
Пишет nk_warrior_<цвет>_NN.png (00–07 шаг, 08 стойка, 09 замах, 10 удар) и nk_<постройка>_<цвет>.png.
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from warrior_frames import RED_HUE, recolor  # noqa: E402

WARRIOR = [f"units/warrior/walk/{i:02d}.png" for i in range(8)] + [
    "units/warrior/idle.png", "units/warrior/windup.png", "units/warrior/hit.png"]
BUILDINGS = {"camp": "buildings/camp_blue.png", "barracks": "buildings/barracks_blue.png",
             "hq": "buildings/hq_intact.png", "hq_cracked": "buildings/hq_cracked.png"}


def put(img: Image.Image, dst: str, name: str) -> None:
    img.save(f"{dst}/nk_{name.format('blue')}.png", optimize=True)
    recolor(img, RED_HUE).save(f"{dst}/nk_{name.format('red')}.png", optimize=True)


def main(src: str, dst: str) -> None:
    for i, f in enumerate(WARRIOR):
        put(Image.open(f"{src}/{f}").convert("RGBA"), dst, "warrior_{}_%02d" % i)
    for name, f in BUILDINGS.items():
        put(Image.open(f"{src}/{f}").convert("RGBA"), dst, name + "_{}")
    print(f"воин: {len(WARRIOR)} кадров, построек: {len(BUILDINGS)}, по два цвета")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
