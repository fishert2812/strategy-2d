#!/usr/bin/env bash
# pesochnica: песочница движка «Заплыва» (proby/zaplyv/pesochnica.js, правила pravila.json) — «Мутировать» не собирает
# клетку против правил биолога (места на коже, шуба с липучкой), отказ объясняется, имена умений из книги.
# Самопроверка: со снятыми правилами test_pesochnica_pravila обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — песочницу проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_pesochnica.mjs || exit 1
off=$(PESOK_LOMAT=1 timeout 60 node proby/zaplyv/test_pesochnica.mjs 2>&1)
if grep -q 'ПРОВАЛ test_pesochnica_pravila' <<<"$off"; then
  echo "  самопроверка: без правил клетка собирается запрещённой — test_pesochnica_pravila красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: правила сняты, а test_pesochnica_pravila зелёный — проверка ничего не доказывает"; exit 1
fi
