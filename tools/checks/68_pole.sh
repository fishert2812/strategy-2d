#!/usr/bin/env bash
# pole: поля среды капли (proby/zaplyv/pole.js, кусок 3 карты движка) — свет, кислород, сахар, куски еды из поля; масса сохраняется,
# выеденное наполняется, поле помнит. Внутри самопроверка: при слабом свете сторож «еда рядом» краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — поля проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/test_pole.mjs
