#!/usr/bin/env bash
# delenie: рост и деление записью (движок, кусок 5; proby/zaplyv/delenie.js, числа delenie.json) — рост от еды по ценности
# без рывков, объём тела сходится, перетяжка по центру, две целые дочки с разными отличиями, выбор у мутатора (Г46) чаще.
# Самопроверка: без потолка роста за шаг test_delenie_plavno обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — деление проверить нечем"; exit 1; }
# тело считает telo_os.js из свода движка; пока свод не влит в main, шаг честно говорит, что ждёт его
[ -f proby/zaplyv/telo_os.js ] || { echo "  ждёт свода движка: нет proby/zaplyv/telo_os.js — деление не проверено"; exit 0; }
timeout 120 node proby/zaplyv/test_delenie.mjs || exit 1
off=$(DELENIE_LOMAT=1 timeout 120 node proby/zaplyv/test_delenie.mjs 2>&1)
if grep -q 'ПРОВАЛ test_delenie_plavno' <<<"$off"; then
  echo "  самопроверка: без потолка роста за шаг test_delenie_plavno красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: рост без потолка, а test_delenie_plavno зелёный — проверка ничего не доказывает"; exit 1
fi
