// Замер нагрузки движка (шаг 75_dvizhok_nagruzka.sh): стенд proby/zaplyv/stend/list.html ставит на экран iPhone 16 (393×852, плотность 3)
// N существ из случайных записей (sluchaynaya, основа «наша»), в покое и на ходу. Каждый кадр зовём window.stend(1/60) сами (?zapis=1),
// меряем: время сборки и отправки кадра на процессоре (stend: sobrat_gruppu всех + bodies.end + render), число вызовов рисования
// (обёртка drawElements/drawArrays и их *Instanced у WebGL1/2, ставится до загрузки страницы) и треугольники.
// Вывод: строка «НАГРУЗКА: …» на каждый замер и JSON в конце (для порогов в шаге).
// Запуск: node tools/web/dvizhok_nagruzka.mjs <адрес stend/list.html> [кадров]
const { chromium } = await import(process.env.PW || 'playwright').then(m => m.default || m);
const url = process.argv[2], MIR = /mir\.html/.test(url), KADROV = +(process.argv[3] || 90), PROGREV = 20;
const ZAMERY = (process.env.ZAMERY || '30:0,30:1,100:0,100:1').split(',').map(s => { const [n, beg] = s.split(':').map(Number); return { n, beg }; });
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const itog = [];
for (const { n, beg } of ZAMERY) {
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const oshibki = []; p.on('pageerror', e => oshibki.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) oshibki.push(m.text().slice(0, 200)); });
  await p.addInitScript(() => {
    window.__gl = { calls: 0, tri: 0 };
    const MODE_TRI = { 4: 1, 5: 1, 6: 1 }; // TRIANGLES, STRIP, FAN
    const tri = (mode, count, inst = 1) => { if (MODE_TRI[mode]) window.__gl.tri += (mode === 4 ? count / 3 : Math.max(0, count - 2)) * inst; };
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) { if (!C) continue; const P = C.prototype;
      for (const [k, f] of [['drawElements', a => tri(a[0], a[1])], ['drawArrays', a => tri(a[0], a[2])], ['drawElementsInstanced', a => tri(a[0], a[1], a[4])], ['drawArraysInstanced', a => tri(a[0], a[2], a[3])]]) {
        const o = P[k]; if (!o) continue; P[k] = function (...a) { window.__gl.calls++; f(a); return o.apply(this, a); }; } }
    const ext = WebGLRenderingContext.prototype.getExtension; // WebGL1: ANGLE_instanced_arrays
    WebGLRenderingContext.prototype.getExtension = function (name) { const e = ext.call(this, name);
      if (e && name === 'ANGLE_instanced_arrays' && !e.__w) { for (const [k, i] of [['drawElementsInstancedANGLE', 4], ['drawArraysInstancedANGLE', 3]]) { const o = e[k].bind(e); e[k] = (...a) => { window.__gl.calls++; return o(...a); }; } e.__w = 1; } return e; };
  });
  const stolb = n <= 30 ? 5 : 10, z = n <= 30 ? 1 : 0.55;
  // list.html: n случайных записей сеткой; mir.html: живой мир записью, на экране столько, сколько вошло в окно (z — приближение)
  await p.goto(MIR ? `${url}?zapis=1&z=${process.env.MIR_Z || 2}&seed=1` : `${url}?zapis=1&n=${n}&stolb=${stolb}&z=${z}&beg=${beg}&seed=5`, { timeout: 60000 });
  await p.waitForFunction(() => window.stendReady, null, { timeout: 30000 }).catch(() => {});
  const r = await p.evaluate(async ({ K, W }) => {
    if (!window.stend) return { net: 'нет window.stend' };
    // Bodies из того же модуля, что у страницы: ловим экземпляр и время от begin до end (сборка частей)
    const { Bodies } = await import(new URL('../body3d.js', location.href).href), tm = {};
    const b0 = Bodies.prototype.begin, e0 = Bodies.prototype.end;
    Bodies.prototype.begin = function (...a) { tm.inst = this; tm.b = performance.now(); return b0.apply(this, a); };
    Bodies.prototype.end = function (...a) { tm.e = performance.now(); return e0.apply(this, a); };
    for (let i = 0; i < W; i++) window.stend(1 / 60);
    // где время: сборка (от bodies.begin до bodies.end: sobrat_gruppu всех существ) и остальное (запись буферов в end, render)
    const cpu = [], calls = [], tri = [], sb = [];
    for (let i = 0; i < K; i++) { const c0 = __gl.calls, t0 = __gl.tri, s = performance.now(); window.stend(1 / 60); cpu.push(performance.now() - s); calls.push(__gl.calls - c0); tri.push(__gl.tri - t0); if (tm.e) sb.push(tm.e - tm.b); }
    // разбивка треугольников по сеткам Bodies (последний кадр): имя поля, вызовов-сеток, экземпляров, треугольников
    const razb = {}; const B = tm.inst;
    if (B) for (const [k, v] of Object.entries(B)) { const ms = v?.isMesh ? [v] : Array.isArray(v?.m) ? v.m.slice(0, v.n) : [];
      for (const m of ms) { const g = m.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3, c = m.isInstancedMesh ? m.count : (g.instanceCount ?? 1);
        if (!c) continue; const r = razb[k] || (razb[k] = { setok: 0, ekz: 0, tri: 0 }); r.setok++; r.ekz += c; r.tri += t * c; } }
    const med = a => [...a].sort((x, y) => x - y)[a.length >> 1], p90 = a => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.9)];
    // полный кадр с ожиданием видеокарты (readPixels ждёт конца рисования): здесь программная, на телефоне иначе — только для паспорта
    const cv = document.querySelector('canvas'), ctx = cv.getContext('webgl2') || cv.getContext('webgl'), px = new Uint8Array(4), full = [];
    for (let i = 0; i < 10; i++) { const s = performance.now(); window.stend(1 / 60); ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px); full.push(performance.now() - s); }
    // не пустая сцена: доля закрашенных точек кадра не фоном (паспорт, правило 3.3)
    const w = ctx.drawingBufferWidth, h = ctx.drawingBufferHeight; window.stend(1 / 60); const all = new Uint8Array(w * h * 4); ctx.readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, all);
    let yarko = 0; for (let i = 0; i < all.length; i += 4 * 7) if (all[i] + all[i + 1] + all[i + 2] > 150) yarko++;
    return { razb, vidno: window.vidno, sborka: sb.length ? med(sb) : -1, sushchestv: window.vidno ?? (window.zapisi || []).length, cpu: med(cpu), cpu90: p90(cpu), calls: med(calls), callsMax: Math.max(...calls), tri: med(tri), full: med(full), yarko: yarko / (all.length / 4 / 7), ekran: w + '×' + h };
  }, { K: KADROV, W: PROGREV });
  r.n = n; r.beg = beg; r.oshibki = oshibki; itog.push(r);
  console.log(r.net ? `НАГРУЗКА: ${n} ${beg ? 'на ходу' : 'в покое'}: ${r.net}` :
    `НАГРУЗКА: ${n} ${beg ? 'на ходу' : 'в покое'}: существ ${r.sushchestv}, вызовов рисования ${r.calls} (наибольший ${r.callsMax}), треугольников ${Math.round(r.tri / 1000)} тыс., ` +
    `кадр на процессоре ${r.cpu.toFixed(2)} мс (90% ${r.cpu90.toFixed(2)}; из них сборка частей ${r.sborka.toFixed(2)}), с видеокартой ${r.full.toFixed(0)} мс (программная), экран ${r.ekran}, светлого ${(r.yarko * 100).toFixed(1)}%, ошибок ${oshibki.length}`);
  if (process.env.RAZBIVKA && r.razb) console.log('  сетки: ' + Object.entries(r.razb).sort((a, b) => b[1].tri - a[1].tri).map(([k, v]) => `${k} ${Math.round(v.tri / 1000)} тыс. (сеток ${v.setok}, экз. ${v.ekz})`).join('; '));
  for (const o of oshibki.slice(0, 3)) console.log('  ошибка страницы: ' + o);
  await p.close();
}
await b.close();
console.log('JSON ' + JSON.stringify(itog));
