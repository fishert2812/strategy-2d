// Сторож «Семена рода» (книга П76, П94): node proby/zaplyv/kaplya/test_semena.mjs. Провал — код 1. Числа — из kaplya.json.
import fs from 'fs'; import { vybor, posadit, shag } from './semena.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).semena, radius = m => 10 * Math.cbrt(m);
const GENY = { capsule: {}, toxin: {}, sense: {}, lock: {}, flagellum: {} };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = K => { const v = vybor({ ubiytsa: 'amoeba', geny: ['toxin', 'sense', 'gulp', 'fast'] }, K, GENY, { sense: true });
  if (v.join() !== 'capsule,toxin') return `выбор ${v}: первой защита от убийцы, потом умения прошлого тела, без тех, что уже есть, и без «Глотать»`;
  const a = { x: 0, y: 0, a: 0, m: 1 }, S = posadit(a, K, v); if (S.some(s => Math.hypot(s.x, s.y) < K.daleko[0] - 1 || s.x <= 0)) return 'семена не впереди по курсу';
  let g = null; for (let i = 0; i < 200 && !g; i++) g = shag(S, {}, a, K, 0.05, radius); if (!g) return 'семя не доплыло';
  return S.length ? 'остальные семена не ушли' : ''; };
check('test_semena: защита от убийцы и умения прошлого тела плывут навстречу; коснулся — одно твоё, остальные уходят (П76)', sud(K));
check('test_semena_samoproverka: без защиты от убийцы судья краснеет', sud({ ...K, zashchita: {} }) ? '' : 'судья не заметил');
const S2 = posadit({ x: 0, y: 0, a: Math.PI, m: 1 }, K, ['lock']); for (let i = 0; i < 200; i++) S2.length && shag(S2, {}, { x: 5000, y: 0, a: 0, m: 1 }, K, 0.05, radius);
check('test_semena_uhodyat: не коснулся за t секунд — семена уходят', S2.length ? 'семена висят' : '');
process.exit(bad ? 1 : 0);
