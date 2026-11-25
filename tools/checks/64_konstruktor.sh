#!/usr/bin/env bash
# konstruktor: конструктор бактерий в песочнице «Заплыва» (proby/zaplyv/konstruktor.js, числа konstruktor.json) — ползунки формы
# по формулам книги меняют ход: больше жгутиков быстрее, толще медленнее; эталон равен серой сопернице; любая форма — годная анкета.
# Самопроверка: без тяги жгутиков test_konstruktor_plyvet обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — конструктор проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_konstruktor.mjs || exit 1
off=$(KON_LOMAT=1 timeout 60 node proby/zaplyv/test_konstruktor.mjs 2>&1)
if grep -q 'ПРОВАЛ test_konstruktor_plyvet' <<<"$off"; then
  echo "  самопроверка: без тяги жгутики скорость не меняют — test_konstruktor_plyvet красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: тяга отключена, а test_konstruktor_plyvet зелёный — проверка ничего не доказывает"; exit 1
fi
