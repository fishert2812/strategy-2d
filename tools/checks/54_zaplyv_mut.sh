#!/usr/bin/env bash
# zaplyv_mut: новые мутации «Заплыва» (proby/zaplyv/mutacii.js) — каждая «сделал → случилось», видна на теле,
# живёт только в режиме «Мутации», бот встречает, где она важна.
set -u
command -v node >/dev/null || { echo "  нет node — мутации проверить нечем"; exit 1; }
timeout 180 node proby/zaplyv/test_mutacii.mjs
