#!/usr/bin/env bash
# kaplya_knopka_yad: подложка верха и низа, кнопка «Яд» крупно и не чёрная при пустом запасе (уроки L131, L132); proby/zaplyv/kaplya/test_knopka_yad.cjs.
# Самопроверка (kaplyaStarayaKnopkaYad, kaplyaStarayaPodlozhka) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_knopka_yad.cjs || exit 1
