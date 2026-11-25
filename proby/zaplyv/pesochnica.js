// Песочница движка (Роман 25.11: «дайте мне потестировать движок покажите что с ним получается»; план, этап Б).
// Адрес: /zaplyv/?pesochnica. Та же игра и тот же рисунок, но вода пустая: клетка одна, умения включаются касанием,
// «Мутировать» ставит случайное допустимое. Правила сочетаний — pravila.json (биолог): места на коже и «нельзя вместе»;
// отказ объясняется словами. Соседей и еду добавляют кнопки. main.js только подключает этот файл по адресу.
const P = await (await fetch('pravila.json')).json(), S = P.slova;
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
#pk .ryad{display:flex;gap:8px;padding:4px 0}#pk .ryad button{flex:1}
#pk button{flex:none;width:auto;margin:0;white-space:nowrap;min-height:44px;padding:0 14px;border-radius:22px;border:1px solid #3b8a96;background:#0a2832cc;color:#dff3f5;font:inherit}#pk button.net{display:none}
#pk button.on{background:#dff3f5;border-color:#fff;color:#04202a;font-weight:600}#pk button.gl{background:#7a4a12;border-color:#ffc56b}
#pk .um{display:flex;flex-wrap:wrap;gap:10px 8px;max-height:168px;overflow-y:auto;padding:4px 0 26px;-webkit-overflow-scrolling:touch;margin-top:6px;border-top:1px solid #3b8a9655}#pk .um::after{content:'';flex:0 0 100%;position:sticky;bottom:-26px;height:30px;margin-top:-30px;pointer-events:none;background:linear-gradient(#02040a00,#02040a)}
#pt .kozha{font-size:13px;font-weight:400;color:#8fe6f2;text-align:right}#pt .kozha b{display:block;letter-spacing:3px;font-size:15px}#pk .stroka{min-height:80px;padding:14px 2px 6px;color:#bfe6ea}
#pt{position:fixed;left:0;right:0;top:0;z-index:20;display:flex;justify-content:space-between;align-items:center;padding:calc(env(safe-area-inset-top) + 6px) 12px 6px;font:600 17px -apple-system,system-ui,sans-serif;color:#dff3f5}
#pt a{color:#8fe6f2;text-decoration:none;min-height:44px;display:flex;align-items:center}`, document.head);
  const top = el('div', '', '', document.body); top.id = 'pt'; el('a', '', S.nazad, top).href = './'; el('span', '', S.zagolovok, top); const koz = el('span', 'kozha', '', top);
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
  const mut = el('button', 'gl', S.mutirovat, ryad); mut.onclick = () => { const w = W(), g = mutaciya(w.genes, Object.keys(w.cfg.genes), Math.random()); if (g) postav(g); else stroka.textContent = zanyato(w.genes) >= P.mest ? S.net_mesta : S.vse; obnovi(); };
  el('button', '', S.sbros, ryad).onclick = () => { const w = W(); for (const g in w.genes) delete w.genes[g]; stroka.textContent = S.podskazka; obnovi(); };
  const D = S.dobavit, sos = [], dob = (t, fn) => { const b = el('button', 'net', t, um); b.onclick = () => fn(W()); sos.push(b); };
  const per = el('button', '', S.sosedi, ryad); let pokaz = false;
  const vid = () => { per.textContent = pokaz ? S.umeniya : S.sosedi; for (const b of sos) b.classList.toggle('net', !pokaz); for (const g in knop) knop[g].classList.toggle('net', pokaz); um.scrollTop = 0; };
  per.onclick = () => { pokaz = !pokaz; vid(); };
  dob(D.eda, w => { const c = ryadom(90); for (let i = 0; i < 8; i++) w.food.push({ x: c.x + (Math.random() - 0.5) * 60, y: c.y + (Math.random() - 0.5) * 60, vx: 0, vy: 0, s: 1 }); });
  dob(D.virus, w => { const c = ryadom(170); for (let i = 0; i < 4; i++) w.cloud(c.x + i * 9, c.y, 'me', 0); });
  dob(D.ameba, w => w.amoebas.push({ ...ryadom(260), vx: 0, vy: 0, m: 6, id: ++w.ids }));
  dob(D.zapyataya, w => w.bdellos.push({ ...ryadom(240), vx: 0, vy: 0, a: 0, t: 0.5, id: ++w.ids }));
  dob(D.sopernica, w => w.pseudos.push({ ...ryadom(160), vx: 0, vy: 0, a: 0, t: 0, cool: 0, strain: true, vid: 'strain', id: ++w.ids }));
  dob(D.chisto, w => { for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; });
  let moy = null; // новый заплыв — новый мир: снова пустая вода, клетка крупным планом
  const sledi = () => { const w = W();
    if (w && w !== moy) { moy = w; w.chunk = () => {}; for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; w.cfg.close_up = P.krupno ?? w.cfg.close_up; sozdat(); vid(); obnovi(); }
    if (w && w.choice.length) w.choice = []; // деление в песочнице без окна выбора: умения ставит панель
    requestAnimationFrame(sledi); };
  sledi();
}
