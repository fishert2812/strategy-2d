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
timeout 300 npm i -s --no-audit --no-fund playwright@1.56.1 >/dev/null
timeout 600 sudo -E npx playwright install-deps webkit >/dev/null
timeout 300 npx playwright install webkit >/dev/null
cat > t.js <<'JS'
const { webkit, devices } = require('playwright');
(async () => {
  const b = await webkit.launch();
  const p = await b.newPage({ ...devices['iPhone 13'] });
  let bad = 0;
  p.on('console', m => { if (m.type() === 'error' && !/glBlitFramebuffer/.test(m.text())) { bad++; console.log('консоль', m.text().slice(0, 200)); } });
  p.on('pageerror', e => { bad++; console.log('ошибка страницы', e.message); });
  await p.goto(process.argv[2], { timeout: 60000 });
  await p.waitForTimeout(20000);
  await p.screenshot({ path: 'webkit.png', timeout: 20000 }).catch(e => console.log('снимок не снят', e.message));
  await p.touchscreen.tap(195, 422);
  await p.waitForTimeout(3000);
  console.log('WebKit: ошибок', bad); await b.close(); process.exit(bad ? 1 : 0);
})();
JS
timeout -k 10 240 node t.js "$URL/" || { echo "WebKit: игра не загрузилась или зависла"; exit 1; }
