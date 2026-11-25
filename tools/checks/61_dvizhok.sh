#!/usr/bin/env bash
# dvizhok: движок существ «Заплыва» (proby/zaplyv/dvizhok.js, анкеты vidy.json) — записи полны, гарпунщица и серая
# соперница из анкет живут как до движка, новый сосед получается одной записью (появляется, ест, паспорт, карточка).
# Самопроверка: с нарочно испорченной анкетой test_dvizhok_ankety обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — движок существ проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/test_dvizhok.mjs || exit 1
off=$(DVIZHOK_LOMAT=1 timeout 120 node proby/zaplyv/test_dvizhok.mjs 2>&1)
if grep -q 'ПРОВАЛ test_dvizhok_ankety' <<<"$off"; then
  echo "  самопроверка: испорченная анкета поймана — test_dvizhok_ankety красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: анкета испорчена, а test_dvizhok_ankety зелёный — проверка ничего не доказывает"; exit 1
fi
sk=$(DVIZHOK_SKACHOK=1 timeout 120 node proby/zaplyv/test_dvizhok.mjs 2>&1)
if grep -q 'ПРОВАЛ test_dvizhok_povorot' <<<"$sk"; then
  echo "  самопроверка: с мгновенным поворотом test_dvizhok_povorot красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: поворот мгновенный, а test_dvizhok_povorot зелёный — проверка ничего не доказывает"; exit 1
fi
