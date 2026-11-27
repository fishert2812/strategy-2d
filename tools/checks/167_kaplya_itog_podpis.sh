#!/usr/bin/env bash
# kaplya_itog_podpis: на 390×664 под твоим портретом не имя убийцы, «Клеток было до» не меньше «Отняли», подсказка над нижней плашкой; ?yad даёт яд сразу (уроки L120, L121; proby/zaplyv/kaplya/test_itog_podpis.cjs).
# Самопроверка (window.kaplyaStaryjPodpis, window.kaplyaBezMetkiYad) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 400 node proby/zaplyv/kaplya/test_itog_podpis.cjs || exit 1
