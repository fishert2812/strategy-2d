// Амёба ловит не мгновенно (Роман 27.11 14:44: «Врезался в амебу. Она к тебе быстро разворачивается или как она делает?»; биолог 27.11,
// vzaimodeystviya_biolog.md; pravki_po_blokam.md Д.10 п. 7). Переда у амёбы нет: она тянет к тебе вырост vyrost секунд (это видно — предупреждение),
// кончик коснулся — прилип: тебя тянет к ней tyaga_prilip хода, отплыл дальше otryv её радиуса — вырвалась. Подтянуло к телу — края обходят чашей
// ohvat секунд, тянет сильнее (tyaga_chasha), пока чаша не сомкнулась, вырваться можно. Сомкнулась — пузырь: переварит за perevar секунд.
// Мгновенную поимку из sim.js в «Капле» не пускаем (boj.ohrana, кто «amoeba»). Числа — kaplya.json «ameba».
// sim.js, поймав, ещё и растит амёбу; поимку мы не пустили — массу до хода возвращаем (massy — до хода мира).
export const massy = w => new Map((w.amoebas || []).map(m => [m, m.m]));
export const FAZY = ['vyrost', 'prilip', 'chasha', 'puzyr', 'otdyh'];
// Ход после хода мира. hod — твой ход (единиц/с). Вернёт события: ['vyrost'|'prilip'|'chasha'|'puzyr'|'vyrvalas'|'syela', m].
export function shag(w, dt, A, radius, hod, m0) { const ev = [], a = w.me[0]; if (m0) for (const [m, x] of m0) if (m.m > x) m.m = x; if (!a) return ev;
  for (const m of w.amoebas || []) { const O = m.ohv ||= { faza: null, t: 0 }; O.t += dt; const Rm = radius(m.m), Ra = radius(a.m), dx = a.x - m.x, dy = a.y - m.y, d = Math.hypot(dx, dy) || 1;
    const syta = m.syt > 0 || m.oglush > w.stats.time, mozhet = m.m * 0.8 > a.m && (w.bezZahvata || (!a.grab && !(a.free > 0))) /* L074: держит один хищник за раз */ && !w.genes.capsule && !(a.spore > 0) && !syta, kraj = d - Rm - Ra, dosyag = A.dosyag * Rm;
m.lovit = mozhet && !w.bezZahvata; /* L074: может тебя съесть — столкновения её не отталкивают (stolk.js), иначе вырост не дотянется */
const v = (faza, e) => { O.faza = faza; O.t = 0; if (e) ev.push([e, m]); };
    if (O.faza === 'otdyh') { if (O.t > A.pauza) v(null); continue; }
    if (!mozhet && O.faza !== 'puzyr') { if (O.faza) v('otdyh'); continue; }
    if (!O.faza) { if (kraj < dosyag) { O.ug = Math.atan2(dy, dx); v('vyrost', 'vyrost'); } continue; }
    if (O.faza === 'vyrost') { O.ug = Math.atan2(dy, dx); O.dl = Math.min(1, O.t / A.vyrost) * dosyag; // вырост тянется к тебе
      if (kraj > dosyag * 1.3) v('otdyh'); else if (kraj <= O.dl) v('prilip', 'prilip'); continue; }
    const tyani = k => { const s = Math.min(d - Rm * 0.2, k * hod * dt); a.x -= dx / d * s; a.y -= dy / d * s; };
    if (O.faza === 'prilip') { O.dl = Math.max(0, kraj); if (kraj > A.otryv * Rm) { v('otdyh', 'vyrvalas'); continue; } tyani(A.tyaga_prilip); if (kraj < Ra * A.k_telu) v('chasha', 'chasha'); continue; }
    if (O.faza === 'chasha') { O.f = Math.min(1, O.t / A.ohvat); if (kraj > A.vyhod * Ra) { v('otdyh', 'vyrvalas'); continue; } tyani(A.tyaga_chasha); if (O.t >= A.ohvat) v('puzyr', 'puzyr'); continue; }
    if (O.faza === 'puzyr') { a.x = m.x; a.y = m.y; a.vx = a.vy = 0; if (w.genes.capsule) { v('otdyh', 'vyrvalas'); continue; } if (O.t >= A.perevar) { v('otdyh', 'syela'); m.syt = A.syt; w.ameba_ubivaet = true; w.lose(a, m.x, m.y, 'amoeba'); w.ameba_ubivaet = false; m.m += a.m * 0.5; return ev; } } }
  return ev; }
