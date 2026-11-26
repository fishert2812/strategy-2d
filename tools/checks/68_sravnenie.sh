#!/usr/bin/env bash
# sravnenie: стенд сравнения с образцом (proby/zaplyv/stend/obrazec.html, tools/web/sravnenie.mjs). Каждая запись существа
# vid_chasti.json (раздел vidy) открывается на iPhone 16 рядом со своим цветным образцом: нет записи, нет строки или файла
# образца, движок ничего не нарисовал — красное. Образцы лежат в design/referensy/ общей папки проекта; где её нет (CI),
# берутся заглушки с теми же именами: проверяется, что у каждой записи образец назначен и кадр собирается.
# Самопроверка: несуществующая запись и пустая папка образцов обязаны дать красное.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — стенд с образцом проверить нечем"; exit 1; }
PW=${PW:-}
g=$(npm root -g 2>/dev/null)/playwright/index.mjs; [ -z "$PW" ] && [ -f "$g" ] && PW=$g
if [ -z "$PW" ]; then
  W=~/.webcheck; mkdir -p "$W"
  [ -d "$W/node_modules/playwright" ] || (cd "$W" && timeout 300 npm i --no-audit --no-fund playwright@1.56.1 >/dev/null 2>&1)
  PW=$W/node_modules/playwright/index.mjs
fi
[ -f "$PW" ] || { echo "  нет playwright — стенд с образцом проверить нечем"; exit 1; }
if [ -z "${CHROME:-}" ] && ! ls -d /opt/pw-browsers/chromium* ~/.cache/ms-playwright/chromium* >/dev/null 2>&1; then
  for c in /usr/bin/google-chrome /usr/bin/chromium /usr/bin/chromium-browser; do [ -x "$c" ] && CHROME=$c && break; done
fi
OBR=${REFERENSY:-/mnt/project-files/design/referensy}
tmp=$(mktemp -d)
if [ ! -d "$OBR" ]; then # CI: заглушки-картинки с именами из obrazcy.json
  OBR=$tmp/referensy
  python3 - "$OBR" <<'PY'
import json, os, struct, sys, zlib
def png(w, h):
    raw = b''.join(b'\0' + bytes([200, 60, 150]) * w for _ in range(h))
    ch = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw)) + ch(b'IEND', b'')
for v in json.load(open('proby/zaplyv/stend/obrazcy.json'))['vidy'].values():
    d = os.path.join(sys.argv[1], v['papka']); os.makedirs(d, exist_ok=True); open(os.path.join(d, v['fail']), 'wb').write(png(64, 40))
PY
  echo "  папки образцов нет — заглушки с теми же именами"
fi
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
python3 -m http.server "$port" --bind 127.0.0.1 --directory proby >/dev/null 2>&1 & srv=$!
trap 'kill $srv 2>/dev/null; rm -rf "$tmp"' EXIT
for _ in $(seq 50); do curl -s -o /dev/null "http://127.0.0.1:$port/zaplyv/" && break; sleep 0.1; done
u="http://127.0.0.1:$port/zaplyv/"
PW=$PW CHROME=${CHROME:-} timeout 420 node tools/web/sravnenie.mjs "$u" --obrazcy "$OBR" || exit 1
PW=$PW CHROME=${CHROME:-} timeout 200 node tools/web/sravnenie.mjs "$u" --obrazcy "$OBR" --selftest
