#!/usr/bin/env bash
# kaplya_okna: урок 27.11 (блок Ц) — window.kaplyaGlava был задан в main.js дважды, второе перетёрло первое, и сторож старта (test_nagruzka) покраснел.
# Каждое window.имя = в коде «Капли» задаётся один раз.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
dv=$(grep -ohE 'window\.[A-Za-z_]+ *= ' proby/zaplyv/kaplya/*.js | sed 's/ *= $//' | sort | uniq -d)
[ -z "$dv" ] || { echo "  ПРОВАЛ: window-имя задано дважды: $dv"; exit 1; }
echo "  ок test_L073 test_okna_odin_raz: каждое window-имя задано один раз"
