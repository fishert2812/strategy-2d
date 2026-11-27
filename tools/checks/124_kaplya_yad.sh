#!/usr/bin/env bash
# kaplya_yad: сторож яда по кокку «Капли» (Роман 27.11 10:01: «Яд не активируется!… радиус условно должен быть показан»; proby/zaplyv/kaplya/test_yad.mjs).
# Клетка с «Ядом 1» жмётся к кокку вдвое тяжелее: кольцо досягаемости его видит, укол в первую секунду, кокк лопается за 20 с. Самопроверка краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_yad.mjs || exit 1
