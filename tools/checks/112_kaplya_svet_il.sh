#!/usr/bin/env bash
# kaplya_svet_il: сторож окон света и ила «Капли» (книга П27, П30; proby/zaplyv/kaplya/test_svet_il.mjs).
# В окне света еда растит в 1,5 раза сильнее; в иле частицы не пропускают клетку насквозь; самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_svet_il.mjs || exit 1
