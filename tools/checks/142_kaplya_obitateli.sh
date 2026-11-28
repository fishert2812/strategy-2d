#!/usr/bin/env bash
# kaplya_obitateli: жители книги в Альманахе «Капли» (проверка блока К 27.11, daf250b: «обитатели 11 из 11»; proby/zaplyv/kaplya/test_obitateli.cjs).
# У каждого жителя из kaplya.json «obitateli» запись, имя и снимок; встреча с трубачом — «новое в Альманахе». Самопроверка краснеет.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить нечем"; exit 1; }
. tools/web/kaplya_pw.sh; [ -f "$PW" ] || { echo "  нет playwright — проверить нечем"; exit 1; }
timeout 300 node proby/zaplyv/kaplya/test_obitateli.cjs || exit 1
