// Сторож маяка сестры «Капли» (книга П12): node proby/zaplyv/kaplya/test_mayak.mjs. Провал — код 1. Числа — kaplya.json «mayak».
import fs from 'fs'; import { shag, kraj } from './mayak.js'; import { probudit, sozdat } from './rod.js';
const KK = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K = KK.mayak;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = K => { const w = { away: [{ x: 3000, y: 0, a: 0, m: 1.5 }, { x: -3000, y: 0, a: 0, m: 0.8 }], me: [], ids: 1 };
  let r = shag(w, 0.1, K); if (!r || r.x !== 3000) return 'маяк не на самой крупной сестре'; w.away = []; for (let i = 0; i < 100; i++) r = shag(w, 0.1, K); if (!r) return 'сестра растаяла вдали — род её забыл';
  if (kraj(360, 500, 720, 1000, K)) return 'сестра на экране, а маяк горит'; const p = kraj(5000, 500, 720, 1000, K); if (!p || p.x < 720 - K.otstup - 1 || p.x > 720) return 'маяк не у правого края';
  const L = kraj(-5000, -5000, 720, 1000, K); if (!L || L.x > 360 || L.y > 500) return 'маяк не с её стороны';
  const sis = probudit(sozdat(), w, KK.rod, 10, 0, 0); if (!sis || Math.hypot(sis.x - r.x, sis.y - r.y) > 1) return 'род проснулся не в сестре маяка'; if (w.rodnya) return 'маяк не погас после пробуждения';
  return ''; };
check('test_mayak: маяк на самой крупной сестре, у края с её стороны, пока она за краем; гибель — просыпаешься в ней (П12, П73)', sud(K));
check('test_mayak_samoproverka: отступ во весь экран — судья краснеет', sud({ ...K, otstup: 400 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
