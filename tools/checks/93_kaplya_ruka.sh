#!/usr/bin/env bash
# kaplya_ruka: сторож руки форка (proby/zaplyv/kaplya/test_ruka.mjs), книга П4.
# По первым 20 касаниям: больше двух третей слева — левая рука, линейка справа; решение хранится; самопроверка — доля 0,5 ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_ruka.mjs || exit 1
