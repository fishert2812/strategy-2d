#!/usr/bin/env bash
# kaplya_zony: сторож тихой и злой воды «Капли» (kolonia_eda_boy.md Ш40, 12.8; proby/zaplyv/kaplya/test_zony.mjs).
# В тихой охотник не подходит 2 мин, в злой еды в 2,4 раза больше (симуляция ±5 %), охотники быстрее. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_zony.mjs || exit 1
