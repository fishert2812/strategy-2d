#!/usr/bin/env bash
# kaplya_sloj: ты всегда виден поверх жителей (урок L082, пачка 2 Т7; proby/zaplyv/kaplya/test_sloj.cjs). Живая игра 390×844: стоишь на нити анабены — клетка видна.
# Самопроверка со старым слоем (анабена закрывает клетку) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 600 node proby/zaplyv/kaplya/test_sloj.cjs || exit 1
