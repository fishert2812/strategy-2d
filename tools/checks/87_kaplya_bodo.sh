#!/usr/bin/env bash
# kaplya_bodo: сторож хозяина бодо форка (proby/zaplyv/kaplya/test_bodo.mjs), книга П78.
# Бой на привязи: хозяин прыгает вокруг комка; молодой бодо не берёт тебя с массы 5,6; самопроверка — без предела ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_bodo.mjs || exit 1
