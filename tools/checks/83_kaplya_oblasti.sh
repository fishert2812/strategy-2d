#!/usr/bin/env bash
# kaplya_oblasti: сторож областей форка (proby/zaplyv/kaplya/test_oblasti.mjs), книга П29–П31, П33.
# Без кислорода рост вдвое медленнее, у плёнки и в сероводороде худеешь, тень с главы 2 без сахара; самопроверка судьи роста.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_oblasti.mjs || exit 1
