#!/usr/bin/env bash
# kaplya_staya: сторож деления капелькой и маленькой стаи «Капли» (kolonia_eda_boy.md Ш32, Ш33; proby/zaplyv/kaplya/test_staya.mjs).
# Почка только сзади и только за запас из съеденного, рвётся за 0,8 с; малышки растут до 0,15 и почкуются сами, не больше 24. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_staya.mjs || exit 1
