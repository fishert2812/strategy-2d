#!/usr/bin/env bash
# kaplya_rod: сторож «Род жив» форка (proby/zaplyv/kaplya/test_rod.mjs), книга П73.
# Раз за заплыв сестра в другой воде, вдали от хищника, 0,4–0,55 массы гибели; самопроверка — сестра в полную массу ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_rod.mjs || exit 1
