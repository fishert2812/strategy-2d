#!/usr/bin/env bash
# kaplya_podpis_tempa: «каждые N с» и «стая полная» сверху у полосок, не на клетке (урок L093), плашка не лезет поверх карточки (L094; proby/zaplyv/kaplya/test_podpis_tempa.cjs).
# Самопроверка со старой подписью под клеткой краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_podpis_tempa.cjs || exit 1
