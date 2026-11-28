#!/usr/bin/env bash
# kaplya_ekrany: экраны «Капли» вне партии — «Геном», Альманах, итог, пауза (урок L125, test_L125; proby/zaplyv/kaplya/test_ekrany.cjs).
# Русские имена генов, без пунктира и схем, портрет убийцы и запись в Альманахе, итог без «Поколений: 0», флажок не на карточке.
# Самопроверка: судьи на плохих данных краснеют (внутри теста).
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_ekrany.cjs || exit 1
