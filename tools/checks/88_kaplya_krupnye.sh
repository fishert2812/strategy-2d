#!/usr/bin/env bash
# kaplya_krupnye: сторож крупных форка (proby/zaplyv/kaplya/test_krupnye.mjs), книга П40.
# Спумелла хватает лёгкую тебя, хламидомонада не опасна, циклидиум тянет потоком; самопроверки — слепая спумелла и хламидомонада-охотник ловятся.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_krupnye.mjs || exit 1
