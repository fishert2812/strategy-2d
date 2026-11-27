#!/usr/bin/env bash
# kaplya_mutaciya: сторож мутации, вируса по стае, закрепления, видимого замка и паузы «Стая» «Капли» (kolonia_eda_boy.md Ш34–Ш37, 12.5; proby/zaplyv/kaplya/test_mutaciya.mjs, test_menyu_staya.cjs).
# Мутантов 10 % почкований, потомки наследуют; вирус оставляет только устойчивых; три пути закрепления; в меню ровно клетки мира; «Стать ею?» ставит мир на паузу. Самопроверки краснеют.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/kaplya/test_mutaciya.mjs || exit 1
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/kaplya/test_menyu_staya.cjs || exit 1
