// Альманах (Роман 24.11: «он так должен называться»; макет design/zaplyv_almanah_maket.png, гейм-дизайнер): полка с разделами
// и страница по касанию. Картинки — снимки живых моделей из игры (snap из main.js), у гена — твоя клетка с этим геном.
// Тексты — только из книги (kniga/teksty_sushchestv.json, kniga/teksty_genov.json). Чистые функции сверху проверяет test.mjs.

const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

// Все записи: существа из almanah.json и живые гены из книги (у гена ключ игры klyuch). Раздел: life, food, gene.
export function entries(K, G) {
  const out = {};
  for (const [k, it] of Object.entries(K.items)) out[k] = { ...it, sec: it.group === 'food' ? 'food' : 'life' };
  for (const g of Object.values(G?.geny || {})) if (g.klyuch) out['gene:' + g.klyuch] = { group: 'gene', sec: 'gene', gene: g.klyuch, line: g.daet, hint: K.gene_hint, span: K.gene_span, a: -0.35 };
  return out;
}

// Полка: счёт словами, разделы (пустые, кроме открытых с начала, спрятаны), записи раздела по порядку.
export function shelf(K, E, met, sec = 'life') {
  const keys = Object.keys(E), of = s => keys.filter(k => E[k].sec === s && E[k].group !== 'me');
  const n = s => of(s).filter(k => met.has(k)).length;
  const life = n('life'), food = n('food'), genes = n('gene');
  const count = `Ты знаешь ${life} ${plural(life, 'обитателя', 'обитателей', 'обитателей')} капли из ${of('life').length}` +
    ` · ${food} ${plural(food, 'еду', 'еды', 'еды')} из ${of('food').length}` + (genes ? ` · ${genes} ${plural(genes, 'ген', 'гена', 'генов')}` : '');
  const pills = K.sections.filter(([s]) => K.open.includes(s) || n(s)).map(([s, name]) => ({ s, label: n(s) ? `${name} · ${n(s)}` : name }));
  const list = keys.filter(k => E[k].sec === sec);
  return { count, part: (life + food) / (of('life').length + of('food').length), pills, list };
}

// Страница: модель, имя, ярлык, блоки книги; невстреченное — только где искать.
export function page(k, K, E, cards, T, G, met) {
  const it = E[k], color = K.colors[it.group];
  if (!met.has(k)) return { name: it.sec === 'gene' ? 'Ещё не было' : 'Ещё не встречал', line: it.hint || 'Плыви дальше', color, met: false };
  if (it.sec === 'gene') {
    const g = Object.values(G.geny).find(x => x.klyuch === it.gene), P = G.podpisi;
    return { name: g.imya, line: g.daet, size: '', color, met: true,
      blocks: [[P[0].toUpperCase(), g.daet, '#7cc8ff'], [P[1].toUpperCase(), g.priroda, '#b79cff', `Запись ${g.nomer} в книге игры · проверено биологом`]] };
  }
  const c = cards[k], t = T[k] || {};
  const blocks = [['КТО ЭТО', t.kto || c.text, '#7cc8ff']];
  if (t.sovet || c.tip) blocks.push(['СОВЕТ', t.sovet || c.tip, '#ff8a4c']);
  if (t.priroda || c.fact) blocks.push(['В ПРИРОДЕ', t.priroda || c.fact, '#b79cff', t.nomer ? `Запись ${t.nomer} в книге игры · проверено биологом` : 'Из книги игры']);
  return { name: t.imya || c.name, line: it.line, size: it.size || '', color, blocks, met: true };
}

export function almanahScreen({ K, cards, T, G, met, snap, onSwim }) {
  const $ = id => document.getElementById(id);
  const E = entries(K, G), keys = Object.keys(E), shots = new Map();
  let sec = 'life', queue = [], top = 0;
  const pg = k => page(k, K, E, cards, T, G, met);
  const shot = k => { if (!shots.has(k)) { try { shots.set(k, snap(k, E[k])); } catch (e) { shots.set(k, ''); } } return shots.get(k); };
  let opened; try { opened = new Set(JSON.parse(localStorage.getItem('zaplyv.opened') || '[]')); } catch (_) { opened = new Set(); }
  function fill() { const job = queue.shift(); if (!job) return; job.img.src = shot(job.k); requestAnimationFrame(fill); } // по снимку за кадр
  function drawShelf() {
    const S = shelf(K, E, met, sec);
    $('kcount').textContent = S.count; $('kbar').firstElementChild.style.width = Math.round(S.part * 100) + '%';
    const pills = $('kpills'); pills.innerHTML = '';
    for (const p of S.pills) { const b = document.createElement('button'); b.textContent = p.label; b.className = p.s === sec ? 'on' : ''; b.dataset.g = p.s;
      b.onclick = () => { sec = p.s; drawShelf(); }; pills.appendChild(b); }
    const box = $('shelf'); box.innerHTML = ''; queue = [];
    for (const k of S.list) {
      const P = pg(k), b = document.createElement('button');
      b.className = 'kc' + (P.met ? '' : ' no'); b.dataset.k = k; b.style.setProperty('--g', P.met ? P.color : '');
      const img = document.createElement('img'); img.alt = ''; b.appendChild(img);
      if (shots.has(k)) img.src = shots.get(k); else queue.push({ k, img });
      const n = document.createElement('b'); n.textContent = P.name; b.appendChild(n);
      const l = document.createElement('span'); l.textContent = P.line; b.appendChild(l);
      if (P.met && !opened.has(k) && k !== 'me') { const d = document.createElement('i'); d.className = 'new'; b.appendChild(d); }
      b.onclick = () => P.met && openCard(k);
      box.appendChild(b);
    }
    requestAnimationFrame(fill);
  }
  function openCard(k) {
    opened.add(k); try { localStorage.setItem('zaplyv.opened', JSON.stringify([...opened])); } catch (_) {}
    const P = pg(k), card = $('kcard');
    card.style.setProperty('--g', P.color);
    $('kname').textContent = P.name; $('ktag').textContent = P.line; $('ksize').textContent = P.size;
    $('kimg').src = shot(k);
    const box = $('kblocks'); box.innerHTML = '';
    for (const [h, t, c, src] of P.blocks) {
      const d = document.createElement('div'); d.className = 'kb'; d.style.setProperty('--c', c);
      const hh = document.createElement('h3'); hh.textContent = h; d.appendChild(hh);
      const p = document.createElement('p'); p.textContent = t; d.appendChild(p);
      if (src) { const s = document.createElement('small'); s.textContent = src; d.appendChild(s); }
      box.appendChild(d);
    }
    const mine = keys.filter(x => met.has(x) && E[x].sec === E[k].sec), i = mine.indexOf(k), prev = mine[(i - 1 + mine.length) % mine.length], next = mine[(i + 1) % mine.length];
    $('kprev').textContent = '‹ ' + pg(prev).name; $('kprev').onclick = () => openCard(prev);
    $('knext').textContent = pg(next).name + ' ›'; $('knext').onclick = () => openCard(next);
    $('kprev').style.visibility = $('knext').style.visibility = mine.length > 1 ? '' : 'hidden';
    if (!$('kshelf').hidden) top = $('cabinet').scrollTop; // место на полке — вернёмся ровно туда
    $('kshelf').hidden = true; card.hidden = false; $('cabinet').scrollTop = 0;
  }
  function toShelf() { $('kcard').hidden = true; $('kshelf').hidden = false; drawShelf(); $('cabinet').scrollTop = top; }
  function open() { sec = 'life'; $('kcard').hidden = true; $('kshelf').hidden = false; drawShelf(); $('cabinet').classList.add('on'); $('cabinet').scrollTop = 0; }
  function close() { $('cabinet').classList.remove('on'); }
  $('back').onclick = close; $('kback').onclick = toShelf;
  $('kswim').onclick = () => { close(); onSwim(); };
  let sx = null; // смахивание от левого края вправо — назад, как в приложениях iPhone
  $('cabinet').addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX < 28 ? [t.clientX, t.clientY] : null; }, { passive: true });
  $('cabinet').addEventListener('touchend', e => { const t = e.changedTouches[0]; if (sx && t.clientX - sx[0] > 70 && Math.abs(t.clientY - sx[1]) < 60) ($('kcard').hidden ? close : toShelf)(); sx = null; }, { passive: true });
  return { open, close, openCard, entries: E, shot,
    label: () => { const n = keys.filter(k => E[k].sec !== 'gene' && E[k].group !== 'me'); return `Альманах · знаешь ${n.filter(k => met.has(k)).length} из ${n.length}`; } };
}
