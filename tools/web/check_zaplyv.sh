#!/usr/bin/env bash
# Проба «Заплыв» в браузере: bash tools/web/check_zaplyv.sh <папка сайта> [webkit|chromium].
# Раздаёт папку, открывает /zaplyv/ на iPhone 13, 25 с ведёт пальцем и касается.
# Нагрузка каждый раз одна (решение 25.11): случай с заданным зерном (Math.random), колония ровно из 5 клеток (тяжёлый случай:
# раньше деления касаниями давали то 1, то 5 клеток, и расчёт кадра прыгал 3–9 мс вокруг порога).
# Клетки в пробе не гибнут (w.lose пустой): нагрузка остаётся та же, хищники считают как прежде.
# Провал: ошибка страницы, кадры не идут, клетка не плывёт, клеток не 5, расчёт кадра (мир и раскладка) дольше 6 мс в среднем.
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
  await p.addInitScript(() => { let a = 20251125; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  const KLETOK = 5, kolonia = () => p.evaluate(n => { const w = zaplyvWorld(); w.cfg.auto_split = 1e9; w.lose = () => {}; /* без гибели: съели всю колонию — заплыв кончался и мерили 0 клеток */ const a = w.me[0]; if (!a) return;
    while (w.me.length < n) { const i = w.me.length; w.me.push({ ...a, id: 800 + i, x: a.x + (i % 3) * 30, y: a.y + Math.floor(i / 3) * 30, vx: 0, vy: 0 }); }
    if (w.me.length > n) w.me.length = n; }, KLETOK);
  await p.goto(process.argv[2], { timeout: 60000 });
  await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 30, null, { timeout: 30000 }).catch(() => {});
  const box = await p.locator('#c').boundingBox();
  const at0 = await p.evaluate(() => window.zaplyvProbe ? zaplyvProbe.frames : 0);
  if (!at0) { say('проба не запустилась, ошибок ' + bad); await b.close(); process.exit(1); }
  await kolonia();
  for (let i = 0; i < 25; i++) {
    await p.mouse.move(box.width / 2 + 120 * Math.sin(i), box.height * 0.3); await p.mouse.down();
    for (let j = 0; j < 8; j++) { await p.mouse.move(box.width / 2 + 140 * Math.sin(i + j / 8), box.height * 0.25); await p.waitForTimeout(110); }
    await p.mouse.up(); await p.mouse.click(box.width / 2, box.height / 2); await kolonia(); // касание может поделить или клетку съедят: колония снова из KLETOK
  }
  // проба пишет клеток по кадру: сразу после kolonia() в ней ещё прошлый кадр (касание поделило или клетку съели).
  // Читаем после трёх новых кадров, нагрузка остаётся ровно KLETOK.
  await kolonia(); const f1 = await p.evaluate(() => zaplyvProbe.frames);
  await p.waitForFunction(f => zaplyvProbe.frames > f + 3, f1, { timeout: 10000 }).catch(() => {});
  const g = await p.evaluate(() => zaplyvProbe);
  say(`${process.argv[3]}: кадров ${g.frames}, клеток ${g.cells}, точек ${g.dots}, расчёт кадра ${g.js.toFixed(2)} мс (худший ${g.jsWorst.toFixed(1)}), кадр ${g.avg.toFixed(1)} мс, проплыл ${Math.round(g.path)}, ошибок ${bad + g.errors}`);
  await b.close();
  if (g.cells !== KLETOK) say(`клеток ${g.cells}, а нагрузка задана ${KLETOK} — мерили не то`);
  process.exit(bad || g.errors || g.frames <= at0 || g.path < 200 || g.cells !== KLETOK || g.js > 6 ? 1 : 0);
})().catch(e => { say('прогон упал: ' + e.message); process.exit(1); });
JS
rc=0
node z.js "http://localhost:8766/zaplyv/index.html" "$B" || rc=1
# урок L017: каждая кнопка отвечает пальцу и в этом браузере. Идёт и при красной пробе скорости (решение 25.11):
# иначе, пока скорость красная, касания в WebKit никто не проверяет.
PW=$W/node_modules/playwright/index.mjs node "$ROOT/tools/web/zaplyv_tap.mjs" "http://localhost:8766/zaplyv/" "$B" || rc=1
exit $rc
