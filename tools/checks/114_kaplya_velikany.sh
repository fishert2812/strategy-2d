#!/usr/bin/env bash
# kaplya_velikany: сторож великанов после объятия «Капли» (книга П53; proby/zaplyv/kaplya/test_velikany.mjs).
# После объятия рядом с клеткой любого роста есть великан вдвое-впятеро тяжелее, большая амёба плывёт к ней; самопроверка краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_velikany.mjs || exit 1
