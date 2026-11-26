#!/usr/bin/env bash
# kasanie: тела в мире движка не проходят друг сквозь друга (игроки на стендах, Д1; proby/zaplyv/kasanie.js, числа mir.json «kasanie»):
# капсулы по оси тела записи, сдвиг по ближайшим точкам осей, лёгкое дальше, мягко, но глубже допуска — сразу.
# Самопроверка: только мягкое выталкивание (dopusk 5) — test_kasanie_krest обязан покраснеть: палочки проходят насквозь.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — касание проверить нечем"; exit 1; }
timeout 240 node proby/zaplyv/test_kasanie.mjs || exit 1
t=$(mktemp -d); trap 'rm -rf "$t"' EXIT; cp -r proby/zaplyv/. "$t/"
sed -i 's/"dopusk": 0.1,/"dopusk": 5,/' "$t/mir.json"
off=$(timeout 240 node "$t/test_kasanie.mjs" 2>&1)
if grep -q 'ПРОВАЛ test_kasanie_krest' <<<"$off"; then
  echo "  самопроверка: только мягкое выталкивание — test_kasanie_krest красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: допуск 5 полутолщин, а test_kasanie_krest зелёный — проверка ничего не доказывает"; exit 1
fi
