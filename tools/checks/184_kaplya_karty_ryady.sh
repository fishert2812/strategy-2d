#!/usr/bin/env bash
# kaplya_karty_ryady: карточки умения строками, картинка крупно, описание до 4 строк (урок L138); proby/zaplyv/kaplya/test_karty_ryady.cjs.
# Самопроверка (kaplyaStaryeKarty) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_karty_ryady.cjs || exit 1
