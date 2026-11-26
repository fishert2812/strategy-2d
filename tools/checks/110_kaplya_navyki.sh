#!/usr/bin/env bash
# kaplya_navyki: сторож навыков «Капли» (Роман 26.11 23:03 «Навки почти ничего не дают»; proby/zaplyv/kaplya/test_navyki.mjs).
# Оружие приходит уровнями, повторы только ступенями, «Шип» оглушает, голубая еда кормит, спасшее умение говорит о себе; самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 90 node proby/zaplyv/kaplya/test_navyki.mjs || exit 1
