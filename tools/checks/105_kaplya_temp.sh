#!/usr/bin/env bash
# kaplya_temp: сторож темпа роста (Ш26 kolonia_eda_boy.md; Роман 26.11 21:22 «вырастаешь… очень быстро»; proby/zaplyv/kaplya/test_temp.mjs).
# Бот в настоящем мире: медленный растёт первый раз на 50–75 с, дальше через 60–100 с; ловкий не чаще раза в 25 с и без рывков; самопроверка — прежние числа rost.json краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/kaplya/test_temp.mjs || exit 1
