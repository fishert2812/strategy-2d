#!/usr/bin/env bash
# kaplya_itog: экран итога называет убийцу по-русски, рамка с портретом, только взятые гены, поверх листа ничего из игры (урок L107; proby/zaplyv/kaplya/test_itog.cjs).
# Самопроверка (window.kaplyaStaryjItog, body.staryjItog) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 400 node proby/zaplyv/kaplya/test_itog.cjs || exit 1
