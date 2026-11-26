#!/usr/bin/env bash
# zhgutiki: жгутики движка как в ручной игре (hod.js shag_zhgutikov, vid_chasti.js zhgutiki; Роман 26.11: «жгутики тоже у нас хорошо были
# организованы. Они крутились хорошо»): на бегу пучок за кормой, в кувырке веер, смена режима без скачка волны, частота моторов из тяги.
# Самопроверки: веер не раскрывается — test_zhgutiki_veer красный; угол волны «часы × скорость» — test_zhgutiki_faza красный.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — жгутики проверить нечем"; exit 1; }
timeout 200 node proby/zaplyv/test_zhgutiki_hod.mjs || exit 1
samo() { local imya=$1 test=$2 file=$3 expr=$4 t; t=$(mktemp -d); cp -r proby/zaplyv/. "$t/"; sed -i "$expr" "$t/$file"
  if grep -q "ПРОВАЛ $test" <<<"$(timeout 200 node "$t/test_zhgutiki_hod.mjs" 2>&1)"; then echo "  самопроверка: $imya — $test красный (так и должно быть)"; rm -rf "$t";
  else echo "  САМОПРОВЕРКА: $imya, а $test зелёный — проверка ничего не доказывает"; rm -rf "$t"; exit 1; fi; }
samo "веер не раскрывается" test_zhgutiki_veer vid_chasti.js 's/if (veer > 0.005) {/if (false) {/'
samo "угол волны из часов" test_zhgutiki_faza hod.js 's/z.ph += z.om \* dt; z.t += dt;/z.t += dt; z.ph = z.om * z.t;/'
