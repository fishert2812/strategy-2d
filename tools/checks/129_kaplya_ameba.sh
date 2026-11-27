#!/usr/bin/env bash
# kaplya_ameba: амёба ловит не мгновенно (Роман 27.11 14:44: «Врезался в амебу…»; pravki_po_blokam.md Д.10 п. 7; proby/zaplyv/kaplya/test_ameba.mjs).
# Вырост, прилип, чаша, пузырь: гибель не раньше их суммы; ушла, когда пошла чаша, — вырвалась. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/kaplya/test_ameba.mjs || exit 1
