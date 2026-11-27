#!/usr/bin/env bash
# kaplya_kusalka: сторож «Кусалки» по местам «Капли» (kolonia_eda_boy.md Ш38, 12.6; proby/zaplyv/kaplya/test_kusalka.mjs).
# Прижатую цель прокусывает за 5–9 с, вертящуюся вразнобой за 30 с нет. Самопроверка (место не заживает) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_kusalka.mjs || exit 1
