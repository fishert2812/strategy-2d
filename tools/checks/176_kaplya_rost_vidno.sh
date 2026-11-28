#!/usr/bin/env bash
# kaplya_rost_vidno: полоса роста подписана, растёт от еды, шаг «Подросла» (урок L135); proby/zaplyv/kaplya/test_rost_vidno.cjs.
# Самопроверка (kaplyaStaryjRost) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_rost_vidno.cjs || exit 1
