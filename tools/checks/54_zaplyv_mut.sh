#!/usr/bin/env bash
# zaplyv_mut: новые мутации «Заплыва» (proby/zaplyv/mutacii.js) — каждая «сделал → случилось», видна на теле,
# живёт только в режиме «Мутации», бот встречает, где она важна.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — мутации проверить нечем"; exit 1; }
# две половины параллельно (PART=a|b в test_mutacii.mjs), чтобы шаг не упирался во время
d=$(mktemp -d); PART=a timeout 400 node proby/zaplyv/test_mutacii.mjs > "$d/a" 2>&1 & pa=$!
PART=b timeout 400 node proby/zaplyv/test_mutacii.mjs > "$d/b" 2>&1 & pb=$!
wait $pa; ra=$?; wait $pb; rb=$?; cat "$d/a" "$d/b"; rm -rf "$d"
[ $ra -eq 0 ] && [ $rb -eq 0 ]
