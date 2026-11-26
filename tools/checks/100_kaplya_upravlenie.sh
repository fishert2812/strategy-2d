#!/usr/bin/env bash
# kaplya_upravlenie: сторож управления форка (proby/zaplyv/kaplya/test_upravlenie.mjs), Роман 26.11 20:39: «плывет к еде… отбирает контроль».
# «Нюх» не везёт клетку к еде и не подруливает (мир настоящий); с магнитом еда плывёт к клетке; самопроверка — прежние 0,5 и 0,45 ловятся.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_upravlenie.mjs || exit 1
