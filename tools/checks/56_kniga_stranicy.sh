#!/usr/bin/env bash
# kniga_stranicy: каждая вкладка книги «Заплыва» открывается на телефоне без ошибки страницы и не пустая.
# Урок 25.11: вкладка «Тексты» упала на новой записи без латинского имени, сверка данных этого не видит.
set -u
command -v node >/dev/null || { echo "  нет node — открыть книгу нечем"; exit 1; }
PW=${PW:-}
g=$(npm root -g 2>/dev/null)/playwright/index.mjs; [ -z "$PW" ] && [ -f "$g" ] && PW=$g
if [ -z "$PW" ]; then
  W=~/.webcheck; mkdir -p "$W"
  [ -d "$W/node_modules/playwright" ] || (cd "$W" && timeout 300 npm i --no-audit --no-fund playwright@1.56.1 >/dev/null 2>&1)
  PW=$W/node_modules/playwright/index.mjs
fi
[ -f "$PW" ] || { echo "  нет playwright — открыть книгу нечем"; exit 1; }
if [ -z "${CHROME:-}" ] && ! ls -d /opt/pw-browsers/chromium* ~/.cache/ms-playwright/chromium* >/dev/null 2>&1; then
  for c in /usr/bin/google-chrome /usr/bin/chromium /usr/bin/chromium-browser; do [ -x "$c" ] && CHROME=$c && break; done
fi
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
python3 -m http.server "$port" --bind 127.0.0.1 --directory proby >/dev/null 2>&1 & srv=$!
trap 'kill $srv 2>/dev/null' EXIT
for _ in $(seq 50); do curl -s -o /dev/null "http://127.0.0.1:$port/zaplyv/kniga/" && break; sleep 0.1; done
PW=$PW CHROME=${CHROME:-} timeout 150 node proby/zaplyv/kniga/stranicy.mjs "http://127.0.0.1:$port/zaplyv/kniga/index.html"
