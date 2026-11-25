#!/usr/bin/env bash
# zaplyv_menu (урок L037, test_L037): структура меню «Заплыва» пальцем на iPhone 13 — заголовок, главное внизу,
# путь назад на каждом уровне, разделы строками, а не чипами; затем самопроверка на нарочно сломанных меню.
# Обход — tools/web/zaplyv_menu.mjs. Playwright и браузер ищем так же, как 52_zaplyv_tap.sh.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — меню проверить нечем"; exit 1; }
PW=${PW:-}
g=$(npm root -g 2>/dev/null)/playwright/index.mjs; [ -z "$PW" ] && [ -f "$g" ] && PW=$g
if [ -z "$PW" ]; then
  W=~/.webcheck; mkdir -p "$W"
  [ -d "$W/node_modules/playwright" ] || (cd "$W" && timeout 300 npm i --no-audit --no-fund playwright@1.56.1 >/dev/null 2>&1)
  PW=$W/node_modules/playwright/index.mjs
fi
[ -f "$PW" ] || { echo "  нет playwright — меню проверить нечем"; exit 1; }
if [ -z "${CHROME:-}" ] && ! ls -d /opt/pw-browsers/chromium* ~/.cache/ms-playwright/chromium* >/dev/null 2>&1; then
  for c in /usr/bin/google-chrome /usr/bin/chromium /usr/bin/chromium-browser; do [ -x "$c" ] && CHROME=$c && break; done
fi
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
python3 -m http.server "$port" --bind 127.0.0.1 --directory proby >/dev/null 2>&1 & srv=$!
trap 'kill $srv 2>/dev/null' EXIT
for _ in $(seq 50); do curl -s -o /dev/null "http://127.0.0.1:$port/zaplyv/" && break; sleep 0.1; done
u="http://127.0.0.1:$port/zaplyv/"
PW=$PW CHROME=${CHROME:-} timeout 150 node tools/web/zaplyv_menu.mjs "$u" || exit 1
PW=$PW CHROME=${CHROME:-} timeout 320 node tools/web/zaplyv_menu.mjs "$u" --selftest # восемь обходов; с проверками О77/О78/П2 обход дольше
