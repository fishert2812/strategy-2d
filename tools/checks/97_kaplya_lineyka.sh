#!/usr/bin/env bash
# kaplya_lineyka: сторож портрета хозяина у линейки форка (proby/zaplyv/kaplya/test_lineyka.mjs), книга П5.
# Над силуэтами линейки портрет хозяина главы, если его видели; тёплый, когда он еда; самопроверка — столбик без хозяина ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_lineyka.mjs || exit 1
