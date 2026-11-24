#!/usr/bin/env bash
# zhizn: жизнь капли «Заплыва» (proby/zaplyv/zhizn.js, паспорт zhizn.json) — соседи едят друг друга, вирус идёт по стае,
# после гибели остаётся еда, соседи делятся; игрок за первую минуту видит это на экране.
# Самопроверка: с выключенным движком проверка-доказательство test_zhizn_minuta обязана покраснеть.
set -u
command -v node >/dev/null || { echo "  нет node — жизнь капли проверить нечем"; exit 1; }
timeout 120 node proby/zaplyv/test_zhizn.mjs || exit 1
off=$(ZHIZN_OFF=1 timeout 120 node proby/zaplyv/test_zhizn.mjs 2>&1)
if grep -q 'ПРОВАЛ test_zhizn_minuta' <<<"$off"; then
  echo "  самопроверка: без движка мир снова стоит — test_zhizn_minuta красный (так и должно быть)"
else
  echo "  САМОПРОВЕРКА: движок выключен, а test_zhizn_minuta зелёный — проверка ничего не доказывает"; exit 1
fi
