#!/usr/bin/env bash
# kaplya_lestnica: сторож аркады «Лестница» форка (proby/zaplyv/kaplya/test_lestnica.mjs), книга П86–П89.
# Царь только плывущий, в окне масс и не ближе заданного; съела — счёт и новый царь; самопроверка — испорченные числа ловятся.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_lestnica.mjs || exit 1
