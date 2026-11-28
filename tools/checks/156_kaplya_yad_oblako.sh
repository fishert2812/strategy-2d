#!/usr/bin/env bash
# kaplya_yad_oblako: облако яда зелёное до кольца, клетка видна, без белой засветки (урок L090, повтор bac846d; proby/zaplyv/kaplya/test_yad_oblako.cjs).
# Самопроверка со старым облаком (сложение поверх клетки) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 600 node proby/zaplyv/kaplya/test_yad_oblako.cjs || exit 1
