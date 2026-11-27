#!/usr/bin/env bash
# kaplya_chisla: одни числа рода во всех экранах (урок L084, пачка 2 Т3; proby/zaplyv/kaplya/test_chisla.cjs). Живая игра: пауза «клеток» = ты и стая, «Стая» — «копий»,
# «Геном» не пишет «0 из 21» при включённом гене. Самопроверка со старыми числами краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_cel_slova.mjs || exit 1 # L085: живому — «сначала убей»
timeout 600 node proby/zaplyv/kaplya/test_chisla.cjs || exit 1
