#!/usr/bin/env bash
# kaplya_sobytiya: сторож событий «кто нас убивает» «Капли» (kolonia_eda_boy.md Ш41, 12.8; proby/zaplyv/kaplya/test_sobytiya.mjs).
# Беда объявлена строкой за 3 с и видна мутью воды; вирус по зонам как в симуляции ±5 %; налёта в тихой нет. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_sobytiya.mjs || exit 1
