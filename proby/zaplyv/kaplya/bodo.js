// Бодо (Bodo saltans) — книга «Правила игры» П37, П39, П78: хозяин главы 1. Сидит на привязи у комка, ест бактерий рывком с замахом,
// сыт после двух на 4 с, растёт от еды и делится пополам на 21. В ручной игре его не было — сделан руками (Роман 26.11: «Воплощай, значит, руками»).
// Живёт в мире ручной игры: w.bodos; комок — из w.crumbs. Свою клетку бодо берёт, если она легче его в bolshe раз; съесть его можно, когда ты тяжелее в bolshe раз.
// Числа — kaplya.json «bodo». Чистая логика без рисования.
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const dlina = (B, m) => B.dlina * Math.cbrt(m / B.massa_delenie); // полудлина тела по массе (объём ~ масса)
export const rot = (B, b) => { const L = dlina(B, b.m); return { x: b.x + Math.cos(b.a) * L, y: b.y + Math.sin(b.a) * L }; };
// Старт главы 1 (П37): бодо 19–21 на комке, рот сомкнут (в нём тает добыча), ты в 180–210 единицах от его рта.
export function nachalo(w, B) { const r = w.r || Math.random, ug = -Math.PI / 2 + (r() - 0.5) * 0.5, /* сверху: внизу строка цели закрывала его; верхняя подсказка уходит через 5 с, хозяин виден в первом кадре (П1, П78) */ ot = B.start_ot[0] + r() * (B.start_ot[1] - B.start_ot[0]), m = B.start_massa[0] + r() * (B.start_massa[1] - B.start_massa[0]);
  const me = w.me[0] || { x: 0, y: 0 }, L = dlina(B, m), x = me.x + Math.cos(ug) * (ot + L), y = me.y + Math.sin(ug) * (ot + L);
  const dom = { x: x + Math.cos(ug) * L * 1.2, y: y + Math.sin(ug) * L * 1.2, m: 4, id: ++w.ids }; w.crumbs.push(dom);
  w.bodos = [{ id: ++w.ids, x, y, a: ug + Math.PI, m, dom, faza: 'sidit', t: 0, syt: B.start_syt, sytN: 0, car: true }]; }
// Кого бодо может взять: бактерий мельче себя в bolshe раз (шарики, соперницы, соседки, тебя)
function dobycha(w, b, B, radius) { let best = null, bd = B.zona; const R = rot(B, b);
  const cand = (q, kto) => { if (q.gone || q.spore > 0) return; if (kto === 'me' && !b.car && q.m >= B.molodoy) return; if (kto === 'me' && w.stats && w.stats.time < (B.tiho_s || 0) && w.zonaGde && w.zonaGde(q.x, q.y) === 'tihaya') return; /* Т2 пачки 2: в тихой воде первые tiho_s секунд тебя не берёт — «охотники тут не охотятся» правда */ /* П78: молодой бодо не берёт тебя с массы molodoy */ const m = q.m || 1; if (m * B.bolshe > b.m) return; const dd = d(R, q) - radius(m); if (dd < bd) { bd = dd; best = { q, kto }; } };
  for (const q of w.me) cand(q, 'me'); for (const q of w.prey) cand(q, 'prey'); for (const q of w.pseudos) cand(q, 'pseudos'); for (const q of w.donors) cand(q, 'donors'); for (const k of ['spirilly', 'kaulo', 'brodyazhki']) for (const q of w[k] || []) cand(q, k); return best; } // бодо ест и спирилл, и каулобактеров (П39)
// Прижат ли бодо к своему комку (П78, законы 21, 22): тело у самого комка. Прижатого можно съесть уже с перевесом B.prizhat (1,3), свободного — только с bolshe (1,8)
export const prizhat = (B, b, radius, a) => { const k = d(b, b.dom), s = d(a, b); return k < radius(b.dom.m || 4) + dlina(B, b.m) * B.prizhat_blizko && s < radius(a.m) + dlina(B, b.m) * 1.3 && ((b.x - a.x) * (b.dom.x - b.x) + (b.y - a.y) * (b.dom.y - b.y)) / (k * s || 1) > B.prizhat_ugol; }; // ты прижимаешь его телом с той стороны, что дальше от комка
export function shag(w, dt, B, radius, slyshu) { if (!w.bodos) return; const novye = [];
  for (const b of w.bodos) { const L = dlina(B, b.m); b.t += dt; b.syt = Math.max(0, b.syt - dt);
    const ugroza = b.car && w.me.find(a => a.m >= b.m * B.prizhat && d(a, b) < B.boy.vidit); // П78: бой на привязи — ты тяжелее хозяина в 1,3 раза и рядом
    if (ugroza && (b.faza === 'sidit' || b.faza === 'otdyh')) { const k = Math.atan2(b.y - b.dom.y, b.x - b.dom.x), ot = Math.atan2(ugroza.y - b.dom.y, ugroza.x - b.dom.x), st = Math.sin(k - ot) >= 0 ? 1 : -1; b.faza = 'boy_zamah'; b.t = 0; b.boy = k + st * B.boy.shag; }
    if (b.faza === 'boy_zamah') { if (b.t >= B.boy.zamah) { b.faza = 'boy_ryvok'; b.t = 0; } } // замах пружиной: задний жгутик натягивается
    else if (b.faza === 'boy_ryvok') { const R = d(b, b.dom) || 1, tx = b.dom.x + Math.cos(b.boy) * R, ty = b.dom.y + Math.sin(b.boy) * R, dd = Math.hypot(tx - b.x, ty - b.y) || 1; b.x += (tx - b.x) / dd * Math.min(dd, B.boy.v * dt); b.y += (ty - b.y) / dd * Math.min(dd, B.boy.v * dt); b.a = Math.atan2(ty - b.y, tx - b.x);
      if (b.t >= B.boy.ryvok) { b.faza = 'boy_otdyh'; b.t = 0; } } // прыжок по кругу вокруг комка, прочь от тебя
    else if (b.faza === 'boy_otdyh') { if (b.t >= B.boy.otdyh) { b.faza = 'sidit'; b.t = 0; } }
    else     if (b.faza === 'sidit') { const c = !b.syt && dobycha(w, b, B, radius); // сидит у комка, нос качается; увидел добычу — замах
      const k = d(b, b.dom), cel = Math.atan2(b.dom.y - b.y, b.dom.x - b.x) + Math.PI; b.a += Math.atan2(Math.sin(cel - b.a), Math.cos(cel - b.a)) * Math.min(1, dt * 2) + Math.sin(b.t * 1.7 + b.id) * 0.4 * dt;
      if (k > L * 1.3) { b.x += (b.dom.x - b.x) / k * B.hod * dt; b.y += (b.dom.y - b.y) / k * B.hod * dt; }
      if (c) { b.faza = 'zamah'; b.t = 0; b.cel = c; } }
    else if (b.faza === 'zamah') { const q = b.cel.q, ug = Math.atan2(q.y - b.y, q.x - b.x); b.a += Math.atan2(Math.sin(ug - b.a), Math.cos(ug - b.a)) * Math.min(1, dt * 10); // поворачивается к добыче, нос краснеет
      if (q.gone || b.t >= B.ryvok.zamah) { b.faza = q.gone ? 'otdyh' : 'ryvok'; b.t = 0; } }
    else if (b.faza === 'ryvok') { b.x += Math.cos(b.a) * B.ryvok.v * dt; b.y += Math.sin(b.a) * B.ryvok.v * dt; const { q, kto } = b.cel, R = rot(B, b);
      if (!q.gone && d(R, q) < radius(q.m || 1) + L * 0.4 && (q.m || 1) * B.bolshe <= b.m) { // схватил: добыча тает внутри, половина массы в рост (закон 17)
        if (kto === 'me') w.lose(q, q.x, q.y, 'bodo'); else { q.gone = true; w[kto] = w[kto].filter(o => o !== q); }
        b.m += (q.m || 1) * B.rost; b.sytN++; if (b.sytN >= B.syt.n) { b.syt = B.syt.t; b.sytN = 0; } slyshu('bodo_el', b, kto); b.faza = 'otdyh'; b.t = 0; }
      else if (b.t >= B.ryvok.t) { b.faza = 'otdyh'; b.t = 0; } }
    else if (b.faza === 'otdyh' && b.t >= B.ryvok.otdyh) { b.faza = 'sidit'; b.t = 0; }
    const k = d(b, b.dom), P = B.privyaz * 2 * L; if (k > P) { b.x = b.dom.x + (b.x - b.dom.x) * P / k; b.y = b.dom.y + (b.y - b.dom.y) * P / k; } // привязь: задний жгутик держит у комка
    if (b.car && !b.delilsya && w.stats && w.stats.time >= (b.delit_v ??= B.delenie_start[0] + (w.r || Math.random)() * (B.delenie_start[1] - B.delenie_start[0]))) b.m = Math.max(b.m, B.massa_delenie); // П78: хозяин делится на глазах в первые 5–15 с
    if (b.m >= B.massa_delenie) { b.m /= 2; b.delilsya = true; const o = { ...b, id: ++w.ids, car: false, a: b.a + Math.PI * 0.6, x: b.x + Math.cos(b.a + 1.6) * L, y: b.y + Math.sin(b.a + 1.6) * L, faza: 'otdyh', t: 0 }; o.dom = { id: ++w.ids, x: b.dom.x + Math.cos(b.a + 1.6) * B.sosed, y: b.dom.y + Math.sin(b.a + 1.6) * B.sosed, m: 4 }; w.crumbs.push(o.dom); o.x = o.dom.x; o.y = o.dom.y; novye.push(o); slyshu('bodo_delenie', b); } }
  w.bodos.push(...novye); }
// Своя клетка глотает бодо, когда тяжелее его в bolshe раз и коснулась (как «Глотать» в evo.js: добыча тает внутри, масса в рост)
export function glotat(w, B, radius, syt, t, umeet, slyshu) { if (!w.bodos || !umeet) return;
  for (const a of w.me) for (const b of w.bodos) if (!b.gone && !(w.zhivoe && w.zhivoe(b, 'bodos')) && a.m >= b.m * (prizhat(B, b, radius, a) ? B.prizhat : B.bolshe) && d(a, b) < radius(a.m) + dlina(B, b.m)) { b.gone = true; w.gulps = w.gulps || []; w.gulps.push({ a, x: b.x, y: b.y, x0: b.x, y0: b.y, m: b.m, who: 'bodo', t: 0 }); w.syel = w.syel || {}; w.syel.bodo = (w.syel.bodo || 0) + 1; slyshu('bodo_syela', b); }
  w.bodos = w.bodos.filter(b => !b.gone); }
