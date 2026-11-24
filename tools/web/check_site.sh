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
{ timeout 300 npm i --no-audit --no-fund playwright@1.56.1 &&
  timeout 600 sudo -E env "PATH=$PATH" npx playwright install-deps webkit &&
  timeout 300 npx playwright install webkit; } > install.log 2>&1 || {
  tail -15 install.log; echo "ПАСПОРТ: установка WebKit не удалась, до игры не дошёл"; exit 1; }
cat > t.js <<'JS'
// Паспорт: меню (зонд видит кнопку Play) -> касание Play по имени узла -> партия (сцена Battle) -> 30 с в партии.
const { webkit, devices } = require('playwright');
const say = t => console.log('ПАСПОРТ: ' + t);
(async () => {
  const b = await webkit.launch();
  const p = await b.newPage({ ...devices['iPhone 13'] });
  let bad = 0;
  p.on('console', m => { if (m.type() === 'error' && !/glBlitFramebuffer/.test(m.text())) { bad++; console.log('консоль', m.text().slice(0, 200)); } });
  p.on('pageerror', e => { bad++; console.log('ошибка страницы', e.message); });
  const probe = () => p.evaluate(() => window.godotProbe || null).catch(() => null);
  const until = async (ok, ms) => { for (let t = 0; t < ms; t += 500) { const g = await probe(); if (g && ok(g)) return g; if (bad) return null; await p.waitForTimeout(500); } return null; };
  const end = (code, t) => { say(t); return b.close().then(() => process.exit(code)); };
  await p.goto(process.argv[2], { timeout: 60000 });
  const menu = await until(g => g.nodes && g.nodes.Play, 40000);
  if (!menu) return end(bad ? 1 : 2, bad ? 'игра упала до меню, ошибок ' + bad : 'до меню не дошёл (зонд не ответил)');
  const box = await p.locator('#canvas').boundingBox();
  const [fx, fy] = menu.nodes.Play;
  await p.touchscreen.tap(box.x + fx * box.width, box.y + fy * box.height);
  const fight = await until(g => g.scene === 'Battle', 15000);
  if (!fight) return end(bad ? 1 : 2, bad ? 'игра упала при входе в партию, ошибок ' + bad : 'в партию не вошёл');
  say('в партии, стою 30 с');
  await p.waitForTimeout(30000);
  const after = await probe();
  if (bad) return end(1, 'игра упала в партии, ошибок ' + bad);
  if (!after || after.frames <= fight.frames) return end(1, 'партия встала: кадры не идут');
  await p.screenshot({ path: 'webkit.png', timeout: 20000 }).catch(() => {});
  return end(0, 'дошёл до партии, 30 с без ошибок, кадров ' + (after.frames - fight.frames));
})();
JS
timeout -k 10 180 node t.js "$URL/" || { rc=$?; [ $rc -ge 124 ] && echo "ПАСПОРТ: WebKit завис, до конца не дошёл"; exit 1; }
