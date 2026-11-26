// Игра-микромир на конструкторе: node proby/zaplyv/test_igra.mjs. Провал — код 1.
// Роман 26.11: «собери весь микромир — используя наш конструктор… Хочу попробовать». «Цель и веселье» ЦВ22: цель — «съешь того, кто выше тебя».
// Тест доказывает пользу игроку: палец ведёт клетку, она ест мелких и растёт (без деления), цель называет вид над тобой, после гибели — сестра.
import { nachat, shag_igry, razmer, cel, car, IG } from './stend/igra.js';
import { massa } from './mir_zhizn.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message; } console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const G = nachat(1), dt = 1 / 30; let bylo = { ...G.igrok }, klonov = 0, celi_ok = true;
check('test_igra_palec: палец ведёт клетку, без пальца стоит', () => { const q = G.igrok, x0 = q.x, y0 = q.y; for (let i = 0; i < 90; i++) shag_igry(G, dt, [q.x + 300, q.y]);
  const ushla = G.igrok.x - x0; const x1 = G.igrok.x; for (let i = 0; i < 60; i++) shag_igry(G, dt, null); const stoit = Math.abs(G.igrok.x - x1);
  return ushla < 15 ? `за 3 с к пальцу ушла на ${ushla.toFixed(0)}` : stoit > ushla / 3 ? `без пальца уплыла на ${stoit.toFixed(0)}` : ''; });
for (let i = 0; i < 30 * 150; i++) { const q = G.igrok; let best = null, bd = 1e9; // бот: к ближайшему, кого рот берёт
  for (const s of G.M.sv) if (s !== q && massa(s) <= massa(q) * IG.igrok.rot.do) { const d = Math.hypot(s.x - q.x, s.y - q.y); if (d < bd) { bd = d; best = s; } }
  shag_igry(G, dt, best ? [best.x, best.y] : null); klonov = Math.max(klonov, G.M.sv.filter(s => s.vid === 'igrok').length);
  const c = cel(G); if (c && massa(c.s) <= massa(G.igrok) * IG.igrok.rot.do) celi_ok = false; }
check('test_igra_rost: ест мелких и растёт', () => G.schet.syela < 5 ? `съела ${G.schet.syela}` : G.schet.rekord < 3 ? `рекорд ${G.schet.rekord.toFixed(1)}` : '');
check('test_igra_bez_deleniya: своя клетка одна (Роман: «Деление пока оставь»)', () => klonov > 1 ? `своих клеток было ${klonov}` : '');
check('test_igra_cel: цель всегда тот, кого рот ещё не берёт', () => celi_ok ? '' : 'цель называла того, кого уже можно съесть');
check('test_igra_car: царь капли есть', () => car(G) ? '' : 'царя нет');
check('test_igra_sestra: после гибели просыпается сестра мельче', () => { const q = G.igrok, m = razmer(G); q.m = 0.1; shag_igry(G, dt, null);
  return G.igrok === q ? 'та же клетка после гибели' : G.schet.gibeley < 1 ? 'гибель не сосчитана' : razmer(G) >= m ? 'сестра не мельче' : ''; });
console.log(`Паспорт: игровое время ${G.t.toFixed(0)} с, съела ${G.schet.syela}, рекорд ${G.schet.rekord.toFixed(1)}, гибелей ${G.schet.gibeley}, царей ${G.schet.carey}, существ ${G.M.sv.length}`);
process.exit(bad ? 1 : 0);
