// Сторож «Сверла» «Капли» (задание kolonia_eda_boy.md Ш39, 12.7): node proby/zaplyv/kaplya/test_sverlo.mjs.
// test_sverlo_zapert: по ровне сверло не работает; по вдвое большей работает: ввинтилась за 0,6 с, внутри 4 + 1,5 × k секунд, выйти раньше нельзя, съела 0,4 её массы;
// пасть, коснувшаяся шарика, съедает обоих. Самопроверка: выход раньше времени краснеет.
import fs from 'fs'; import * as svr from './sverlo.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K = KAP.sverlo, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const radius = m => 13 * Math.sqrt(m), CELI = [['sopernica', 'pseudos']];
// Ты массы 2 носом к цели массы mq; каждый кадр пытаешься уплыть назад. С хищником — амёба массы 20 стоит в 400 от цели.
function opyt(K0, mq, hish = false) { const a = { x: 0, y: 0, a: 0, m: 2, vx: 0, vy: 0 }, q = { x: radius(2) + radius(mq) + 2, y: 0, m: mq }, w = { me: [a], pseudos: [q], amoebas: hish ? [{ x: q.x + 400, y: 0, m: 20 }] : [], genes: { sverlo: true } };
  const ev = []; let vhod = null, vnutri = null, vyshla = null, m0 = a.m, daleko = 0;
  for (let t = 0; t < 30; t += DT) { a.x -= 150 * DT; for (const e of svr.shag(SV, w, DT, K0, CELI, ['amoebas'], radius)) { ev.push(e[0]); if (e[0] === 'vnutri') vnutri = t; if (e[0] === 'vhod') vhod = t; if (['syela', 'oba', 'vyshla'].includes(e[0]) && vyshla == null) vyshla = t; }
    if (vnutri != null && vyshla == null) daleko = Math.max(daleko, Math.hypot(a.x - q.x, a.y - q.y)); }
  return { ev, vhod, vnutri, vyshla, rost: a.m - m0, daleko, q: q.gone }; }
let SV; const zapusk = (K0, mq, h) => { SV = svr.sozdat(); return opyt(K0, mq, h); };
const sud = K0 => { const r = zapusk(K0, 3); if (r.vhod != null) return `по ровне (масса 3 при твоих 2) сверло вошло`;
  const o = zapusk(K0, 6), T = K.vnutri[0] + K.vnutri[1] * 3; if (o.vnutri == null) return 'по вдвое большей не вошло';
  if (Math.abs(o.vnutri - o.vhod - K.vhod) > 2 * DT) return `ввинчивалась ${(o.vnutri - o.vhod).toFixed(2)} с`;
  if (!o.ev.includes('syela') || Math.abs(o.vyshla - o.vnutri - T) > 2 * DT) return `вышла через ${o.vyshla == null ? '—' : (o.vyshla - o.vnutri).toFixed(2)} с, а не ${T}: ${o.ev.join(',')}`;
  if (o.daleko > 1) return `пока внутри, ушла от центра на ${o.daleko.toFixed(0)}`; if (Math.abs(o.rost - K.kpd * 6) > 0.02) return `съела ${o.rost.toFixed(2)}, а не ${K.kpd * 6}`;
  const h = zapusk(K0, 6, true); if (!h.ev.includes('oba') || !h.q) return `амёба у шарика не съела обоих: ${h.ev.join(',')}`; return ''; };
check(`test_sverlo_zapert: по ровне не работает; по вдвое большей ввинчиваешься за ${K.vhod} с, внутри ${K.vnutri[0]} + ${K.vnutri[1]} × k с, выйти нельзя, съела ${K.kpd} её массы; пасть съедает обоих (Ш39, 12.7)`, sud(K));
check('test_sverlo_zapert_samoproverka: выход раньше времени судья ловит', sud({ ...K, zapert: false }) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
