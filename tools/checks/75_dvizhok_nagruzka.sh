#!/usr/bin/env bash
# dvizhok_nagruzka: цена движка на телефоне. Стенд proby/zaplyv/stend/list.html ставит на экран iPhone 16 (393×852, плотность 3)
# 30 и 100 существ из случайных записей на ходу; tools/web/dvizhok_nagruzka.mjs меряет вызовы рисования, треугольники,
# кадр на процессоре и сборку частей. Провал: вызовов больше 2,5 на существо (+3 на фон); сборка дольше 1,2 мс на существо
# (облако 25.11: 0,7; шум прогонов ±10 %, правило 3.4 — порог в разы шире шума, ловит удвоение); паспорт не сошёлся
# (существ не столько, кадр пустой, ошибка страницы). Самопроверка (полный режим): loft заводит новую сетку каждый кадр — обязан покраснеть.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../check_mode.sh"; run_in fast || exit 0
command -v node >/dev/null || { echo "  нет node — нагрузку движка мерить нечем"; exit 1; }
[ -f proby/zaplyv/stend/list.html ] || { echo "  нет стенда proby/zaplyv/stend/list.html — мерить нечего"; exit 1; }
PW=${PW:-}
g=$(npm root -g 2>/dev/null)/playwright/index.mjs; [ -z "$PW" ] && [ -f "$g" ] && PW=$g
if [ -z "$PW" ]; then
  W=~/.webcheck; mkdir -p "$W"
  [ -d "$W/node_modules/playwright" ] || (cd "$W" && timeout 300 npm i --no-audit --no-fund playwright@1.56.1 >/dev/null 2>&1)
  PW=$W/node_modules/playwright/index.mjs
fi
[ -f "$PW" ] || { echo "  нет playwright — нагрузку движка мерить нечем"; exit 1; }
# браузер: свой у playwright, иначе Chrome раннера (как в 52_zaplyv_tap.sh)
if [ -z "${CHROME:-}" ] && ! ls -d /opt/pw-browsers/chromium* ~/.cache/ms-playwright/chromium* >/dev/null 2>&1; then
  for c in /usr/bin/google-chrome /usr/bin/chromium /usr/bin/chromium-browser; do [ -x "$c" ] && CHROME=$c && break; done
fi
srv=""; trap '[ -n "$srv" ] && kill $srv 2>/dev/null' EXIT
zamer() { # $1 — папка proby; печатает строки замера, код 0 — в пороге
  local port; port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
  python3 -m http.server "$port" --bind 127.0.0.1 --directory "$1" >/dev/null 2>&1 & srv=$!
  for _ in $(seq 50); do curl -s -o /dev/null "http://127.0.0.1:$port/zaplyv/stend/list.html" && break; sleep 0.1; done
  local out; out=$(PW=$PW CHROME=${CHROME:-} ZAMERY=30:1,100:1 timeout 300 node tools/web/dvizhok_nagruzka.mjs "http://127.0.0.1:$port/zaplyv/stend/list.html" 40 2>&1)
  kill $srv 2>/dev/null; srv=""
  grep -v '^JSON ' <<<"$out" | sed 's/^/  /'
  grep '^JSON ' <<<"$out" | sed 's/^JSON //' | node -e '
    const z = JSON.parse(require("fs").readFileSync(0, "utf8")); let bad = 0; const no = t => { bad++; console.log("  ПРОВАЛ нагрузка: " + t); };
    if (z.length !== 2) no("замеров " + z.length + " из 2");
    for (const r of z) { const k = r.n + " существ";
      if (r.net) { no(k + ": " + r.net); continue; }
      if (r.sushchestv !== r.n) no(k + ": на стенде " + r.sushchestv + " существ — мерили не то");
      if (!(r.yarko > 0.005)) no(k + ": кадр пустой (светлого " + (r.yarko * 100).toFixed(1) + " %)");
      if (r.oshibki.length) no(k + ": ошибок страницы " + r.oshibki.length);
      if (r.callsMax > 2.5 * r.n + 3) no(k + ": вызовов рисования " + r.callsMax + ", порог " + (2.5 * r.n + 3));
      if (!(r.sborka >= 0) || r.sborka > 1.2 * r.n) no(k + ": сборка частей " + r.sborka.toFixed(1) + " мс, порог " + (1.2 * r.n).toFixed(0) + " мс");
    }
    process.exit(bad ? 1 : 0);' || return 1
}
zamer proby || exit 1
[ "$(check_mode)" = full ] || exit 0
L=$(mktemp -d); trap 'rm -rf "$L"; [ -n "$srv" ] && kill $srv 2>/dev/null' EXIT
cp -r proby/zaplyv "$L/zaplyv"
sed -i 's/if (!m || m\.kolec !== R) {/if (true) {/' "$L/zaplyv/body3d.js"
cmp -s proby/zaplyv/body3d.js "$L/zaplyv/body3d.js" && { echo "  САМОПРОВЕРКА: поломка не легла (loft в body3d.js изменился)"; exit 1; }
if zamer "$L" >/dev/null; then
  echo "  САМОПРОВЕРКА: loft заводит сетку каждый кадр, а замер зелёный — порог ничего не доказывает"; exit 1
fi
echo "  самопроверка: loft с новой сеткой каждый кадр — замер красный (так и должно быть)"
