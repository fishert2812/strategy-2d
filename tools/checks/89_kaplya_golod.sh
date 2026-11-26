#!/usr/bin/env bash
# kaplya_golod: сторож событий области форка (proby/zaplyv/kaplya/test_golod.mjs), книга П85.
# Голод с главы 2, не раньше 3-й минуты и не в тень, волнами, последняя — засуха; в голод новой еды нет; самопроверка — голод с первой секунды ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_golod.mjs || exit 1
