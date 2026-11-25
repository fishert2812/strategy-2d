#!/usr/bin/env bash
# katalog: каталог частей бактерий «Заплыва» (proby/zaplyv/chasti_katalog.json, договор движка, кусок А) — каждая из
# частей 1–7 таблицы биолога (kniga/chasti.md) записана ровно раз: источник, параметры с диапазоном природы или пометкой
# «числа нет», влияние из закрытого списка характеристик по закону книги; ключи совпадают с черновиком «Эволюции».
# Самопроверка: с нарочно испорченным каталогом test_katalog_polnota обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — каталог частей проверить нечем"; exit 1; }
timeout 60 node proby/zaplyv/test_katalog.mjs || exit 1
off=$(KATALOG_LOMAT=1 timeout 60 node proby/zaplyv/test_katalog.mjs 2>&1)
if grep -q 'ПРОВАЛ test_katalog_polnota' <<<"$off"; then
  echo "  самопроверка: часть убрана и характеристика чужая — test_katalog_polnota красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: каталог испорчен, а test_katalog_polnota зелёный — проверка ничего не доказывает"; exit 1
fi
