#!/usr/bin/env bash
# kaplya_sverlo: сторож «Сверла» «Капли» (kolonia_eda_boy.md Ш39, 12.7; proby/zaplyv/kaplya/test_sverlo.mjs).
# По ровне не работает, по вдвое большей ввинчиваешься, внутри 4 + 1,5 × k с, выйти нельзя, пасть съедает обоих. Самопроверка краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_sverlo.mjs || exit 1
