#!/usr/bin/env bash
# pravila_zon: таблица «зона коснулась зоны» (proby/zaplyv/pravila_zon.json, карта движка, кусок 4) — каждый исход решает
# строка таблицы, способности жертвы уточняют заражение; самопроверка: сломанная таблица краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — зоны проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_pravila_zon.mjs
