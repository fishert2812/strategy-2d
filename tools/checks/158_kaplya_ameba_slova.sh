#!/usr/bin/env bash
# kaplya_ameba_slova: в хватке амёбы не ешь, на выходе сразу «Свобода!», после гибели строки хватки нет (урок L092; proby/zaplyv/kaplya/test_ameba_slova.cjs).
# Самопроверка со старыми строками и едой в хватке краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 600 node proby/zaplyv/kaplya/test_ameba_slova.cjs || exit 1
