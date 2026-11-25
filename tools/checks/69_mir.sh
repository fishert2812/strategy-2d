#!/usr/bin/env bash
# mir: сборка мира по записи (proby/zaplyv/mir_sborka.js, mir_zapis.json) — виды по полю и «любит», тихий старт с едой, развёртка помнит места.
# Внутри самопроверка: испорченная запись поймана, амёба «любит свет» — сторож ареала краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — мир проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/test_mir.mjs
