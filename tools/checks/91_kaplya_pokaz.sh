#!/usr/bin/env bash
# kaplya_pokaz: сторож показа нового мира форка (proby/zaplyv/kaplya/test_pokaz.mjs), книга П13.
# После хозяина первое новое существо крупнее тебя камера показывает целиком за 3 с, один раз; самопроверка — неподвижная камера ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_pokaz.mjs || exit 1
