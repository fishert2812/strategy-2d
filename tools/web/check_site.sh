#!/usr/bin/env bash
# Проверка постоянного адреса снаружи: bash tools/web/check_site.sh <адрес> <sha>.
# Ждёт, пока адрес отдаст сборку <sha>, сверяет типы файлов и открывает игру в WebKit (iPhone 13) с касанием.
set -eu
URL=$1; SHA=$2
for i in $(seq 1 40); do
  V=$(curl -sf "$URL/version.txt?t=$RANDOM" || true)
  echo "попытка $i: адрес отдаёт ${V:-ничего}"
  [ "$V" = "$SHA" ] && break
  [ "$i" = 40 ] && { echo "адрес так и не отдал $SHA"; exit 1; }
  sleep 15
done
for f in index.html manifest.json index.js index.pck.wasm index.wasm.part0.wasm index.apple-touch-icon.png; do
  curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download} $f\n" "$URL/$f" | tee /dev/stderr | grep -q '^200 ' || exit 1
done
D=$(mktemp -d); cd "$D"
# apt без вопросов: needrestart и debconf иначе ждут ответа и вешают установку.
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
# Прогон, не дошедший до игры, — провал проверки, а не «прошёл» и не «игра виновата» (урок L002).
{ timeout 300 npm i -s --no-audit --no-fund playwright@1.56.1 >/dev/null &&
  timeout 600 sudo -E npx playwright install-deps webkit >/dev/null &&
  timeout 300 npx playwright install webkit >/dev/null; } || { echo "ПАСПОРТ: установка WebKit не удалась, до игры не дошёл"; exit 1; }
cat > t.js <<'JS'
const { webkit, devices } = require('playwright');
(async () => {
  const b = await webkit.launch();
  const p = await b.newPage({ ...devices['iPhone 13'] });
  let bad = 0, started = false;
  p.on('console', m => { if (/Godot Engine v/.test(m.text())) started = true; if (m.type() === 'error' && !/glBlitFramebuffer/.test(m.text())) { bad++; console.log('консоль', m.text().slice(0, 200)); } });
  p.on('pageerror', e => { bad++; console.log('ошибка страницы', e.message); });
  await p.goto(process.argv[2], { timeout: 60000 });
  await p.waitForTimeout(20000);
  await p.screenshot({ path: 'webkit.png', timeout: 20000 }).catch(e => console.log('снимок не снят', e.message));
  await p.touchscreen.tap(195, 422);
  await p.waitForTimeout(3000);
  await b.close();
  if (bad) { console.log('ПАСПОРТ: игра упала, ошибок ' + bad); process.exit(1); }
  if (!started) { console.log('ПАСПОРТ: до игры не дошёл (движок не запустился)'); process.exit(2); }
  console.log('ПАСПОРТ: дошёл до игры, ошибок 0'); process.exit(0);
})();
JS
timeout -k 10 240 node t.js "$URL/" || { rc=$?; [ $rc -ge 124 ] && echo "ПАСПОРТ: WebKit завис, до конца не дошёл"; exit 1; }
