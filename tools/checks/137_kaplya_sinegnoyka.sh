#!/usr/bin/env bash
# kaplya_sinegnoyka: синегнойка — зараза капли (блок К п. 2, цель «Очисти каплю»; proby/zaplyv/kaplya/test_sinegnoyka.mjs).
# Живёт очагами и только в злой воде, клетка держится своего очага. Самопроверка: без зоны она селится и в тихой — краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_sinegnoyka.mjs || exit 1
