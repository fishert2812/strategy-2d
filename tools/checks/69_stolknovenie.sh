#!/usr/bin/env bash
# stolknovenie: столкновение тел одним правилом «оболочка ↔ оболочка» (движок, кусок 6; proby/zaplyv/stolknovenie.js,
# числа stolknovenie.json) — тела выходят друг из друга, толчок по нормали поверхности, лёгкое дальше тяжёлого, удар не в центр крутит.
# Самопроверка: толчок по линии центров, как у кругов, — test_stolk_bok обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — столкновения проверить нечем"; exit 1; }
# касание считает zony.js из свода движка; пока свод не влит в main, шаг честно говорит, что ждёт его
[ -f proby/zaplyv/zony.js ] || { echo "  ждёт свода движка: нет proby/zaplyv/zony.js — столкновения не проверены"; exit 0; }
timeout 120 node proby/zaplyv/test_stolknovenie.mjs || exit 1
t=$(mktemp -d); trap 'rm -rf "$t"' EXIT; cp -r proby/zaplyv/. "$t/"
sed -i 's/fx += nx \* g; fy += ny \* g;/fx += (A.poza.x - B.poza.x) * g; fy += (A.poza.y - B.poza.y) * g;/' "$t/stolknovenie.js"
off=$(timeout 120 node "$t/test_stolknovenie.mjs" 2>&1)
if grep -q 'ПРОВАЛ test_stolk_bok' <<<"$off"; then
  echo "  самопроверка: толчок по линии центров — test_stolk_bok красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: толчок как у кругов, а test_stolk_bok зелёный — проверка ничего не доказывает"; exit 1
fi
