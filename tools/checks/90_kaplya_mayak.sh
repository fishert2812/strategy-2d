#!/usr/bin/env bash
# kaplya_mayak: сторож маяка сестры форка (proby/zaplyv/kaplya/test_mayak.mjs), книга П12.
# Маяк на самой крупной сестре у края с её стороны, пока она за краем; гибель — просыпаешься в ней; самопроверка — отступ во весь экран ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_mayak.mjs || exit 1
