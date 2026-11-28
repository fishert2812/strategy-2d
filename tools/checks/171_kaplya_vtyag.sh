#!/usr/bin/env bash
# kaplya_vtyag: пасть втягивает без дёрганья — коловратка и туфелька (урок L128); proby/zaplyv/kaplya/test_vtyag.cjs.
# Самопроверка (window.kaplyaStaroeVtyag) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 590 node proby/zaplyv/kaplya/test_vtyag.cjs || exit 1
