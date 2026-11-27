#!/usr/bin/env bash
# kaplya_spirilla: спирилла и бродяжка поворачивают дугой (урок L080, пачка 1 п. 10; Роман 9:51 «азарт вперед без разворотов»; proby/zaplyv/kaplya/test_spirilla.mjs).
# Самопроверка со старым скачком носа краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_spirilla.mjs || exit 1
