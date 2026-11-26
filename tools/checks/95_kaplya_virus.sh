#!/usr/bin/env bash
# kaplya_virus: сторож знака вируса форка (proby/zaplyv/kaplya/test_virus.mjs), книга П7.
# Облако из четырёх вирусов и вирус ближе секунды пути мутят воду серым; дальний, севший, чужой — нет; самопроверки ловят чужие числа.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_virus.mjs || exit 1
