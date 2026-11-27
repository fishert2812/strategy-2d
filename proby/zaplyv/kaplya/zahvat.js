// Захват всегда кончается (пачка 1 п. 3, урок L074; Роман 27.11 20:34: «заглючило меня между двух огней ! Просто ужас и не умираю крутился тут как юла»;
// «выбраться не могу кручусь и съесть меня не могут почему не понятно как это работает»). Числа — kaplya.json «zahvat».
// Держит один хищник за раз: пока тебя держит амёба (прилип, чаша, пузырь), пасти сувойки, туфельки, коловратки не хватают (main.js оборачивает world.grab);
// пока держит пасть, амёба не начинает (ameba.js). Против амёбы работают резкие развороты: ryvkov разворотов — вырвалась. Держат дольше predel секунд —
// развязка: гибель от того, кто держит; если гибель не прошла (защита боя), тебя отпускает.
import * as gm from './genom.js';
export const AMEBA = ['prilip', 'chasha', 'puzyr'];
export const sozdat = () => ({ t: 0, kto: null, ryvki: 0, tumble: 0 });
// Кто держит тебя сейчас: [кто, хищник] или null.
export function kto(w, a) { if (!a) return null; if (a.grab) return [a.grab.who, a.grab.by]; for (const m of w.amoebas || []) if (m.ohv && AMEBA.includes(m.ohv.faza)) return ['amoeba', m]; return null; }
// Ход после ameba.shag. Вернёт события: ['ryvok', доля] | ['vyrvalas'] | ['razvyazka', кто].
// radius(m) — радиус по массе (L102): вырвалась — встаёшь за краем амёбы, а не внутри неё.
export function shag(Z, w, dt, K, a, push, radius) { const ev = []; if (!a) { Object.assign(Z, sozdat()); return ev; } const k = kto(w, a);
  a.zahvachen = !!(k && k[0] === 'amoeba'); /* sim.js: при захвате разворот считается рывком, даже стоя */
  const ryvok = a.tumble > 0 && !(Z.tumble > 0); Z.tumble = a.tumble || 0;
  if (!k) { Z.t = 0; Z.kto = null; Z.ryvki = 0; return ev; }
  if (Z.kto !== k[1]) { Z.kto = k[1]; Z.t = 0; Z.ryvki = 0; } Z.t += dt;
  if (K.uron_s && !w.staryZahvat) { const g = gm.gn(a); g.f -= K.uron_s * dt; g.bez = 0; a.gnOt = k[0]; } /* L086 (пачка 2, Т12): в захвате здоровье тает на глазах — ступени ДНК осыпаются */
  if (k[0] !== 'amoeba' && ryvok && !w.staryZahvat) { Z.ryvki++; ev.push(['ryvok', Z.ryvki / K.ryvkov]); if (Z.ryvki >= K.ryvkov) { a.grab = null; a.free = K.svoboda; Z.t = 0; Z.ryvki = 0; ev.push(['vyrvalas']); return ev; } } /* L086: разворот рвёт и хватку пасти */
  if (k[0] === 'amoeba' && ryvok) { Z.ryvki++; ev.push(['ryvok', Z.ryvki / K.ryvkov]);
    if (Z.ryvki >= K.ryvkov) { const m = k[1], d = Math.hypot(a.x - m.x, a.y - m.y) || 1, ux = d > 1 ? (a.x - m.x) / d : Math.cos(a.a), uy = d > 1 ? (a.y - m.y) / d : Math.sin(a.a);
      m.ohv.faza = 'otdyh'; m.ohv.t = 0; const L = radius && !w.staryZahvat ? Math.max(K.otskok, radius(m.m) + radius(a.m) + K.zazor) : K.otskok; a.x = m.x + ux * L; a.y = m.y + uy * L; if (radius && !w.staryZahvat) m.syt = Math.max(m.syt || 0, K.ameba_otdyh); a.vx = ux * K.v; a.vy = uy * K.v; a.free = K.svoboda; Z.t = 0; Z.ryvki = 0; ev.push(['vyrvalas']); return ev; } }
  if (Z.t > K.predel || (a.gn && a.gn.f <= 1e-9)) { /* L086: геном кончился в захвате — исход сразу, от того, кто держит */ const [who, by] = k; ev.push(['razvyazka', who]); Z.t = 0; Z.ryvki = 0; a.grab = null; if (by && by.ohv) { by.ohv.faza = 'otdyh'; by.ohv.t = 0; }
    w.ameba_ubivaet = true; w.lose(a, a.x, a.y, who); w.ameba_ubivaet = false; if (w.me.includes(a)) { a.free = K.svoboda; push && push(a); } }
  return ev; }
