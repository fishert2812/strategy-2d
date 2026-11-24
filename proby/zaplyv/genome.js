// Экран генома на паузе (книга, раздел 7, Э6; макет design/zaplyv_genom_maket.png): кольцо ДНК вокруг твоей клетки.
// 12 своих генов кишечной палочки в трёх дугах — видны все: проснувшиеся светятся, спящие тусклые в пунктире.
// Справа «Чужие» — плазмиды и вставки фагов, пустые с «?». Касание гена — карточка внизу и мигание его части на клетке.
const NS = 'http://www.w3.org/2000/svg';
const R0 = 110, R1 = 148, GAP = 1.5;

// Все места по порядку: { slot, arc, color, a0, a1 (градусы) | x, y для чужих }. Без DOM — проверяется тестом.
export function layout(G) {
  const out = [];
  const N = G.arcs.reduce((n, a) => n + a.slots.length, 0), step = 360 / N; let j = 0; // мест столько, сколько генов: шаг 360/N
  G.arcs.forEach((arc, k) => arc.slots.forEach((slot) => {
    const a0 = -90 + j++ * step; // сверху метка ori — с неё начинается копирование кольца, дальше по часовой
    out.push({ slot, arc: k, color: arc.color, a0: a0 + GAP, a1: a0 + step - GAP, plasmid: false });
  }));
  G.plasmids.forEach((slot, i) => out.push({ slot, arc: -1, color: slot.color, x: 205, y: 70 + i * 66, plasmid: true }));
  return out;
}

// Что написать на карточке гена. genes — гены клетки, from — откуда пришли, names — data.json genes.
export function card(slot, genes, from, names, G, arcName) {
  const live = slot.id && names[slot.id], have = !!(live && genes[slot.id]);
  if (!live) return { title: slot.name, latin: slot.gene === '?' ? '' : slot.gene, have, sub: (arcName ? arcName + ' · ' : '') + 'спит',
    lines: [['Даст', slot.soon], ['Откуда', slot.gene === '?' ? 'пусто' : G.from.none]] };
  const pipe = (G.pipe || []).includes(slot.id); // по трубочке ходят только плазмидные гены (data.json plasmid_genes)
  return { title: names[slot.id][0], latin: slot.gene === slot.id ? '' : slot.gene /* у умения без одного настоящего гена латыни нет (книга) */, have, sub: (arcName ? arcName + ' · ' : 'чужой · ') + (have ? G.from[from[slot.id]] || G.from.kid : 'спит'),
    lines: [['В игре', names[slot.id][1]], ['На теле', slot.body], ['В науке', slot.science]].concat(have ? [] : [['Откуда', pipe ? G.from.canpipe : G.from.can]]) };
}

const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; };
const pt = (r, deg) => { const t = deg * Math.PI / 180; return `${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`; };

export function genomeScreen({ G, cfg, world, icon = () => '', onOpen, onClose, onCabinet, onSend = () => {}, onDraw = () => {} }) {
  const $ = id => document.getElementById(id);
  const svg = $('ring'), box = $('gcard');
  const S = { open: false, blink: null }; G.pipe = cfg.plasmid_genes;
  let pick = null;

  function draw() {
    const w = world(), all = layout(G);
    svg.innerHTML = '';
    el('circle', { r: R0 + 700, fill: 'none', stroke: 'rgba(2,4,10,0.62)', 'stroke-width': 1400 }, svg); // мир вокруг тускнеет, клетка в середине видна
    el('circle', { r: (R0 + R1) / 2, fill: 'none', stroke: 'rgba(2,4,10,0.55)', 'stroke-width': R1 - R0 + 10 }, svg);
    for (const p of all) {
      const id = p.slot.id, live = id && cfg.genes[id], have = live && w.genes[id], on = pick === p.slot;
      const s = el('g', { class: 'slot' }, svg);
      let tx, ty;
      if (!p.plasmid) {
        el('path', { d: `M${pt(R1, p.a0)} A${R1} ${R1} 0 0 1 ${pt(R1, p.a1)} L${pt(R0, p.a1)} A${R0} ${R0} 0 0 0 ${pt(R0, p.a0)} Z`,
          fill: p.color, 'fill-opacity': have ? 0.9 : 0.1, stroke: on ? '#fff' : p.color, 'stroke-width': on ? 2.5 : 1.2,
          'stroke-dasharray': have || on ? 'none' : '4 3', 'stroke-opacity': have || on ? 1 : 0.7 }, s);
        const m = (p.a0 + p.a1) / 2 * Math.PI / 180, r = (R0 + R1) / 2; tx = r * Math.cos(m); ty = r * Math.sin(m);
      } else {
        tx = p.x; ty = p.y;
        if (have) el('circle', { cx: tx, cy: ty, r: 34, fill: p.color, opacity: 0.15 }, s); // колечко светится
        el('circle', { cx: tx, cy: ty, r: 25, fill: 'rgba(2,4,10,0.6)', stroke: on ? '#fff' : p.color, 'stroke-width': have ? 7 : 4, 'stroke-dasharray': have ? 'none' : '3 4', opacity: have || on ? 1 : 0.6 }, s);
      }
      const src = live ? icon(id) : '';
      if (src) { // значок гена: снимок клетки, подсвечена часть, которую он даёт; включённый — ярко, спящий — тускло
        const r = p.plasmid ? 21 : 17, cid = 'gc' + id;
        el('circle', { cx: tx, cy: ty, r, id: cid }, el('clipPath', { id: 'k' + cid }, s));
        el('image', { href: src, x: tx - r, y: ty - r, width: 2 * r, height: 2 * r, 'clip-path': `url(#k${cid})`, opacity: have ? 1 : 0.6 }, s);
        el('circle', { cx: tx, cy: ty, r, fill: 'none', stroke: p.color, 'stroke-width': have ? 2 : 1, opacity: have ? 1 : 0.6 }, s);
      }
      const t = el('text', { x: tx, y: src ? ty + (p.plasmid ? 38 : 0) : ty + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-style': 'italic', 'font-weight': have ? 700 : 400,
        fill: have && !p.plasmid ? '#02040a' : p.color, opacity: have ? 1 : 0.75, 'font-family': 'ui-monospace, Menlo, monospace' }, s);
      t.textContent = src && !p.plasmid ? '' : p.slot.gene; // на кольце у живого гена — значок, латинское имя в карточке
      el('circle', { cx: tx, cy: ty, r: 36, fill: 'transparent' }, s); // касание: не меньше 44 pt и в Safari, где кольцо мельче (урок L017); соседние места не налезают: между центрами 67
      s.onclick = e => { e.stopPropagation(); select(p.slot, p.arc); };
    }
    G.arcs.forEach((arc, k) => { // подписи дуг снаружи, у середины своей дуги
      const mine = all.filter(p => p.arc === k), m = (mine[0].a0 + mine[mine.length - 1].a1) / 2 * Math.PI / 180, r = R1 + 20;
      el('text', { x: r * Math.cos(m) + (k === 0 ? 8 : k === 2 ? -8 : 0), y: r * Math.sin(m) + 5, 'text-anchor': k === 0 ? 'start' : k === 2 ? 'end' : 'middle', fill: arc.color, 'font-size': 12, 'letter-spacing': 2 }, svg).textContent = arc.name.toUpperCase();
    });
    el('text', { x: 205, y: 28, 'text-anchor': 'middle', fill: '#7dffb0', 'font-size': 12, 'letter-spacing': 2 }, svg).textContent = 'ЧУЖИЕ';
    el('line', { x1: 0, y1: -R1 - 8, x2: 0, y2: -R0 + 4, stroke: '#fff', 'stroke-width': 2, opacity: 0.8 }, svg); // ori
    el('text', { x: 0, y: -R1 - 13, 'text-anchor': 'middle', fill: '#fff', 'font-size': 12, opacity: 0.6 }, svg).textContent = 'ori';
    const own = all.filter(p => !p.plasmid), n = own.filter(p => w.genes[p.slot.id]).length, np = all.filter(p => p.plasmid && w.genes[p.slot.id]).length;
    $('gchips').innerHTML = `<span>включено ${n} из ${own.length}</span><span>чужих ${np}</span>`;
    const send = document.createElement('button'); send.id = 'gsend'; send.className = 'flag'; send.style.display = 'none'; send.onclick = onSend; $('gchips').appendChild(send); onDraw();
    $('gsub').textContent = `поколение ${w.stats.gen} · кишечная палочка`;
  }

  function select(slot, arc) {
    pick = slot; const w = world(), c = card(slot, w.genes, w.from || {}, cfg.genes, G, arc >= 0 ? G.arcs[arc].name : '');
    S.blink = slot.id && cfg.genes[slot.id] ? slot.id : null; // на клетке мигает то, что меняет ген (спящий — показывает, каким станешь)
    box.innerHTML = '';
    if (slot.id && cfg.genes[slot.id] && icon(slot.id)) { const im = document.createElement('img'); im.className = 'gicon big'; im.alt = ''; im.src = icon(slot.id); im.style.borderColor = arc >= 0 ? G.arcs[arc].color : slot.color; box.appendChild(im); }
    const h = document.createElement('h2'); h.textContent = c.title + ' '; const i = document.createElement('i'); i.textContent = c.latin; h.appendChild(i); box.appendChild(h);
    const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = c.sub; box.appendChild(sub);
    for (const [k, v] of c.lines) { const p = document.createElement('p'); const b = document.createElement('b'); b.textContent = k; p.appendChild(b); p.appendChild(document.createTextNode(v)); box.appendChild(p); }
    box.classList.toggle('no', !c.have);
    draw();
  }

  function open() {
    if (S.open) return; S.open = true; pick = null; S.blink = null;
    box.innerHTML = '<p class="hint">Это твоё кольцо ДНК. Светятся включённые гены. Коснись гена — увидишь, что он делает и где он на клетке.</p>'; box.classList.remove('no');
    draw(); $('genome').classList.add('on'); onOpen();
  }
  function close() { if (!S.open) return; S.open = false; S.blink = null; $('genome').classList.remove('on'); onClose(); }
  $('pause').onclick = open;
  $('gon').onclick = close; $('gback').onclick = close;
  $('gcab').onclick = onCabinet;
  S.openScreen = open; S.close = close;
  S.center = () => { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = Math.min(r.width / vb.width, r.height / vb.height); return [(r.left + r.width / 2 - (vb.x + vb.width / 2) * k) / innerWidth, (r.top + r.height / 2 - (vb.y + vb.height / 2) * k) / innerHeight]; }; // где центр кольца на экране — туда ставим клетку
  S.inner = () => { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return R0 * Math.min(r.width / vb.width, r.height / vb.height); }; // радиус окна внутри кольца, px
  S.select = (id) => { const p = layout(G).find(p => p.slot.id === id); if (p) select(p.slot, p.arc); };
  return S;
}
