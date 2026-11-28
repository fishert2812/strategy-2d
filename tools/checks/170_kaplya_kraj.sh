#!/usr/bin/env bash
# kaplya_kraj: подписи целиком на экране — sha выкладки, подпись очага у края (уроки L125, L127); proby/zaplyv/kaplya/test_kraj.cjs.
# Самопроверка (window.kaplyaStarayaVersiya, window.kaplyaStarayaKraiOchaga) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 500 node proby/zaplyv/kaplya/test_kraj.cjs || exit 1
