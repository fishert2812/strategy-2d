#!/usr/bin/env bash
# kaplya_knopka: кнопка «Яд» «Капли» (Роман 27.11 14:44: «Кнопку добавьте Яд!»; pravki_po_blokam.md Д.10 п. 3; proby/zaplyv/kaplya/test_knopka.mjs).
# Держишь — запас тает, облако следом травит кокка; пустил — копится; пусто — облака нет; без кнопки касание не травит. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/kaplya/test_knopka.mjs || exit 1
