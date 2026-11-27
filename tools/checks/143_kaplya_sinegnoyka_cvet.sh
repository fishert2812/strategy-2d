#!/usr/bin/env bash
# kaplya_sinegnoyka_cvet: синегнойка сине-зелёная, не розовая, как игрок (К п. 8; proby/zaplyv/kaplya/test_sinegnoyka_cvet.mjs).
# Самопроверка: розовую запись без перекраса судья видит.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_sinegnoyka_cvet.mjs || exit 1
