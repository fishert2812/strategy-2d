#!/usr/bin/env bash
# zaplyv: проба «Заплыв» (proby/zaplyv, Three.js) — логика мира без экрана через node: еда, деление, амёба
# и капсула, фаги и CRISPR, мир без краёв, разные миры, простой игрок живёт дольше минуты.
# Запуск в WebKit и время кадра проверяет tools/web/check_zaplyv.sh в workflow web.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — проверить «Заплыв» нечем"; exit 1; }
timeout 450 node proby/zaplyv/test.mjs # 450 с: с едой вокруг колонии (L055) боты растят колонии быстрее, мир считать дольше
