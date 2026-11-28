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
export function shelf(K, E, met, sec = 'life', P = {}) {
  const keys = Object.keys(E), of = s => keys.filter(k => E[k].sec === s && E[k].group !== 'me');
  const n = s => of(s).filter(k => met.has(k)).length;
  const life = n('life'), food = n('food'), genes = n('gene');
  const count = `Ты знаешь ${life} ${plural(life, 'обитателя', 'обитателей', 'обитателей')} капли из ${of('life').length}` +
    ` · ${food} ${plural(food, 'еду', 'еды', 'еды')} из ${of('food').length}` + (genes ? ` · ${genes} ${plural(genes, 'ген', 'гена', 'генов')}` : '');
  const schet = K.schet ? K.schet.replace('{o}', life).replace('{O}', of('life').length).replace('{e}', food).replace('{E}', of('food').length) + (genes ? K.schet_geny.replace('{g}', genes) : '') : count; /* «Капля», экраны 28.11: короткий счёт в одну строку */
  const pills = K.sections.filter(([s]) => K.open.includes(s) || n(s)).map(([s, name]) => ({ s, label: n(s) ? `${name} · ${n(s)}` : name }));
  const list = keys.filter(k => E[k].sec === sec).sort((a, b) => K.schet ? (met.has(b) || E[b].group === 'me') - (met.has(a) || E[a].group === 'me') : 0); /* «Капля»: известные первыми */
  const note = { life: P.almanah_cveta, food: P.eda_tochki }[sec] || ''; // как в жизни и как у нас (книга, подписи): цвета — наши метки, еду не видно
  return { count: schet, part: (life + food) / (of('life').length + of('food').length), pills, list, note };
}

// Страница: модель, имя, ярлык, блоки книги; невстреченное — только где искать.
export function page(k, K, E, cards, T, G, met) {
  const it = E[k], color = K.colors[it.group];
  if (!met.has(k)) { const grp = it.sec === 'gene' && K.schet && (G?.gruppa || {})[it.gene]; return { name: it.sec === 'gene' ? (grp ? 'Ген · ' + grp : 'Ещё не было') : K.schet ? K.schet_ne_vstrechen : 'Ещё не встречал', line: it.hint || 'Плыви дальше', color, met: false }; } /* «Капля», экраны 28.11: у закрытых генов видна их группа, заглушки не одинаковые */
  if (it.sec === 'gene') {
    const g = Object.values(G.geny).find(x => x.klyuch === it.gene), P = G.podpisi;
    const grp = (G.gruppa || {})[it.gene]; // подзаголовок — группа и номер записи, текст только в блоке (приёмка дизайнера)
    return { name: g.imya, line: (grp ? grp + ' · ' : '') + g.nomer, size: '', color, met: true,
      blocks: [[P[0].toUpperCase(), g.daet, '#7cc8ff'], [P[1].toUpperCase(), g.priroda, '#b79cff', 'Проверено биологом', g.nomer]] }; // номер записи книги — для проверок, игроку не показываем (прогон 0.74)
  }
  const c = cards[k], t = T[k] || {};
  const blocks = [['КТО ЭТО', t.kto || c.text, '#7cc8ff']];
  if (t.sovet || c.tip) blocks.push(['СОВЕТ', t.sovet || c.tip, '#ff8a4c']);
  if (t.priroda || c.fact) blocks.push(['В ПРИРОДЕ', t.priroda || c.fact, '#b79cff', t.nomer ? 'Проверено биологом' : 'Из книги игры', t.nomer]);
  return { name: t.imya || c.name, line: it.line, size: it.size || '', color, blocks, met: true };
}

// Связи карточки (книга, kniga/kto_s_kem.json): только то, что есть в игре (st «igra»), без «ничего». Подписи групп — по стороне связи,
// текст строки — из книги. Порядок: кто опасен для этого существа, потом кого оно ест и остальное.
const LINK_HEAD = { b: { est: 'КТО ЕСТ', zarazhaet: 'КТО ЗАРАЖАЕТ', byot: 'КТО БЬЁТ', pomogaet: 'КТО ПОМОГАЕТ', sopernik: 'С КЕМ СОПЕРНИЧАЕТ' },
  a: { est: 'КОГО ЕСТ', zarazhaet: 'КОГО ЗАРАЖАЕТ', byot: 'КОГО БЬЁТ', pomogaet: 'КОМУ ПОМОГАЕТ', sopernik: 'С КЕМ СОПЕРНИЧАЕТ' } };
export function links(k, S) {
  const out = [];
  for (const side of ['b', 'a']) for (const z of Object.keys(LINK_HEAD[side])) {
    const rows = (S?.svyazi || []).filter(x => x.st === 'igra' && x.z === z && x[side] === k && x.a !== x.b).map(x => ({ k: x[side === 'a' ? 'b' : 'a'], t: x.t }));
    const head = LINK_HEAD[side][z], have = out.find(g => g.head === head);
    if (have) have.rows.push(...rows.filter(r => !have.rows.some(q => q.k === r.k))); else if (rows.length) out.push({ head, rows });
  }
  return out;
}

export function almanahScreen({ K, cards, T, G, S, P = {}, met, snap, onSwim, onNav = () => {} }) {
  const $ = id => document.getElementById(id);
  const E = entries(K, G), keys = Object.keys(E), shots = new Map();
  let sec = 'life', queue = [], top = 0, cur = null; const hist = []; // hist — карточки, с которых пришёл по связи: «‹ имя» возвращает туда
  const pg = k => page(k, K, E, cards, T, G, met);
  const shot = k => { if (!shots.has(k)) { try { shots.set(k, snap(k, E[k])); } catch (e) { shots.set(k, ''); } } return shots.get(k); };
  let opened; try { opened = new Set(JSON.parse(localStorage.getItem('zaplyv.opened') || '[]')); } catch (_) { opened = new Set(); }
  function fill() { const job = queue.shift(); if (!job) return; job.img.src = shot(job.k); requestAnimationFrame(fill); } // по снимку за кадр
  function drawShelf() {
    const S = shelf(K, E, met, sec, P); $('knote').textContent = S.note; $('knote').hidden = !S.note;
    $('kcount').textContent = S.count; $('kbar').firstElementChild.style.width = Math.round(S.part * 100) + '%';
    const pills = $('kpills'); pills.innerHTML = '';
    for (const p of S.pills) { const b = document.createElement('button'); b.textContent = p.label; b.className = p.s === sec ? 'on' : ''; b.dataset.g = p.s;
      b.onclick = () => { sec = p.s; drawShelf(); }; pills.appendChild(b); }
    const box = $('shelf'); box.innerHTML = ''; queue = [];
    for (const k of S.list) {
      const P = pg(k), b = document.createElement('button');
      b.className = 'kc' + (P.met ? '' : ' no') + (E[k].sec === 'gene' ? ' gen' : ''); b.dataset.k = k; b.style.setProperty('--g', P.met ? P.color : '');
      const img = document.createElement('img'); img.alt = ''; b.appendChild(img);
      if (shots.has(k)) img.src = shots.get(k); else queue.push({ k, img });
      const n = document.createElement('b'); n.textContent = P.name; b.appendChild(n);
      const l = document.createElement('span'); l.textContent = P.met ? E[k].line || P.line : P.line; b.appendChild(l); // на полке — главное одной строкой
      if (P.met && !opened.has(k) && k !== 'me') { const d = document.createElement('i'); d.className = 'new'; if (K.schet) d.textContent = 'новое'; b.appendChild(d); }
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
    const L = $('klinks'); L.innerHTML = '';
    for (const g of links(k, S).filter(g => g.rows.some(r => E[r.k]))) { const h = document.createElement('h3'); h.textContent = g.head; L.appendChild(h);
      for (const r of g.rows.filter(r => E[r.k])) { const P2 = pg(r.k), b = document.createElement('button'); b.className = 'kl' + (P2.met ? '' : ' no'); b.dataset.k = r.k;
        const im = document.createElement('img'); im.alt = ''; im.src = shot(r.k); b.appendChild(im);
        const sp = document.createElement('span'), n = document.createElement('b'), t = document.createElement('small'); n.textContent = P2.name; t.textContent = P2.met ? r.t : P2.line; sp.append(n, t); b.appendChild(sp);
        if (P2.met) { const i = document.createElement('i'); i.textContent = '›'; b.appendChild(i); b.onclick = () => { hist.push(k); openCard(r.k); }; } L.appendChild(b); } }
    if (!$('kshelf').hidden) top = $('cabinet').scrollTop; // место на полке — вернёмся ровно туда
    $('kshelf').hidden = true; card.hidden = false; $('cabinet').scrollTop = 0; cur = k; nav();
  }
  function toShelf() { $('kcard').hidden = true; $('kshelf').hidden = false; cur = null; hist.length = 0; drawShelf(); $('cabinet').scrollTop = top; nav(); }
  const where = () => cur ? (hist.length ? pg(hist[hist.length - 1]).name : 'Альманах') : null; // куда ведёт «назад»: прошлая карточка, полка, или наружу (null)
  function nav() { $('back').textContent = '‹ ' + (where() || api.from || 'Назад'); onNav(); }
  function goBack() { if (hist.length) openCard(hist.pop()); else if (cur) toShelf(); else (api.back || close)(); }
  function open(from) { api.from = from; hist.length = 0; cur = null; sec = 'life'; $('kcard').hidden = true; $('kshelf').hidden = false; drawShelf(); $('cabinet').classList.add('on'); $('cabinet').scrollTop = 0; nav(); }
  function close() { $('cabinet').classList.remove('on'); }
  $('back').onclick = goBack;
  $('kswim').onclick = () => { close(); onSwim(); };
  let sx = null; // смахивание от левого края вправо — назад, как в приложениях iPhone
  $('cabinet').addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX < 28 ? [t.clientX, t.clientY] : null; }, { passive: true });
  $('cabinet').addEventListener('touchend', e => { const t = e.changedTouches[0]; if (sx && t.clientX - sx[0] > 70 && Math.abs(t.clientY - sx[1]) < 60) goBack(); sx = null; }, { passive: true });
  const api = { back: null, from: '', open, close, openCard, goBack, where, entries: E, shot,
    label: () => { const n = s => keys.filter(k => E[k].sec === s && E[k].group !== 'me'), m = s => n(s).filter(k => met.has(k)).length; return `Альманах · обитатели ${m('life')} из ${n('life').length} · еда ${m('food')} из ${n('food').length}`; } }; // тот же счёт, что на полке (прогон 0.68, О52: «6 из 12» снаружи спорил с «4 из 10 + 2 еды» внутри)
  return api;
}
