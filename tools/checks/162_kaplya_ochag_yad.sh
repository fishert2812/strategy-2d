#!/usr/bin/env bash
# kaplya_ochag_yad: тронул палочку очага без кнопки — строка «зажми "Яд"», зажал — палочка гибнет (урок L097; proby/zaplyv/kaplya/test_ochag_yad.cjs).
# Самопроверка со старым молчанием у щита краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 600 node proby/zaplyv/kaplya/test_ochag_yad.cjs || exit 1
