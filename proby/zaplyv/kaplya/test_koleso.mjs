// Сторож колеса стаи и перелива «Капли» (блок Е, pravki_po_blokam.md Е.3 п. 9–12, Е.4, Е.6 test_obmen_massa, test_koleso): node proby/zaplyv/kaplya/test_koleso.mjs.
// test_obmen_massa: после перелива масса твоя прежняя (±2 %), ген и темп копии твои, прежнее тело в стае с прежней мутацией и темпом; камера всё время на большом.
// test_obmen_kraya: копию съели — масса к тебе; схватили — обрыв и повтор не раньше povtor. test_koleso_mesta: 16 копий на экране телефона — цели не меньше 44 точек.
import fs from 'fs'; import * as kol from './koleso.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), KO = KAP.koleso, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = () => { const a = { x: 0, y: 0, a: 0, m: 4 }, q = { id: 2, x: -40, y: 10, a: 1, m: 0.5, mut: 'ship', mt: 30, T: 6 }; return { a, q, w: { me: [a], staya: [q, { id: 3, x: -60, y: 0, a: 0, m: 0.5, mut: null, T: 10 }] } }; };
const sudObmen = (shag = kol.shag) => { const { a, q, w } = mir(), K = kol.sozdat(), STY = { T: 10 }, MUT = { moya: 'zamok' }, dali = []; let men = 1, sum = 0;
  if (!kol.nachat(K, w, q, 0)) return 'перелив не начался';
  for (let t = 0; t < KO.pereliv + 0.5; t += DT) { shag(K, w, DT, KO, STY, MUT, m => dali.push(m), t); men = Math.min(men, a.m / (a.m + q.m)); sum = Math.max(sum, Math.abs(a.m + q.m - 4.5)); }
  if (K.most) return 'перелив не кончился';
  if (Math.abs(a.m - 4) > 0.08) return `после обмена твоя масса ${a.m.toFixed(2)}, а была 4`;
  if (sum > 1e-9) return `масса из ниоткуда: ${sum.toFixed(3)}`; if (men < 0.5 - 0.02) return `камера на теле, что тает: ты был ${(men * 100).toFixed(0)} % массы`;
  if (MUT.moya !== 'ship' || dali[0] !== 'ship') return `ген копии не твой: ${MUT.moya}, дали ${dali}`; if (STY.T !== 6) return `темп рода ${STY.T}, а у копии был 6`;
  if (!w.staya.includes(q) || q.mut !== 'zamok' || q.T !== 10 || Math.abs(q.m - 0.5) > 0.02) return `прежнее тело: ${JSON.stringify({ v_stae: w.staya.includes(q), mut: q.mut, T: q.T, m: q.m })}`;
  if (Math.hypot(a.x + 40, a.y - 10) > 1e-9) return 'ты не там, где была копия'; return ''; };
check(`test_obmen_massa: перелив за ${KO.pereliv} с — ты по-прежнему 4, с шипом и темпом копии, прежнее тело с замком в стае, камера на большом (И29)`, sudObmen());
check('test_obmen_massa_samoproverka: обмен без перелива судья ловит', sudObmen((K, w, dt, KO0, STY, MUT, z) => { const M = K.most; if (!M) return []; K.most = null; MUT.moya = M.q.mut; STY.T = M.q.T; z(M.q.mut); w.me[0].x = M.q.x; w.me[0].y = M.q.y; return [['gotovo']]; }) ? '' : 'не заметил');
check('test_obmen_massa_samoproverka_kamera: камеру на тающем теле судья ловит', sudObmen((K, w, dt, KO0, STY, MUT, z, now) => { if (K.most) K.most.swap = true; return kol.shag(K, w, dt, KO0, STY, MUT, z, now); }) ? '' : 'не заметил');
{ const { a, q, w } = mir(), K = kol.sozdat(), STY = { T: 10 }, MUT = { moya: null }; kol.nachat(K, w, q, 0); let e1 = [], e2 = [], t = 0;
  for (; t < KO.pereliv * 0.3; t += DT) kol.shag(K, w, DT, KO, STY, MUT, () => {}, t); w.staya = w.staya.filter(x => x !== q); e1 = kol.shag(K, w, DT, KO, STY, MUT, () => {}, t); const m1 = a.m;
  const b = mir(); kol.nachat(K, b.w, b.q, 10); for (t = 10; t < 10 + KO.pereliv * 0.3; t += DT) kol.shag(K, b.w, DT, KO, STY, MUT, () => {}, t); b.a.grab = 1; e2 = kol.shag(K, b.w, DT, KO, STY, MUT, () => {}, t); b.a.grab = 0;
  const rano = kol.mozhno(K, b.w, b.q, t + KO.povtor - 0.5), pozzhe = kol.mozhno(K, b.w, b.q, t + KO.povtor + 0.1), sum = b.a.m + b.q.m;
  check(`test_obmen_kraya: копию съели — ты снова 4 (${m1.toFixed(2)}); схватили — обрыв, масса делится как успела (${b.a.m.toFixed(2)} + ${b.q.m.toFixed(2)}), повтор через ${KO.povtor} с`,
    e1[0]?.[0] === 'syeli' && Math.abs(m1 - 4) < 1e-9 && e2[0]?.[0] === 'oborvan' && Math.abs(sum - 4.5) < 1e-9 && b.a.m < 4 && rano === 'povtor' && pozzhe === '' ? '' : JSON.stringify({ e1, m1, e2, am: b.a.m, rano, pozzhe })); }
{ const W = 390, H = 844, r = Math.min(W, H) * KO.radius, M = kol.mesta(16, W / 2, H / 2, r), min = Math.min(...M.map(([x, y], i) => Math.hypot(x - M[(i + 1) % 16][0], y - M[(i + 1) % 16][1])));
  const vse = M.every(([x, y]) => x - KO.razmer / 2 >= 0 && x + KO.razmer / 2 <= W), centr = kol.podPaltsem(M, W / 2, H / 2, KO.lovit), na5 = kol.podPaltsem(M, M[5][0] + 10, M[5][1] - 8, KO.lovit);
  check(`test_koleso_mesta: 16 копий на телефоне 390 точек — между целями ${min.toFixed(0)} точек (не меньше 44), все на экране; середина — отмена, у пятой — пятая`, min >= 44 && vse && centr === -1 && na5 === 5 ? '' : JSON.stringify({ min, vse, centr, na5 })); }
process.exit(bad ? 1 : 0);
