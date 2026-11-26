#!/usr/bin/env bash
# kaplya_stolk: сторож столкновений (Роман 26.11 21:55; proby/zaplyv/kaplya/test_stolk.mjs).
# Клетка врезается в соперницу и бродяжку по контуру записи движка и толкает их, а не проходит сквозь; амёба ловит как раньше; самопроверка — без столкновений проходишь сквозь, судья краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_stolk.mjs || exit 1
