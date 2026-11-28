#!/usr/bin/env bash
# kaplya_yad_palec: палец на слове «Яд» и у края кнопки держит яд, а не заводит второй джойстик; кокк в кольце лопается (урок L106; proby/zaplyv/kaplya/test_yad_palec.cjs).
# Самопроверка (body.staraKnopka) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_yad_palec.cjs || exit 1
