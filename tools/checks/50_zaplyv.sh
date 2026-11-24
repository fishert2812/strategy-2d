#!/usr/bin/env bash
# zaplyv: проба «Заплыв» (proby/zaplyv, Three.js) — логика мира без экрана через node: еда, деление, амёба
# и капсула, фаги и CRISPR, мир без краёв, разные миры, простой игрок живёт дольше минуты.
# Запуск в WebKit и время кадра проверяет tools/web/check_zaplyv.sh в workflow web.
set -u
command -v node >/dev/null || { echo "  нет node — проверить «Заплыв» нечем"; exit 1; }
timeout 300 node proby/zaplyv/test.mjs
