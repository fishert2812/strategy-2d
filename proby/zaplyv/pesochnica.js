// Песочница движка (Роман 25.11: «дайте мне потестировать движок покажите что с ним получается»; план, этап Б).
// Адрес: /zaplyv/?pesochnica. Та же игра и тот же рисунок, но вода пустая: клетка одна, умения включаются касанием,
// «Мутировать» ставит случайное допустимое. Правила сочетаний — pravila.json (биолог): места на коже и «нельзя вместе»;
// отказ объясняется словами. Соседей и еду добавляют кнопки. main.js только подключает этот файл по адресу.
const P = await (await fetch('pravila.json')).json(), S = P.slova;
const [KN, DV] = typeof document !== 'undefined' ? await Promise.all([import('./konstruktor.js'), import('./dvizhok.js')]) : [];
const GENY = await fetch('kniga/teksty_genov.json').then(r => r.json()).catch(() => ({ geny: {} }));
const kniga = Object.fromEntries(Object.values(GENY.geny || {}).filter(g => g.klyuch).map(g => [g.klyuch, g])); // имена и «что даёт» — только книга

// Чистые правила (проверяет test_pesochnica.mjs): сколько мест занято, можно ли поставить умение и почему нет.
export const zanyato = (genes, R = P) => Object.keys(genes).filter(g => genes[g]).reduce((n, g) => n + (R.kozha[g] || 0), 0);
export function mozhno(genes, g, R = P) {
  for (const z of R.nelzya) { const s = [z.a, ...z.b]; if (!s.includes(g)) continue;
    const vs = (g === z.a ? z.b : [z.a]).find(o => genes[o]); if (vs) return { net: 'nelzya', s: vs, n: z.n, pochemu: z.pochemu }; }
  if ((R.kozha[g] || 0) && zanyato(genes, R) + R.kozha[g] > R.mest) return { net: 'mesto' };
  return null;
}
// Одна мутация: случайное умение из тех, что можно поставить сейчас; rnd — число от 0 до 1.
export function mutaciya(genes, vse, rnd, R = P) { const ok = vse.filter(g => !genes[g] && !mozhno(genes, g, R)); return ok.length ? ok[Math.floor(rnd * ok.length)] : null; }

if (typeof document !== 'undefined') {
  const el = (tag, cls, text, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
  el('style', '', `#hud,#pause,#flag,#scalebox,#growbar,#toast,#ver{display:none!important}
#c{transform:translateY(-20vh)}
body:has(.layer.on) #pk,body:has(.layer.on) #pt{display:none}
#pk{position:fixed;left:0;right:0;bottom:0;z-index:20;padding:8px 10px calc(env(safe-area-inset-bottom) + 8px);background:linear-gradient(#02040a00,#02040af2 9%);font:15px/1.3 -apple-system,system-ui,sans-serif;color:#dff3f5;touch-action:pan-y}
#pk .ryad{display:flex;gap:6px;padding:4px 0}#pk .ryad button{flex:1;padding:0 6px;font-size:14px}
#pk .setka{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px}#pk .polz{display:block;font-size:13.5px}#pk .polz span{display:block}#pk .polz input{display:block;width:100%;height:26px;margin:0;accent-color:#8fe6f2}body.kon #pt .kozha{visibility:hidden}
#pk .zak{font-size:13.5px;line-height:1.3;padding:3px 0;color:#bfe6ea;min-height:36px}#pk .setka{margin-top:8px}#pk .zak b{display:inline-block;margin-right:6px;color:#fff;font-weight:600;font-size:15px}#pk .kon>button{width:100%;margin-top:6px}#pk .mera{font-size:13px;color:#a9d3d9;padding:2px 0;min-height:34px}
body.kon #c{transform:scale(${KN.K.scena.masshtab});transform-origin:50% 0}body.kon #pk{background:linear-gradient(#02040a00,#02040a 5%)}#pst{display:none;position:fixed;inset:0;z-index:19}body.kon #pst{display:block}
#pk button{flex:none;width:auto;margin:0;white-space:nowrap;min-height:44px;padding:0 14px;border-radius:22px;border:1px solid #3b8a96;background:#0a2832cc;color:#dff3f5;font:inherit}#pk button.net{display:none}
#pk button.on{background:#dff3f5;border-color:#fff;color:#04202a;font-weight:600}#pk button.gl{background:#7a4a12;border-color:#ffc56b}
#pk .um{display:flex;flex-wrap:wrap;gap:10px 8px;max-height:168px;overflow-y:auto;padding:4px 0 26px;-webkit-overflow-scrolling:touch;margin-top:6px;border-top:1px solid #3b8a9655}#pk .um::after{content:'';flex:0 0 100%;position:sticky;bottom:-26px;height:30px;margin-top:-30px;pointer-events:none;background:linear-gradient(#02040a00,#02040a)}
#pt .kozha{font-size:13px;font-weight:400;color:#8fe6f2;text-align:right}#pt .kozha b{display:block;letter-spacing:3px;font-size:15px}#pk .stroka{min-height:80px;padding:14px 2px 6px;color:#bfe6ea}
#pt{position:fixed;left:0;right:0;top:0;z-index:20;display:flex;justify-content:space-between;align-items:center;padding:calc(env(safe-area-inset-top) + 6px) 12px 6px;font:600 17px -apple-system,system-ui,sans-serif;color:#dff3f5}
#pt a{color:#8fe6f2;text-decoration:none;min-height:44px;display:flex;align-items:center}`, document.head);
  const top = el('div', '', '', document.body), pt = top; top.id = 'pt'; el('a', '', S.nazad, top).href = './'; el('span', '', S.zagolovok, top); const koz = el('span', 'kozha', '', top);
  const pk = el('div', '', '', document.body); pk.id = 'pk'; const stroka = el('div', 'stroka', S.podskazka, pk), ryad = el('div', 'ryad', '', pk), um = el('div', 'um', '', pk);
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart']) pk.addEventListener(ev, e => e.stopPropagation());
  const W = () => window.zaplyvWorld(), ryadom = (d = 150) => { const a = W().me[0] || { x: 0, y: 0 }, t = Math.random() * 6.283; return { x: a.x + Math.cos(t) * d, y: a.y + Math.sin(t) * d }; };
  const imya = g => kniga[g]?.imya || g, knop = {};
  const obnovi = () => { const w = W(), n = zanyato(w.genes); koz.textContent = S.kozha + ': ' + n + ' ' + S.iz + ' ' + P.mest; el('b', '', '●'.repeat(Math.min(n, P.mest)) + '○'.repeat(Math.max(0, P.mest - n)), koz);
    for (const g in knop) knop[g].classList.toggle('on', !!w.genes[g]); };
  const postav = g => { const w = W(), no = mozhno(w.genes, g);
    if (no) { stroka.textContent = no.net === 'mesto' ? S.net_mesta : S.nelzya + ': «' + imya(g) + '» и «' + imya(no.s) + '». ' + no.pochemu; return false; }
    w.genes[g] = true; w.from[g] = 'kid'; stroka.textContent = S.postavila + ' «' + imya(g) + '». ' + (kniga[g]?.daet || '') + ' ' + (P.kozha[g] ? S.na_kozhe + ' ' + P.kozha[g] + '.' : S.vnutri); return true; };
  const sozdat = () => { const w = W(); for (const g in knop) knop[g].remove();
    for (const g of Object.keys(w.cfg.genes)) { knop[g] = el('button', '', imya(g), um);
      knop[g].onclick = () => { const w = W(); if (w.genes[g]) { delete w.genes[g]; stroka.textContent = S.snyato + ' «' + imya(g) + '».'; } else postav(g); obnovi(); }; } };
  // Три вкладки: собрать новую бактерию (главное), умения своей клетки, соседи и еда.
  const kon = el('div', 'kon', '', pk); pk.insertBefore(kon, um);
  const vk = {}, pokazat = k => { for (const n in vk) vk[n].classList.toggle('on', n === k); kon.style.display = k === 'kon' ? '' : 'none'; um.style.display = k === 'kon' ? 'none' : '';
    for (const b of sos) b.classList.toggle('net', k !== 'sos'); for (const b of svoi) b.classList.toggle('net', k !== 'um'); for (const g in knop) knop[g].classList.toggle('net', k !== 'um'); um.scrollTop = 0;
    stroka.style.display = k === 'kon' ? 'none' : ''; tek = k; document.body.classList.toggle('kon', k === 'kon'); const w = W(); if (w) { w.cfg.close_up = k === 'kon' ? KN.K.scena.krupno : P.krupno; if (k !== 'kon') for (const q of w.pseudos) delete q.obrazec; } };
  let tek = 'kon'; for (const [k, t] of [['kon', KN.K.slova.vkladka], ['um', S.umeniya], ['sos', S.sosedi]]) { vk[k] = el('button', '', t, ryad); vk[k].onclick = () => pokazat(k); }
  const svoi = [], sos = [], vid = () => pokazat(tek);
  const mut = el('button', 'gl', S.mutirovat, um); mut.onclick = () => { const w = W(), g = mutaciya(w.genes, Object.keys(w.cfg.genes), Math.random()); if (g) postav(g); else stroka.textContent = zanyato(w.genes) >= P.mest ? S.net_mesta : S.vse; obnovi(); };
  const sbr = el('button', '', S.sbros, um); sbr.onclick = () => { const w = W(); for (const g in w.genes) delete w.genes[g]; stroka.textContent = S.podskazka; obnovi(); }; svoi.push(mut, sbr);
  const D = S.dobavit, dob = (t, fn) => { const b = el('button', 'net', t, um); b.onclick = () => fn(W()); sos.push(b); };
  dob(D.eda, w => { const c = ryadom(90); for (let i = 0; i < 8; i++) w.food.push({ x: c.x + (Math.random() - 0.5) * 60, y: c.y + (Math.random() - 0.5) * 60, vx: 0, vy: 0, s: 1 }); });
  dob(D.virus, w => { const c = ryadom(170); for (let i = 0; i < 4; i++) w.cloud(c.x + i * 9, c.y, 'me', 0); });
  dob(D.ameba, w => w.amoebas.push({ ...ryadom(260), vx: 0, vy: 0, m: 6, id: ++w.ids }));
  dob(D.zapyataya, w => w.bdellos.push({ ...ryadom(240), vx: 0, vy: 0, a: 0, t: 0.5, id: ++w.ids }));
  dob(D.sopernica, w => w.pseudos.push({ ...ryadom(160), vx: 0, vy: 0, a: 0, t: 0, cool: 0, strain: true, vid: 'strain', id: ++w.ids }));
  dob(D.seno, w => w.pseudos.push({ ...ryadom(70), vx: 0, vy: 0, a: Math.random() * 6.283, t: 0, cool: 0, vid: 'seno', id: ++w.ids }));
  dob(D.chisto, w => { for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; });
  // Конструктор: ползунки формы → запись-анкета «svoya» → формулы книги считают ход, дрожь и еду; строки показывают закон и числа.
  const forma = { ...KN.K.etalon }, zak = [];
  const pereschet = () => { const w = W(); if (!w) return; DV.V.vidy.svoya = KN.anketa(forma, w.cfg); KN.stroki(forma, w.cfg).forEach((z, i) => { zak[i].firstChild.textContent = z.imya + ' ' + z.chislo + '%'; zak[i].lastChild.textContent = z.tekst; }); };
  const setka = el('div', 'setka', '', kon);
  for (const [k, Z] of Object.entries(KN.K.polzunki)) { const r = el('label', 'polz', '', setka), im = el('span', '', '', r), inp = el('input', '', '', r); inp.type = 'range';
    const zn = Z.znacheniya, pishi = () => { im.textContent = Z.imya + ' ' + (Number.isInteger(Z.shag ?? 1) ? forma[k] : forma[k].toFixed(1).replace('.', ',')); };
    Object.assign(inp, zn ? { min: 0, max: zn.length - 1, step: 1, value: zn.indexOf(forma[k]) } : { min: Z.ot, max: Z.do, step: Z.shag, value: forma[k] });
    inp.oninput = () => { forma[k] = zn ? zn[+inp.value] : +inp.value; pishi(); pereschet(); }; pishi(); }
  for (let i = 0; i < Object.keys(KN.K.formuly).length; i++) { const z = el('div', 'zak', '', kon); el('b', '', '', z); el('span', '', '', z); zak.push(z); }
  // Сцена: в середине воды лежит образец и меняется вместе с ползунками; выпущенные копии плавают в загоне вокруг него по тем же формулам.
  const SC = KN.K.scena, pst = el('div', '', '', document.body); pst.id = 'pst'; let pole = { x: 0, y: 0, a: 50, b: 30 };
  const novaya = o => ({ x: pole.x, y: pole.y, vx: 0, vy: 0, a: Math.random() * 6.283, t: 0, cool: 0, vid: 'svoya', id: ++W().ids, ...o });
  const scena = w => { const z = (window.zaplyvProbe.z || 1) * innerWidth / SC.shirina, me = w.me[0], verh = pt.getBoundingClientRect().bottom, niz = pk.getBoundingClientRect().top; if (!me) return; w.cfg.close_up = (1 + SC.krupno) * Math.min(1, SC.dlina_v_kadr / (forma.dlina * forma.cepochka + forma.zh_dlina * SC.dolya_zhgutika)) * (w.pseudos.some(q => q.vid === 'svoya' && !q.obrazec) ? SC.otezd : 1) - 1;
    pole = { x: me.x, y: me.y - (innerHeight / 2 - (verh + niz) / 2 / SC.masshtab) / z, a: innerWidth / 2 / SC.masshtab / z * SC.pole[0], b: (niz - verh) / 2 / SC.masshtab / z * SC.pole[1] };
    let obr = w.pseudos.find(q => q.obrazec); if (!obr) w.pseudos.push(obr = novaya({ obrazec: true }));
    Object.assign(obr, { x: pole.x, y: pole.y, vx: 0, vy: 0, a: SC.ugol, t: 1, rest: 2 });
    const sv = w.pseudos.filter(q => q.vid === 'svoya'), T = Math.min(SC.tesno * forma.dlina * forma.cepochka, pole.a * 0.6); // копии не лезут друг на друга и на образец
    for (const q of sv) if (!q.obrazec) for (const o of sv) { const dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy); if (o !== q && d < T && d > 0) { q.x += dx / d * (T - d); q.y += dy / d * (T - d); } }
    for (const q of w.pseudos) if (q.vid === 'svoya' && !q.obrazec) { const u = (q.x - pole.x) / pole.a, v = (q.y - pole.y) / pole.b; // стенка загона: развернуться к середине
      if (u * u + v * v > 1) { q.a = Math.atan2(pole.y - q.y, pole.x - q.x); const k = 1 / Math.hypot(u, v); if (k < 0.85) { q.x = pole.x + (q.x - pole.x) * k / 0.85; q.y = pole.y + (q.y - pole.y) * k / 0.85; } } } };
  const mera = el('div', 'mera', KN.K.slova.mera, kon);
  const vyp = el('button', 'gl', KN.K.slova.vypustit, kon); vyp.onclick = () => { vyp.textContent = KN.K.slova.eshche; const w = W(), V = KN.K.vypusk; pereschet();
    for (let i = 0; i < V.skolko; i++) { const t = Math.random() * 6.283; w.pseudos.push(novaya({ x: pole.x + Math.cos(t) * pole.a * 0.7, y: pole.y + Math.sin(t) * pole.b * 0.7 })); }
    mera.textContent = KN.K.slova.v_vode.replace('{n}', w.pseudos.filter(q => q.vid === 'svoya' && !q.obrazec).length);
    for (let i = 0; i < V.edy; i++) { const t = Math.random() * 6.283, r = 0.3 + Math.random() * 0.6; w.food.push({ x: pole.x + Math.cos(t) * pole.a * r, y: pole.y + Math.sin(t) * pole.b * r, vx: 0, vy: 0, s: 1 }); } };
  let moy = null; // новый заплыв — новый мир: снова пустая вода, клетка крупным планом
  const sledi = () => { const w = W();
    if (w && w !== moy) { moy = w; w.chunk = () => {}; for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; sozdat(); pereschet(); vid(); obnovi(); }
    if (w && tek === 'kon') scena(w);
    if (w && w.choice.length) w.choice = []; // деление в песочнице без окна выбора: умения ставит панель
    requestAnimationFrame(sledi); };
  sledi();
}
