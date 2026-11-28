#!/usr/bin/env bash
# kaplya_stroki_chisto: строки без минус-формул, тире не в начале строки, имя убийцы с большой буквы, одно двоеточие в подсказке встречи (урок L139); proby/zaplyv/kaplya/test_stroki_chisto.mjs.
# Самопроверка (прежние строки и код) краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_stroki_chisto.mjs || exit 1
