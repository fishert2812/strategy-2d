#!/usr/bin/env bash
# kaplya_vdoh: сторож «вдоха» клетки форка (proby/zaplyv/kaplya/test_vdoh.mjs), книга П13.
# Каждый кусок — клетка мягко раздувается на 4 % за 0,2 с и садится на свой размер; самопроверки ловят чужие числа.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_vdoh.mjs || exit 1
