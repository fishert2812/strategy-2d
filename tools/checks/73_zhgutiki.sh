#!/usr/bin/env bash
# zhgutiki: жгутики движка как в ручной игре (hod.js shag_zhgutikov, vid_chasti.js zhgutiki; Роман 26.11: «жгутики тоже у нас хорошо были
# организованы. Они крутились хорошо»): на бегу пучок за кормой, в кувырке веер, смена режима без скачка волны, частота моторов из тяги.
# Самопроверки: веер не раскрывается — test_zhgutiki_veer красный; угол волны «часы × скорость» — test_zhgutiki_faza красный;
# все нити дрейфуют одной волной — test_zhgutiki_drejf красный (Роман 26.11: «дрейфовать… чуть хаотично в разных местах»).
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — жгутики проверить нечем"; exit 1; }
timeout 200 node proby/zaplyv/test_zhgutiki_hod.mjs || exit 1
samo() { local imya=$1 test=$2 file=$3 expr=$4 t; t=$(mktemp -d); cp -r proby/zaplyv/. "$t/"; sed -i "$expr" "$t/$file"
  if grep -q "ПРОВАЛ $test" <<<"$(timeout 200 node "$t/test_zhgutiki_hod.mjs" 2>&1)"; then echo "  самопроверка: $imya — $test красный (так и должно быть)"; rm -rf "$t";
  else echo "  САМОПРОВЕРКА: $imya, а $test зелёный — проверка ничего не доказывает"; rm -rf "$t"; exit 1; fi; }
samo "веер не раскрывается" test_zhgutiki_veer vid_chasti.js 's/if (veer > 0.005) {/if (false) {/'
samo "угол волны из часов" test_zhgutiki_faza hod.js 's/z.ph += z.om \* dt; z.t += dt;/z.t += dt; z.ph = z.om * z.t;/'
samo "все нити дрейфуют одной волной" test_zhgutiki_drejf vid_chasti.js 's/(Dr.chastota\[1\] - Dr.chastota\[0\]) \* hash(P.id, f + k)/(Dr.chastota[1] - Dr.chastota[0]) * hash(P.id, k)/; s/u1 = hash(P.id, f + 68) \* 6.283, u2 = hash(P.id, f + 69) \* 6.283/u1 = hash(P.id, 68) * 6.283, u2 = hash(P.id, 69) * 6.283/'
