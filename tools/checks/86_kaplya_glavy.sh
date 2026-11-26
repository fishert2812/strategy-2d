#!/usr/bin/env bash
# kaplya_glavy: сторож глав 2–5 форка (proby/zaplyv/kaplya/test_glavy.mjs), книга П79–П83.
# Глава 2 — амёба, 3 — объятие на границе кислорода, 4 — туфелька и коловратка, 5 — шар клеток; самопроверка — широкая «граница» ловится.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_glavy.mjs || exit 1
