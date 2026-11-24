#!/usr/bin/env python3
"""Пересобрать всех красных из синих: для каждой картинки ПАПКА/*_blue*.png, у которой есть красная пара,
красная пара перекрашивается заново (tools/art/warrior_frames.py, recolor).

Запуск: python3 -I tools/art/red_team.py art/table
"""
import glob
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from warrior_frames import RED_HUE, recolor  # noqa: E402

n = 0
for blue in sorted(glob.glob(os.path.join(sys.argv[1], "*_blue*.png"))):
    red = blue.replace("_blue", "_red")
    if os.path.exists(red):
        recolor(Image.open(blue).convert("RGBA"), RED_HUE).save(red, optimize=True)
        n += 1
print(f"красных перекрашено: {n}")
