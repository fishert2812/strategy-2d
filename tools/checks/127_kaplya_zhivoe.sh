#!/usr/bin/env bash
# kaplya_zhivoe: «живое сначала убить» «Капли» (Роман 27.11 14:44; pravki_po_blokam.md Д.10 п. 1–2; proby/zaplyv/kaplya/test_zhivoe.mjs).
# Живого жителя «Глотать» не берёт, тронул без оружия — отскок со щитом; убитый лопается едой; удар делится на здоровье строки boj.celi. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/kaplya/test_zhivoe.mjs || exit 1
