#!/usr/bin/env bash
# kaplya_evo_panel: панель «Эволюция» (блок Э PR 1; proby/zaplyv/kaplya/test_evo_panel.cjs). Роман 27.11 14:29: «Зачем она скрыта?»
# Касание спирали ДНК открывает лист: снимок с подписанными частями, черты рода равны данным игры, гены словами книги; 390×844 и 375×667. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_evo_panel.cjs || exit 1
