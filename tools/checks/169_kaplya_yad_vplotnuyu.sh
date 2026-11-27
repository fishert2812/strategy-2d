#!/usr/bin/env bash
# kaplya_yad_vplotnuyu: яд достаёт крупного кокка вплотную одним пальцем (урок L124); proby/zaplyv/kaplya/test_yad_vplotnuyu.cjs.
# Самопроверка (window.kaplyaStaryjZapas) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 500 node proby/zaplyv/kaplya/test_yad_vplotnuyu.cjs || exit 1
