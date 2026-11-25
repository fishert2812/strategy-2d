#!/usr/bin/env bash
# Проба «Заплыв» в браузере: bash tools/web/check_zaplyv.sh <папка сайта> [webkit|chromium].
# Раздаёт папку, открывает /zaplyv/ на iPhone 13, 25 с ведёт пальцем и делится касаниями.
# Провал: ошибка страницы, кадры не идут, клетка не плывёт, расчёт кадра (мир и раскладка) дольше 6 мс в среднем.
set -eu
SITE=$(cd "$1" && pwd); B=${2:-webkit}
test -f "$SITE/zaplyv/index.html" || { echo "ПАСПОРТ: в сборке нет zaplyv/index.html"; exit 1; }
python3 -m http.server 8766 --directory "$SITE" >/dev/null 2>&1 & srv=$!
trap 'kill $srv' EXIT
ROOT=$(pwd); W=~/.webcheck; mkdir -p "$W"; cd "$W"
[ -d node_modules/playwright ] || timeout 300 npm i --no-audit --no-fund playwright@1.56.1 >/dev/null 2>&1 || true
cat > z.js <<'JS'
const pw = require(process.env.PW || 'playwright');
const say = t => console.log('ПАСПОРТ: ' + t);
(async () => {
  const b = await pw[process.argv[3]].launch();
  const p = await b.newPage({ ...pw.devices['iPhone 13'], deviceScaleFactor: 1 }) // плотность 3 проверяет только обход пальцем (L038, L052); здесь 1 — шаг быстрее;
  let bad = 0;
  p.on('pageerror', e => { bad++; console.log('ошибка страницы', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) { bad++; console.log('консоль', m.text().slice(0, 200)); } });
  await p.goto(process.argv[2], { timeout: 60000 });
  await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 30, null, { timeout: 30000 }).catch(() => {});
  const box = await p.locator('#c').boundingBox();
  const at0 = await p.evaluate(() => window.zaplyvProbe ? zaplyvProbe.frames : 0);
  if (!at0) { say('проба не запустилась, ошибок ' + bad); await b.close(); process.exit(1); }
  for (let i = 0; i < 25; i++) {
    await p.mouse.move(box.width / 2 + 120 * Math.sin(i), box.height * 0.3); await p.mouse.down();
    for (let j = 0; j < 8; j++) { await p.mouse.move(box.width / 2 + 140 * Math.sin(i + j / 8), box.height * 0.25); await p.waitForTimeout(110); }
    await p.mouse.up(); await p.mouse.click(box.width / 2, box.height / 2);
  }
  const g = await p.evaluate(() => zaplyvProbe);
  say(`${process.argv[3]}: кадров ${g.frames}, клеток ${g.cells}, точек ${g.dots}, расчёт кадра ${g.js.toFixed(2)} мс (худший ${g.jsWorst.toFixed(1)}), кадр ${g.avg.toFixed(1)} мс, проплыл ${Math.round(g.path)}, ошибок ${bad + g.errors}`);
  await b.close();
  process.exit(bad || g.errors || g.frames <= at0 || g.path < 200 || g.js > 6 ? 1 : 0);
})().catch(e => { say('прогон упал: ' + e.message); process.exit(1); });
JS
node z.js "http://localhost:8766/zaplyv/index.html" "$B"
# урок L017: каждая кнопка отвечает пальцу и в этом браузере
PW=$W/node_modules/playwright/index.mjs node "$ROOT/tools/web/zaplyv_tap.mjs" "http://localhost:8766/zaplyv/" "$B"
