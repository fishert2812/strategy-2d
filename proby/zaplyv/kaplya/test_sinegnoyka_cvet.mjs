// Сторож цвета синегнойки «Капли» (К п. 8, проверка 27.11: «Синегнойку нельзя отличить от игрока по цвету»; образец referensy/sinegnoyka: сине-зелёный пиоцианин).
// node proby/zaplyv/kaplya/test_sinegnoyka_cvet.mjs
// test_sinegnoyka_cvet: в игре (запись vid_chasti.json + перекрас kaplya.json, как собирает main.js) оттенок её оболочки, ворса и жгутика
//   отстоит от твоего цвета (наружный слой и плотное тело) не меньше perekras.razlichie градусов; перекрас идёт до цвета дальней взвеси (LODC).
// Самопроверка: без перекраса (розовая запись) судья краснеет.
import fs from 'fs'; import { perekrasit, ottenok } from './perekras.js';
const VC = JSON.parse(fs.readFileSync(new URL('../vid_chasti.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url)));
const MAIN = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sobrat = P => { const ZAP = {}; for (const [k, v] of Object.entries(KAP.zhiteli)) if (v && VC.vidy[v.zapis]) ZAP[k] = { ...VC.vidy[v.zapis], gruppa: undefined }; return perekrasit(ZAP, P); };
const raznica = (a, b) => { const d = Math.abs(ottenok(a) - ottenok(b)) % 360; return Math.min(d, 360 - d); };
function sud(P) {
  const S = sobrat(P).sinegnoyki; if (!S) return 'синегнойки нет среди жителей';
  const ch = S.chasti, ee = [['оболочка', ch.obolochka.sloi[0].cvet], ['ворс', ch.vorsinki.cvet], ['жгутик', ch.zhgutiki.cvet]];
  const ya = VC.vidy[KAP.stolk.igrok.zapis].chasti.obolochka.sloi.flatMap((s, i) => i === 0 || s.plotno ? [[`твой слой ${i}`, s.cvet]] : []); /* твой цвет на глаз: наружный слой и плотное тело */
  const plohie = []; for (const [n, c] of ee) for (const [m, d] of ya) if (raznica(c, d) < KAP.perekras.razlichie) plohie.push(`${n} ${Math.round(ottenok(c))}° и ${m} ${Math.round(ottenok(d))}°`);
  return plohie.length ? 'похожи: ' + plohie.join('; ') : '';
}
const i = MAIN.indexOf('prk.perekrasit(ZAP, KAP.perekras)'), j = MAIN.indexOf('const LODC = {}');
check('test_sinegnoyka_cvet: синегнойка сине-зелёная, с первого взгляда не ты', sud(KAP.perekras) || (i < 0 || j < 0 || i > j ? 'main.js не перекрашивает до цвета взвеси' : ''));
check('test_sinegnoyka_cvet_samoproverka: розовую запись без перекраса судья видит', sud({}) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
