#!/usr/bin/env bash
# kaplya_zaraza: сторож заметности большой клетки форка (proby/zaplyv/kaplya/test_zaraza.mjs), книга П52, ЛЭ26.
# Вирус садится на край большой клетки; к великану вирусы и запятые приходят чаще, чем к средней; самопроверки — без роста заметности и без края ловятся.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_zaraza.mjs || exit 1
