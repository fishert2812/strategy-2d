#!/usr/bin/env bash
# kaplya_ochag_podpis: у очага знак ☣ над ним с подписью «Очаг синегнойки» (урок L096; proby/zaplyv/kaplya/test_ochag_podpis.cjs).
# Самопроверка со старым знаком, что пропадал у очага, краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_ochag_podpis.cjs || exit 1
