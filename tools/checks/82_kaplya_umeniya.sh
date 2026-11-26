#!/usr/bin/env bash
# kaplya_umeniya: сторож умений форка (proby/zaplyv/kaplya/test_umeniya.mjs), книга П65, П71.
# «Вампир» (яд и нюх): сок течёт в клетку; шапка «Нюха» смотрит на еду; самопроверка — без яда связки нет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_umeniya.mjs || exit 1
