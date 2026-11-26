#!/usr/bin/env bash
# kaplya_kislota: сторож кислой воды форка (proby/zaplyv/kaplya/test_kislota.mjs), книга П26, П39.
# Гроздь из 4–8 шариков за краем кадра; в круге 2 её радиусов еда растит вдвое слабее, проглоченное нет; самопроверки ловят чужие числа.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_kislota.mjs || exit 1
