#!/usr/bin/env bash
# kaplya_trevoga: «Амёба рядом!» и «Бодо рядом!» только с хищником в кадре (урок L091, повтор bac846d; proby/zaplyv/kaplya/test_trevoga.cjs).
# Самопроверка со старой тревогой по одному расстоянию краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 600 node proby/zaplyv/kaplya/test_trevoga.cjs || exit 1
