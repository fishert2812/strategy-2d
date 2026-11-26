#!/usr/bin/env bash
# zaplyv_miganie: сторож мигания «Заплыва» (tools/web/test_miganie.cjs), образец — сторож «Капли» (78_kaplya_miganie.sh). Роман 26.11: «Почему экран мигает?» —
# снимок Альманаха вне кадра показывался на кадр вместо мира. Сторож читает каждый кадр холста; самопроверка — снимок без защиты он обязан поймать.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — мигание проверить нечем"; exit 1; }
PW=${PW:-}
g=$(npm root -g 2>/dev/null)/playwright/index.mjs; [ -z "$PW" ] && [ -f "$g" ] && PW=$g
if [ -z "$PW" ]; then
  W=~/.webcheck; mkdir -p "$W"
  [ -d "$W/node_modules/playwright" ] || (cd "$W" && timeout 300 npm i --no-audit --no-fund playwright@1.56.1 >/dev/null 2>&1)
  PW=$W/node_modules/playwright/index.mjs
fi
[ -f "$PW" ] || { echo "  нет playwright — мигание проверить нечем"; exit 1; }
PW=$PW timeout 240 node tools/web/test_miganie.cjs || exit 1
