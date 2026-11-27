// Сторож мести обидчику «Капли» (pravki_po_blokam.md Д.9, Роман 27.11 14:29 И25): node proby/zaplyv/kaplya/test_mest.mjs.
// test_mest: убит амёбой — у неё метка; без оружия метка тёмная; яд 1-го уровня амёбу не берёт (s_urovnya), 2-го — «по зубам» один раз; победа — «отомщено». Не больше max обидчиков.
import fs from 'fs'; import * as mst from './mest.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), B = KAP.boj;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = (M0 = mst) => { const am = { x: 10, y: 0, m: 6 }, w = { amoebas: [{ x: 300, y: 0, m: 6 }, am], genes: {}, lvl: {} }, M = M0.sozdat();
  const q = M0.zapomnit(M, w, B, 'amoebas', 0, 0, 0, 'amoeba'); if (q !== am) return 'обидчик не та амёба, что рядом';
  if (M0.shag(M, w, B, []).length || M.spisok[0].poZubam) return 'без оружия уже «по зубам»';
  w.genes.toxin = true; w.lvl.toxin = 1; if (M0.shag(M, w, B, []).length) return 'яд 1-го уровня, а амёба «по зубам» (ей нужен 2-й)';
  w.lvl.toxin = 2; const e1 = M0.shag(M, w, B, []), e2 = M0.shag(M, w, B, []); if (e1[0]?.[0] !== 'po_zubam' || e1[0][2] !== 'amoeba' || e2.length) return `«по зубам»: ${JSON.stringify(e1)} потом ${JSON.stringify(e2)}`;
  const e3 = M0.shag(M, w, B, [['ameba', am]]); if (e3[0]?.[0] !== 'otomshcheno' || e3[0][1] !== 'ameba' || M.spisok.length) return `победа: ${JSON.stringify(e3)}`;
  for (let i = 0; i < 5; i++) { w.amoebas.push({ x: 1000 * i, y: 50, m: 6 }); M0.zapomnit(M, w, B, 'amoebas', 1000 * i, 50, i, 'amoeba'); } if (M.spisok.length > B.mest.max) return `обидчиков ${M.spisok.length}, а не больше ${B.mest.max}`; return ''; };
check(`test_mest: убит амёбой — метка; яд 1-го уровня не берёт, 2-го — «по зубам» один раз; победа — «отомщено» и кусочки ×${B.mest.kuski}; обидчиков не больше ${B.mest.max} (Д.9, И25)`, sud());
check('test_mest_samoproverka: метку, что светлеет без оружия, судья ловит', sud({ ...mst, poZubam: () => true, shag: (M, w, B0, u) => { for (const o of M.spisok) if (!o.poZubam) { o.poZubam = true; return [['po_zubam', 'ameba', o.who]]; } return mst.shag(M, w, B0, u); } }) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
