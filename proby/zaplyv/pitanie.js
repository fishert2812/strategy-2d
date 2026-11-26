// Контакт клетки с миром и кормление: один закон на любое тело (mir.json «kontakt»). Тело для контакта — капсула из паспорта
// (половина оси kh и радиус kr в полутолщинах w). Кусок еды не исчезает: клетка чует его (chuet), подходит, прижимается оболочкой,
// кусок прилипает к месту касания и тает, пока клетка всасывает его всей оболочкой (бактерия не глотает, она растворяет
// и впитывает: биолог, «Всасывание еды»); скорость всасывания ∝ k_eda из zakony.js. Съеденное растит клетку (kpd), по телу
// проходит волна сытости (puls), запас виден зёрнами. Твёрдый комок не пускает: тело выталкивает, клетка получает удар (q.udar)
// и отвечает ходом (кувырок, задний ход: hod.js). Чистая математика, без рисования.
const lim = (x, a, b) => Math.max(a, Math.min(b, x));
// точка мира в осях тела и ближайшая точка оси капсулы
function k_telu(q, x, y, kh) { const c = Math.cos(q.a), s = Math.sin(q.a), dx = x - q.x, dy = y - q.y, u = dx * c + dy * s, v = -dx * s + dy * c, ou = lim(u, -kh, kh); return { u, v, ou, d: Math.hypot(u - ou, v) }; }
// q — клетка (x, y, a, m, est, puls, udar), veshchi — [{ x, y, m, r, tverd }] рядом, T — { kh, kr } тела, w — полутолщина, k_eda — из записи.
// Возвращает { cel: [x, y] | null — куда тянет еда, sk — доля тяги (ест — почти стоит), sobytiya: [...] }; съеденные куски получают m = 0.
export function kontakt(q, veshchi, T, w, K, k_eda, dt) { const kh = T.kh * w, kr = T.kr * w, o = { cel: null, sk: 1, sobytiya: [] }; let best = K.chuet * w;
  q.puls = Math.max(0, (q.puls || 0) - dt / K.puls.dlitsya); q.tolchok = (q.tolchok ?? 9) + dt; q.m -= K.cena * dt; if (q.m < K.m_min) q.m = K.m_min;
  for (const e of veshchi) { if (e.m <= 0) continue; const g = k_telu(q, e.x, e.y, kh), zazor = g.d - kr - e.r + (e.tverd ? vdavleno(q, e) * w : 0);
    if (e.tverd && zazor < K.vmyatina.zazor * w) { const n = g.d || 1; vmyat(q, e, g.ou / w, (g.u - g.ou) / n, g.v / n, K.vmyatina.myagkost * Math.max(0, (g.u - g.ou) / n * Math.sign(q.h?.faza === 'nazad' ? -1 : 1)) + K.vmyatina.kasanie, T.kr, e.r / w, K); }
    if (e.tverd) { if (zazor < 0) { const n = g.d || 1, c = Math.cos(q.a), s = Math.sin(q.a), nu = (g.u - g.ou) / n, nv = g.v / n; q.x += (nu * c - nv * s) * zazor; q.y += (nu * s + nv * c) * zazor; q.om = (q.om || 0) + (-K.tverd.povorot * Math.sign(g.ou * nv || 1) - (q.om || 0)) * Math.min(1, dt * K.tverd.plavno); if (!q.upor) { o.sobytiya.push(['upor', e]); q.tolchok = 0; } q.upor = K.tverd.pomnit; q.udar = 1; } continue; }
    if (q.est === e) continue;
    if (zazor < (q.obhvat ? K.obhvat.dotyanetsya : K.prilip) * w && !q.est && q.m < K.m_max) { q.est = e; e.u = g.ou; if (q.obhvat) e.vd0 = Math.max(K.vdavlen, zazor / e.r + 1); { const R = kr + e.r * K.vdavlen, n = g.d || 1; e.du = (g.u - g.ou) / n * R; e.v = g.v / n * R; } e.m0 = e.m; e.r0 = e.r; o.sobytiya.push(['prilip', e]); q.tolchok = 0; }
    else if (zazor < best && q.m < K.m_max) { best = zazor; o.cel = [e.x, e.y]; } }
  q.upor = Math.max(0, (q.upor || 0) - dt);
  if (q.est) { const e = q.est, vzyal = Math.min(e.m, K.skorost * (q.obhvat ? K.obhvat.k_eda * (e.ob >= 1 ? 1 : K.obhvat.snaruzhi) : k_eda) * dt); e.m -= vzyal; q.m += vzyal * K.kpd; q.syel = (q.syel || 0) + vzyal;
    // кусок держится на оболочке там, где коснулся, и тает ровно (радиус ∝ остатку: глаз видит, как он убывает, а не хлопок в конце), центр уходит в оболочку
    // обхват (тело с выростами, q.obhvat: амёба): оболочка не ждёт, пока кусок растает снаружи, а охватывает его двумя губами-выростами с боков, они смыкаются,
    // кусок уходит внутрь (фагоцитоз: чаша растёт вокруг частицы, пока не сомкнётся; Swanson, Nat. Rev. Mol. Cell Biol. 9, 2008) и тает уже там
    if (q.obhvat) { const O = K.obhvat, p = e.ob = Math.min(1, (e.ob || 0) + dt / O.dlitsya), n = Math.hypot(e.du, e.v) || 1, tu = -e.v / n, tv = e.du / n, sm = (a, b, x) => { const f = Math.max(0, Math.min(1, (x - a) / (b - a))); return f * f * (3 - 2 * f); };
      // губы растут первыми (чаша), потом кусок втягивается, губы над ним смыкаются и разглаживаются
      const vd0 = e.vd0 ?? K.vdavlen, guby = sm(0, O.guby, p) * (1 - sm(O.vtyanut, 1, p)), vt = sm(O.vtyanut * 0.6, 1, p), Rc = kr + e.r0 * (vd0 + (O.vnutr - vd0) * vt), razv = e.r0 * (O.razvod - (O.razvod - 0.4) * sm(O.guby, 1, p));
      e.vd = (Rc - kr) / (e.r || 1); const cu = e.u + e.du / n * Rc, cv = e.v / n * Rc;
      q.vyp_eda = guby > 0.01 ? [1, -1].map(s => ({ u: (cu + tu * razv * s) / w, o: (cv + tv * razv * s) / w, vysota: guby * O.vysota * (e.r0 * (1 + Math.max(0, vd0))) / w, shirina: O.shirina * e.r0 / w })) : null; }
    e.r = e.r0 * Math.max(0, e.m / e.m0); prizhat(q, T, w, K); { const n = Math.hypot(e.du, e.v) || 1; vmyat(q, e, e.u / w, e.du / n, e.v / n, e.r * K.vdavlen / w, T.kr, e.r / w, K); }
    o.sk = K.sk_za_edoy; o.cel = null; if (e.m <= 1e-6) { e.m = 0; q.est = null; q.vyp_eda = null; q.puls = 1; o.sobytiya.push(['syel', e]); } }
  otpustit(q, K, dt); return o; }
// Вмятина оболочки в месте касания (перенос vid.js poke на любое тело и на любое место оболочки). Физика: оболочка бактерии — тонкая
// упругая стенка под давлением изнутри (тургор), в воде без инерции. Глубина δ: нажим делить на жёсткость стенки (для стенки под
// давлением жёсткость ≈ π·p·R: Vella и др., J. R. Soc. Interface 9, 2012), у нас нажим — доля тяги вдоль нормали (myagkost — глубина при
// полной тяге) плюс лёгкий прогиб от самого касания (kasanie). Ширина пятна — радиус контакта Герца a = √(R·δ), где 1/R = 1/R₁ + 1/R₂ (Hertz 1882;
// Ландау, Лифшиц, «Теория упругости», §9). Пока касание держится, вмятина следует за нажимом; отпустило — стенка возвращается
// затухающим колебанием exp(−4f)·cos(14f), как капсула в игре (vid.json capsule.dent_t). u — место вдоль оси, (nu, nv) — нормаль к предмету
// в осях тела, всё в полутолщинах. Нутро — вязкая жидкость, поэтому стенка прогибается не сразу, а за время порядка η·R/(E·h) (вязкость нутра
// на радиус, делить на жёсткость стенки; для капли без стенки η·R/γ: Taylor 1934; Rallison, Annu. Rev. Fluid Mech. 16, 1984): bystro — обратное
// этому времени для эталона. q.zhestkost — жёсткость оболочки из записи (forma.zhestkost, по умолчанию 1: палочка со стенкой; у амёбы и
// инфузории меньше): мягкая мнётся глубже (δ ∝ 1/жёсткость) и возвращается медленнее (время ∝ 1/√жёсткость). Объём сохраняет рисование
// (vid_chasti.js myatye: где вдавлено, там тело раздаётся). q.vm — живые вмятины, q.vm_vid — они же для позы (sobrat: поза vm).
function vmyat(q, e, u, nu, nv, glub, R1, R2, K) { const V = K.vmyatina, zh = q.zhestkost || 1, d = Math.min(V.glub, glub / zh); if (!(d > 0)) return; const vm = q.vm || (q.vm = []); let m = vm.find(x => x.e === e);
  if (!m) { vm.push(m = { e, d: 0 }); if (vm.length > V.shtuk) vm.shift(); } m.u = u; m.nu = nu; m.nv = nv; m.d0 = d; m.a = Math.max(V.shirina_min, Math.sqrt(R1 * R2 / (R1 + R2) * d)); m.t = 0; m.derzhit = 1; }
// на сколько полутолщин оболочка сейчас вдавлена этим предметом: настолько тело подходит к нему ближе (вмятина лежит на предмете, без щели)
const vdavleno = (q, e) => { const m = q.vm && q.vm.find(x => x.e === e); return m ? Math.max(0, m.d) : 0; };
function otpustit(q, K, dt) { const V = K.vmyatina, vm = q.vm; if (!vm) return; for (let i = vm.length - 1; i >= 0; i--) { const m = vm[i];
    if (m.derzhit) { m.derzhit = 0; m.d += (m.d0 - m.d) * Math.min(1, dt * V.bystro); m.dk = m.d; } else { m.t += dt * Math.sqrt(q.zhestkost || 1); const f = m.t / V.dlitsya; if (f >= 1) { vm.splice(i, 1); continue; } m.d = m.dk * Math.exp(-4 * f) * Math.cos(14 * f); } }
  // нутро оттекает от вмятин (несжимаемая жидкость уходит оттуда, где стенку вдавило) и возвращается с вязким запаздыванием
  let pu = 0, pv = 0; for (const m of vm) { pu -= m.nu * m.d * V.ottok; pv -= m.nv * m.d * V.ottok; } const kp = Math.min(1, dt * V.bystro * V.nutro), p = q.plesk || (q.plesk = [0, 0]); p[0] += (pu - p[0]) * kp; p[1] += (pv - p[1]) * kp;
  q.vm_vid = vm.length ? vm : null; }
// После шага тела: если тело заехало в твёрдое, выталкивает его обратно по нормали (без поворота и событий), чтобы край не заходил на комок.
export function vytolknut(q, veshchi, T, w) { const kh = T.kh * w, kr = T.kr * w; for (const e of veshchi) { if (!e.tverd) continue; const g = k_telu(q, e.x, e.y, kh), z = g.d - kr - e.r + vdavleno(q, e) * w; if (z < 0) { const n = g.d || 1, c = Math.cos(q.a), s = Math.sin(q.a), nu = (g.u - g.ou) / n, nv = g.v / n; q.x += (nu * c - nv * s) * z; q.y += (nu * s + nv * c) * z; } } }
// Кусок, который едят, держится на оболочке там, где коснулся. Звать ещё раз после шага тела: тело сдвинулось и повернулось, кусок с ним.
export function prizhat(q, T, w, K) { const e = q.est; if (!e) return; const kr = T.kr * w, c = Math.cos(q.a), s = Math.sin(q.a), k = (kr + e.r * (e.vd ?? K.vdavlen)) / (kr + e.r0 * K.vdavlen), u = e.u + e.du * k, v = e.v * k; e.x = q.x + u * c - v * s; e.y = q.y + u * s + v * c; }
// Во сколько раз тело сейчас толще покоя: голодная тоньше (∛массы ниже 1; выше 1 тело растёт в длину: delenie.js telo), медленное дыхание, волна сытости после куска и отклик
// оболочки на касание: тело вздрагивает и гасит дрожь (та же затухающая волна, что у вмятины капсулы в игре: exp(−4f)·cos(14f)).
export function tolshche(q, K, t) { const p = q.puls || 0, f = (q.tolchok ?? 9) / K.tolchok.dlitsya, tk = f < 1 ? K.tolchok.razmah * Math.exp(-4 * f) * Math.cos(14 * f) : 0;
  return Math.cbrt(Math.min(1, q.m)) * (1 + K.dyshit.razmah * Math.sin(t * 6.283 / K.dyshit.period + q.id) + K.puls.razmah * Math.sin(Math.PI * p) ** 2 - tk); }
