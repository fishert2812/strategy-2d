// «Заплыв» на экране (Three.js). Управление большим пальцем: коснулся где угодно — там встал джойстик,
// сдвиг пальца от этой точки задаёт, куда и как быстро плыть; короткое касание — вытянувшиеся делятся.
// Клетки — объёмные тела со светом (body3d.js): капсулы, шары с шипами, амёбы, гранёные фаги.
// Сверху — точки: еда, жгутики, крупинки внутри клеток, фаги, взвесь вдали и размытые соринки вблизи.
import * as THREE from '../three.module.min.js';
import { World, radius } from '../sim.js';
import * as mut from '../mutacii.js';
import * as rost from '../rost.js'; import * as glk from './glotok.js'; import { dnkPolosa } from './dnk_polosa.js';
import * as dv from '../dvizhok.js'; // палочки-соседи рисуются по анкетам (vidy.json)
import * as evo from '../evo.js'; // режим «Эволюция»: пока только по адресу ?rezhim=evo, плитка в меню — когда все умения нарисованы
import { Stick } from '../controls.js';
import { follow } from '../soft.js';
import { look } from '../look.js';
import * as vid from '../vid.js';
import { Fx } from '../fx.js';
import { Bodies } from '../body3d.js';
import { genomeScreen } from '../genome.js';
import { mark, message } from '../feedback.js';
import { almanahScreen } from '../almanah.js';
import { night } from '../night.js';
import * as karta from '../karta.js';

const cfg = await (await fetch('data.json')).json();
// Форк по книге: жители капли — записи конструктора (vid_chasti.json), кто чем рисуется — kaplya/kaplya.json
import { sobrat, sobrat_gruppu, VC, chasti_navykov } from '../vid_chasti.js';
import * as bodo from './bodo.js'; // бодо — хозяин главы 1 (книга П37, П39), руками
import * as cel from './cel.js'; import * as prk from './perekras.js'; /* К п. 8: перекрас записи жителя только в «Капле» */
import * as zh from './zhiteli.js';
import * as les from './lestnica.js'; // аркада «Лестница» (П86–П89): ?lestnica
import * as umn from './umeniya.js'; // умения по книге: «Вампир», шапка «Нюха» (П65, П71)
import * as obl from './oblasti.js'; // области по книге: плёнка, без кислорода, сероводород, тень (П29–П33)
import * as gol from './golod.js'; // события области по книге П85: голод волнами, засуха
import * as mk from './mayak.js'; // маяк сестры у края экрана (книга П12)
import * as pkz from './pokaz.js'; // показ нового мира после хозяина главы (книга П13, П84)
import * as sp from './sposoby.js'; // способы есть: «Присоска» и «Общие соки» (книга П18, П19)
import * as ruka from './ruka.js'; // какой рукой ведут: линейка со стороны, которую не закрывает палец (книга П4)
import * as zr from './zaraza.js'; // большая клетка заметнее: больше вирусов и запятых (книга П52)
import * as vir from './virus.js'; // знак вируса водой: серая муть (книга П7)
import * as vd from './vdoh.js'; // «вдох» клетки на каждый кусок (книга П13)
import * as kis from './kislota.js'; // кислая вода у грозди шариков (книга П26, П39)
import * as rod from './rod.js'; // род жив: раз за заплыв просыпаешься сестрой (П73)
import * as sm from './semena.js'; // между заплывами: семена рода, рекорд размера (П76, П94)
import * as glv from './glavy.js'; // главы 2–5 (П79–П83)
import * as lin from './lineyka.js'; // линейка из живых силуэтов (П5, П87)
import * as vh from './vehi.js'; // рост по книге: длина П51, вехи П54, худение за умения П49
import * as vdv from './rot.js'; /* Ш2: водоворот у рта */
import * as stk from './stolk.js'; /* столкновения по контуру записей движка */
import * as fl from './flazhok.js'; /* L070: один флажок на всех экранах */ import * as kus from './kusalka.js'; /* Ш38: кусалка по местам */ import * as sob from './sobytiya.js'; /* Ш41: события объявлены заранее */ import * as svr from './sverlo.js'; /* Ш39: сверло руками */ import * as lop from './lopnut.js'; /* Ш4: убитый лопается точками */ import * as zn from './zona.js'; /* Ш40: тихая и злая вода */ import * as sty from './staya.js'; /* Ш32, Ш33: деление капелькой и стая */ import * as mtc from './mutaciya.js'; /* Ш34, Ш35, Ш37: мутация, вирус по стае, закрепление */ import * as rsv from './rastvor.js'; /* Ш29–Ш31: растворять, глотать по размеру, слабый старт */ import * as krm from './kormyozhka.js'; /* П35: добыча по росту */ import * as svi from './svet_il.js'; /* П27, П30: окна света, лабиринт ила */ import * as ptl from './potolok.js'; /* П53: потолки роста и большие события */ import * as psh from './pishcha.js'; /* кто кого ест без тебя (П42) */ import * as nv from './navyki.js'; /* навыки по книге: уровни, повторы ступенями, «сработало» */ import * as boj from './boj.js'; import * as kn from './knopki.js'; import * as pit from './pitanie.js'; import * as kol from './koleso.js'; import * as mst from './mest.js'; import * as trp from './trup.js'; import * as glc from './glava.js'; import * as zhv from './zahvat.js'; import * as edr from './eda_ryadom.js'; /* L081: еда на каждом шагу */ /* L074: захват всегда кончается */ /* блок Ц: «Очисти каплю» */ /* Ж.3: серое тело и «Глотать» пузырём */ /* Д.9: месть обидчику */ /* Е.3 п. 9–12: колесо стаи и перелив */ /* Ж.3: лестница питания */ import * as am from './ameba.js'; /* Д.10 п. 7: амёба тянет вырост и обходит чашей */ /* Д.10 п. 3: кнопка «Яд» с запасом и облаком */ import * as gm from './genom.js'; /* одна таблица боя «кто кого и чем», удар по геному */
const VEHI = vh.zagruzit();
window.kaplyaLes = () => LES; window.kaplyaGlava = () => GLAVA; window.kaplyaCel = () => CEL; window.kaplyaZon = () => ZON; window.kaplyaSem = () => SEM; /* для сторожа тревоги (test_trevoga.cjs) */ // спирилла, каулобактер, хлорелла (книга П39), руками // строка цели, подпись линейки, «теперь еда» (книга П5–П7)
const KAP = await (await fetch('kaplya/kaplya.json')).json(), ZH = KAP.zhiteli, ZAP = {}; if (window.kaplyaStaryKokk) KAP.boj.celi.kokk.tolchok = KAP.boj.celi.kokk.tolchok_staryj; if (window.kaplyaStaryjZapas) { const X = KAP.boj.oruzhie.toxin; X.dostaet = X.dostaet_staryj; X.zapas_rashod = X.zapas_rashod_staryj; X.zapas_vosst = X.zapas_vosst_staryj; } /* L124: прежние кольцо и запас яда — для самопроверки */ if (window.kaplyaStaryjYad) { KAP.boj.oruzhie.toxin.dlitsya = KAP.boj.oruzhie.toxin.dlitsya_staryj; KAP.boj.celi.kokk.stenka.toxin = KAP.boj.celi.kokk.stenka.toxin_staryj; } /* L113: прежние числа яда — для самопроверки test_yad_palec */ boj.v_mir(cfg, KAP.boj); /* Д.6: толчок и щипок кокка, укол соперницы — из таблицы боя */ Object.assign(rost.R, KAP.temp); if (window.kaplyaStaryMagnit) rost.R.eda = { ...rost.R.eda, glucose: 1 }; /* L077: самопроверка — сахар как раньше, с первого роста */ /* Ш26, Роман 21:22 «вырастаешь… очень быстро»: в «Капле» рост реже, основной «Заплыв» не меняется */
Object.assign(cfg, KAP.mir); /* блок К (Роман 27.11 14:44: «нужно доабавиь много существ в каплю»): частоты жителей sim.js в «Капле», основной «Заплыв» не меняется */ { const U = KAP.upravlenie; cfg.sense_idle = U.sense_idle; cfg.sense_pull = U.sense_pull; } // Роман 26.11 20:39: клетку ведёт только палец; «Нюх» не везёт к еде
for (const [k, v] of Object.entries(ZH)) if (v && VC.vidy[v.zapis]) ZAP[k] = { ...VC.vidy[v.zapis], gruppa: undefined }; prk.perekrasit(ZAP, KAP.perekras); /* К п. 8: синегнойка сине-зелёная, не розовая, как ты */
// нарисовать жителя записью: x, y — экран, a — куда смотрит, mera — ручная мера тела (длина, радиус, толщина) на экране
// Лаги на большой клетке (Роман 26.11: «Лагать и нагреваться телефон стал… большим стал»): камера отъезжает, и в кадр входят сотни жителей,
// каждый собран полной записью. Книга П35: что мельче тебя в десятки раз, сливается во взвесь. Житель мельче KAP.lod.px точек экрана рисуется
// одной мягкой точкой своего цвета, а не телом из частей; крупных рядом с тобой это не касается.
const LODC = {}; for (const [k, Z] of Object.entries(ZAP)) { const c = Z.chasti?.obolochka?.sloi?.[0]?.cvet || Z.chasti?.telo?.cvet || [0.8, 0.85, 0.9]; LODC[k] = c.map(v => Math.min(1, v)); }
const lod = { tel: 0, tochek: 0 }; // window.kaplyaBezLod выключает взвесь — только для самопроверки сторожа нагрузки (test_nagruzka.cjs)
const RSV_SPISKI = Object.fromEntries(cel.SPIS.map(([l, w]) => [w, l])); // кто → список мира (вернуть отпавший кусок)
const ms0 = (q, who) => q.m || evo.E.glotat.razmer[who] || 1; // масса жителя, как в «Глотать»
const SER = {}, seryjChasti = (function m(o) { if (Array.isArray(o)) return o.map(m); if (!o || typeof o !== 'object') return o; const r = {}; /* Ж.3: запись вида без цвета и темнее — оттенок, а не новая картинка */
  for (const [kk, v] of Object.entries(o)) r[kk] = (kk === 'cvet' || kk === 'kromka') && Array.isArray(v) && typeof v[0] === 'number' ? (L => [L, L, L])((0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2]) * KAP.trup.temnee) : m(v); return r; }), seryj = k => SER[k] ||= { ...(ZAP[k] || {}), chasti: seryjChasti(JSON.parse(JSON.stringify((ZAP[k] || {}).chasti || {}))) }; /* перекрашиваем только части: в записи есть посчитанные движком объекты */
const zhitel = (k, q, x, y, a, mera, time, z) => { if (q.vid && ZAP[k + ':' + q.vid]) k += ':' + q.vid; /* блок К: вариант жителя своей записью (большая амёба, сенная палочка) */ const Z = ZAP[k]; if (!Z) return false; const t = mera * ZH[k].tolshchina; if (q.sverlo) { const R = q.sverlo * z, c = LODC[k]; glow.put(x, y, R * 1.1, ...c, KAP.sverlo.shar); for (let i = 0; i < 36; i++) { const u = i / 36 * 6.283 + time * 0.3; ink.put(x + Math.cos(u) * R, y + Math.sin(u) * R, 2 * Math.max(1, z * 0.7), ...c, 0.9); } return true; } /* Ш39: ты внутри — она полупрозрачный шарик вокруг тебя */
  if (!window.kaplyaBezLod && !(k === 'staya' && !q.daleko) && (t < KAP.lod.px || (q.m || 1) < lod.ya * KAP.lod.dolya)) { lod.tochek++; glow.put(x, y, t * KAP.lod.razmer + 1, ...LODC[k], KAP.lod.a); return true; }
  lod.tel++; q._poza = { a, t: t / z }; sobrat(Z, { x, y, a, tolshchina: t, z, time, id: q.id || 1, beg: 1 }, bodies); return true; }; /* _poza — какой житель нарисован, по ней он и сталкивается (stolk.js) */
window.kaplyaLod = () => ({ ...lod }); // для замера: сколько жителей в кадре телом и сколько точкой
const DL = cfg.delenie; // деление по физике (design/zaplyv_fizika_kak_v_zhizni.md, п. 14)
const NJ = await (await fetch('night.json')).json(); // «Ночь рода»: числа ночи
const cards = await (await fetch('cards.json')).json(); cards.bodo = KAP.bodo.karta; for (const [k, v] of Object.entries(KAP.karty_krupnyh)) if (k !== '_') cards[k] = v; // карточки гибели от бодо и крупных П40
const genomeData = await (await fetch('genome.json')).json();
const W = 720; // ширина экрана в единицах игры
const canvas = document.getElementById('c');
const gl = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
// Плотность кадра (Роман 25.11: «мутнота», ночью: «расплывчатое»): на iPhone сразу полная — 3 точки на точку экрана. Если телефон её не тянет
// (средний кадр за cfg.dpr_check кадров дольше cfg.dpr_slow мс), один раз и насовсем на этот заход откатываемся до cfg.dpr_max (L052).
let dprNow = Math.min(devicePixelRatio, cfg.dpr_full); gl.setPixelRatio(dprNow);
let H = W;
const cam = new THREE.OrthographicCamera(0, W, 0, W, -1, 1);
const back = new THREE.Scene(); // фон и дальнее
const water = new THREE.Scene(); // толща воды: считается в треть разрешения — она мягкая, а телефону легче
const rt = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
const scene = new THREE.Scene(); // точки поверх тел
const bodies = new Bodies(); let PROP_YA = 1.6; /* вытянутость твоего тела (полудлина / полутолщина) — части на копиях стаи по ней */
// Цвета как на раскрашенных снимках: у каждой стороны оболочка одного цвета, содержимое другого.
const CELL = [new THREE.Color(0.35, 0.85, 1.0), new THREE.Color(1.0, 0.5, 0.2), new THREE.Color(0.6, 1.0, 0.35)]; // оболочка
const fx = new Fx(cfg, CELL); // анимации взаимодействий (fx.js)
const CORE = [new THREE.Color(0.85, 0.22, 0.62), new THREE.Color(0.8, 0.1, 0.16), new THREE.Color(1.0, 0.82, 0.2)]; // содержимое
const TINT = [[0.02, 0.07, 0.12], [0.08, 0.035, 0.1], [0.03, 0.08, 0.05]]; // вода, сладкая, ил

const quad = (frag, uniforms, order) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: frag,
  }));
  m.renderOrder = order;
  m.frustumCulled = false;
  (order < 0 ? water : back).add(m);
  return m;
};

const U = { res: { value: new THREE.Vector2() }, time: { value: 0 }, tint: { value: new THREE.Vector3(...TINT[0]) }, drift: { value: new THREE.Vector2() } };
// Вода как вещество (по 9-му референсу Романа): цветная толща, сверху светлее — там поверхность и свет,
// лучи света наискосок и каустика, два слоя сетки слизи и волокон с параллаксом (дальний размыт), виньетка.
const bg = quad(`uniform vec2 res; uniform float time; uniform vec3 tint; uniform vec2 drift;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fib(vec2 p, float sharp){ // волокна: гребни шума после искривления пространства
  vec2 q = p + vec2(vn(p * 0.7 + 3.1), vn(p * 0.7 - 1.7)) * 2.2;
  return pow(1.0 - abs(vn(q) * 2.0 - 1.0), sharp); }
// Сородичи в толще (по референсам Романа 24.11): палочки на трёх глубинах, чем дальше — тем мельче, мутнее и размытее.
// Пространство режется на клетки сетки; в части клеток лежит одна палочка со своим углом и длиной.
float sdCap(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
vec4 kin(vec2 s, float sc, float blur, float seed, float t){ // одна палочка на клетку сетки, целиком внутри неё: один расчёт на пиксель
  vec2 g = s * sc, c = floor(g);
  float h = h2(c + seed); if (h > 0.4) return vec4(0.0);
  vec2 o = c + 0.5 + (vec2(h2(c + seed + 1.3), h2(c + seed + 2.7)) - 0.5) * 0.2 + 0.05 * vec2(sin(t * 0.2 + h * 30.0), cos(t * 0.17 + h * 20.0));
  float an = h2(c + seed + 5.1) * 6.283 + sin(t * 0.1 + h * 9.0) * 0.3, L = 0.07 + 0.12 * h2(c + seed + 7.3), r = 0.1;
  vec2 u = vec2(cos(an), sin(an)) * L;
  float d = sdCap(g, o - u, o + u) - r;
  float body = 1.0 - smoothstep(-blur, blur, d);
  // объём как у шара: нормаль из глубины внутрь тела, свет сверху-слева, блик и мягкая кромка
  float inner = clamp(-d / r, 0.0, 1.0), e = 1.0 - inner;
  vec2 dir = normalize(g - (o + u * clamp(dot(g - o, u) / dot(u, u), -1.0, 1.0)) + vec2(0.0001));
  vec3 n = vec3(dir * e, sqrt(max(0.0, 1.0 - e * e)));
  float lam = max(0.0, dot(n, normalize(vec3(-0.5, 0.6, 0.65)))), spec = pow(max(0.0, dot(n, normalize(vec3(-0.35, 0.45, 1.0)))), 18.0);
  float grain = vn(g * 38.0 + seed);
  vec3 c0 = vec3(0.16, 0.38, 0.44) * (0.3 + 1.0 * lam) * (0.8 + 0.35 * grain) + vec3(0.6, 0.8, 0.85) * spec * 0.5 + vec3(0.25, 0.5, 0.55) * pow(e, 4.0) * 0.6;
  return vec4(c0, body);
}
void main(){
  vec2 uv = gl_FragCoord.xy / res, asp = vec2(1.0, res.y / res.x), s = uv * asp;
  float top = uv.y; // 1 — у поверхности
  vec3 col = mix(tint * 0.55, tint * 2.4 + vec3(0.02, 0.05, 0.07), smoothstep(-0.1, 1.2, top));
  float rays = pow(0.5 + 0.5 * sin(s.x * 9.0 + s.y * 3.0 + time * 0.15) * sin(s.x * 3.7 - s.y * 1.2 - time * 0.07), 3.0);
  col += vec3(0.05, 0.1, 0.12) * rays * smoothstep(0.1, 1.0, top);
  vec2 cp = s * 7.0 + drift * 7.0 * 0.8;
  float cau = pow(1.0 - abs(vn(cp + vec2(time * 0.2, -time * 0.13)) * 2.0 - 1.0), 6.0) * pow(1.0 - abs(vn(cp * 1.3 - vec2(time * 0.17, time * 0.1)) * 2.0 - 1.0), 6.0);
  col += vec3(0.25, 0.4, 0.45) * cau * smoothstep(0.3, 1.0, top);
  float far = fib(s * 3.0 + drift * 3.0 * 0.35 + vec2(0.0, time * 0.01), 3.0);
  col += tint * 0.6 * far + vec3(0.008, 0.02, 0.035) * far;
  float mid = fib(s * 5.5 + drift * 5.5 * 0.7 + vec2(time * 0.015, 0.0) + 11.0, 9.0);
  col += vec3(0.14, 0.28, 0.42) * mid * 0.22;
  // три глубины сородичей: дальние мельче, тонут в дымке цвета воды и сдвигаются медленнее
  vec3 fog = tint * 2.0 + vec3(0.02, 0.05, 0.06);
  for (int k = 0; k < 3; k++) {
    float fk = float(k), sc = 4.2 - fk * 1.2, par = 0.2 + fk * 0.2, haze = 0.8 - fk * 0.25;
    vec4 b = kin(s + drift * par + vec2(0.0, time * 0.004 * (fk + 1.0)), sc, 0.12 - fk * 0.03, fk * 17.0, time);
    col = mix(col, mix(b.rgb + col * 0.6, fog, haze), b.a * (1.0 - haze * 0.55));
  }
  float d = length((uv - 0.5) * asp);
  col *= 1.0 - 0.45 * smoothstep(0.35, 0.95, d);
  gl_FragColor = vec4(col, 1.0);
}`, U, -1);
const waterShow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: { t: { value: rt.texture } }, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D t; varying vec2 v; void main(){ gl_FragColor = texture2D(t, v); }' }));
waterShow.renderOrder = 0; waterShow.frustumCulled = false; waterShow.scale.y = -1; back.add(waterShow);


// Слой мягких точек на инстансах: одна отрисовка на слой, сколько бы точек ни было.
class Dots {
  constructor(max, target, order, add, hard) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.a = new Float32Array(max * 3); this.c = new Float32Array(max * 4);
    g.setAttribute('pr', new THREE.InstancedBufferAttribute(this.a, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('col', new THREE.InstancedBufferAttribute(this.c, 4).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { hard: { value: hard } }, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      blending: add === 'field' ? THREE.CustomBlending : add ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec3 pr; attribute vec4 col; varying vec2 v; varying vec4 vc;
        void main(){ v = position.xy; vc = col; gl_Position = projectionMatrix * vec4(pr.xy + position.xy * pr.z, 0.0, 1.0); }`,
      fragmentShader: add === 'field'
        ? `varying vec2 v; varying vec4 vc; void main(){ float d = dot(v, v); float a = (1.0 - d) * (1.0 - d); if (d > 1.0) discard; gl_FragColor = vec4(vc.rgb * a, 1.0); }`
        : add === 'ring'
        ? `varying vec2 v; varying vec4 vc; void main(){ float d = length(v); if (d > 1.0) discard;
           ` + (window.kaplyaStaryePuzyri ? `float a = 0.35 + smoothstep(0.7, 0.93, d) * (1.0 - smoothstep(0.93, 1.0, d)) * 1.6; gl_FragColor = vec4(vc.rgb, vc.a * a); }` : `float e = 1.0 - smoothstep(0.85, 1.0, d), a = (0.45 + 0.75 * d * d) * e; float sp = 1.0 - smoothstep(0.0, 0.3, length(v - vec2(-0.38, 0.4))); gl_FragColor = vec4(mix(vc.rgb, vec3(1.0), sp * 0.85), vc.a * (a + sp * 2.2)); }`) /* L134 (переигровка b44b767: «бледные пустые кольца-пузыри выглядят как пустые кружки»): пузырь — линза с бликом, без резкого обода */
        : `uniform float hard; varying vec2 v; varying vec4 vc; void main(){ float d = length(v); if (d > 1.0) discard;
           float a = mix(1.0 - d, 1.0 - smoothstep(0.75, 1.0, d), hard); gl_FragColor = vec4(vc.rgb, vc.a * a * a); }`,
    });
    if (add === 'field') { mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneFactor; mat.blendEquation = THREE.AddEquation; }
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    this.g = g; this.n = 0; this.max = max;
    target.add(this.mesh);
  }
  put(x, y, r, cr, cg, cb, ca = 1) {
    if (this.n >= this.max) { this.lost = (this.lost || 0) + 1; return; } // запас кончился: точка выпала — линия рвётся в пунктир (L047); probe.lost ловит
    const i = this.n++;
    this.a[i * 3] = x; this.a[i * 3 + 1] = y; this.a[i * 3 + 2] = r;
    this.c[i * 4] = cr; this.c[i * 4 + 1] = cg; this.c[i * 4 + 2] = cb; this.c[i * 4 + 3] = ca;
  }
  done() {
    this.g.instanceCount = this.n;
    this.g.attributes.pr.needsUpdate = this.g.attributes.col.needsUpdate = true;
    this.g.attributes.pr.addUpdateRange?.(0, this.n * 3); this.n = 0;
  }
}
const far = new Dots(80, back, 1, 'ring', 0); window.kaplyaPuzyrBlik = !window.kaplyaStaryePuzyri; /* L134 */
const glow = new Dots(cfg.kist.glow, scene, 3, true, 0.6);
const tuman = new Dots(600, scene, 2, false, 0.7); tuman.mesh.material.depthTest = true; /* L090: облако яда — обычное смешивание и под твоей клеткой (по глубине), а не сложением поверх: сложение выжигало клетку в белое */
const ink = new Dots(cfg.kist.ink, scene, 4, false, 0.8); // запас кисти с избытком: в людном кадре (кольца зон, нити, колонии) 3000 не хватало и кольцо зоны рвалось бусинами
const near = new Dots(12, scene, 5, false, 0); // передний план: размытые клетки у края кадра
const dust = new Dots(120, scene, 3, true, 0.9);
const bubbles = new Dots(60, scene, 4, 'ring', 0);
const wake = new Dots(240, scene, 3, true, 0.9); // след в воде: частицы, которые клетка расталкивает
let puffs = [], cur = [0, 0], kids = null;

const derzh = []; // знаки у края, которые ещё держатся после ухода круга (О116)
let hudN = -1; const hudNiz = () => { if (hudN < 0) { const b = $('pause').getBoundingClientRect(); hudN = b.bottom > 0 ? b.bottom * W / innerWidth : 0; } return hudN; }; // низ строки счёта в единицах игры (стрелки у края не налезают на неё)
function resize() {
  hudN = -1;
  const w = innerWidth, h = innerHeight;
  H = W * h / w;
  gl.setSize(w, h, false);
  const px = gl.getDrawingBufferSize(new THREE.Vector2());
  rt.setSize(Math.max(4, Math.round(px.x / 4)), Math.max(4, Math.round(px.y / 4))); // толща мягкая: хватает четверти
  U.res.value.set(rt.width, rt.height);
  cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = H; cam.updateProjectionMatrix();
  bodies.resize(W, H);
  for (const m of [bg, waterShow]) { m.scale.set(W, m === waterShow ? -H : H, 1); m.position.set(W / 2, H / 2, 0); }
}
addEventListener('resize', resize);
resize();

// Звук без файлов: короткие тоны WebAudio. Safari включает звук только после касания.
let audio = null;
const beep = (f, dur, vol = 0.05, type = 'sine', slide = 0.6) => {
  if (!audio || ROD.quiet) return;
  const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
};

const STICK = 56; // полный ход большого пальца (~30 точек экрана); дальше кольцо едет за пальцем
const pad = new Stick(STICK);
let GOL = gol.sozdat(); let POK = pkz.sozdat(); let ZAR = zr.sozdat(); let VIR = []; let VDOH = 0; let KIS = kis.sozdat(); const DNK = dnkPolosa(); let ROT = vdv.sozdat(); const NOS = m => KAP.rot.nos * KAP.stolk.igrok.w * m ** KAP.stolk.igrok.stepen; /* Ж.2б: рот у кончика нарисованного тела */
let LIN = null, GL = null, SEM = [], ROD_K = rod.sozdat(), OBL = obl.sozdat(), LES = les.sozdat(), GLAVA = 1, CEL = cel.sozdat(), world, view, finger = null, down = null, moved = false, shake = 0, ended = false, lastEat = 0;
const $ = id => document.getElementById(id);
const ver = (await (await fetch('version.json')).json()).number; // свой номер «Заплыва», список — VERSIONS.md
$('ver').textContent = 'Капля по книге · ' + ver;
fetch('../version.txt').then(r => r.ok ? r.text() : '').then(t => { if (t.trim()) $('ver').textContent = window.kaplyaStarayaVersiya ? 'Капля по книге · ' + ver + ' · ' + t.trim().slice(0, 7) : 'Капля · ' + t.trim().slice(0, 7); /* L125: на экране sha выкладки, номер 0.113 — от основного «Заплыва» и не менялся */ }).catch(() => {});

function start(genes, mode) {
  world = new World(cfg, (Math.random() * 2 ** 31) | 0); world.mode = mode || 'swim'; nv.nastroit(world, mut, KAP.navyki); NAV = nv.sozdat(); // режим «Мутации» включает новые мутации (mutacii.js)
  world.posle = Object.fromEntries(Object.values(GENY.geny || {}).filter(q => q.klyuch).map(q => [q.klyuch, q.posle || []])); world.known = met; // ген от того, кого уже встречал
  if (Array.isArray(genes)) world.inherit(genes); // заплыв веткой рода после «Ночи рода»
  $('night').classList.remove('on'); $('menu').classList.remove('on');
  if (GOL.zapas && world) { world.cfg.food_per_chunk = GOL.zapas.f; world.cfg.food_patches = GOL.zapas.p; } GOL = gol.sozdat(); POK = pkz.sozdat(); ROT = vdv.sozdat(); ZAR = zr.sozdat(); KIS = kis.sozdat(); // голод, показ мира и заметность не переживают новый заход
  view = { x: 0, y: 0, z: 2.2, tint: [...TINT[0]] }; CEL = cel.sozdat(); GLAVA = 1; SVI = svi.sozdat(); PTL = ptl.sozdat(); KRM = krm.sozdat(); VEL = krm.sozdat(); RSV = rsv.sozdat(); STY = sty.sozdat(); MST = mst.sozdat(); TRP_S = 0; GLC = glc.sozdat(); ZHV = zhv.sozdat(); EDR = edr.sozdat(); ZON = zn.sozdat(); world.zonaGde = (x, y) => zn.gde(ZON, KAP.zona, x, y); /* очаги синегнойки — в злой воде (zhiteli.js) */ MUT = mtc.sozdat(); SVR = svr.sozdat(); SOB = sob.sozdat(); KUS = kus.sozdat(); world.staya = []; LES = les.sozdat(); OBL = obl.sozdat(); ROD_K = rod.sozdat(); zh.nachalo(world); { const P = sm.pamyat(), K = KAP.semena; SEM = P.zahodov && world.me[0] ? sm.posadit(world.me[0], K, sm.vybor(P, K, world.cfg.genes, world.genes)) : []; if (SEM.length) setTimeout(() => say(K.slova.start, 3000), 300); } // П76: семена рода
  { const sg = les.vkl() ? 1 : glv.sohranena(); if (sg >= 2 && KAP.glavy[sg] && world.me[0]) { GLAVA = sg; world.me[0].m = KAP.glavy[sg].massa; if (KAP.glavy[sg].glubina != null) { const P = world.cfg.pond; world.me[0].y = (KAP.glavy[sg].glubina - P.y0) * P.h; view.y = world.me[0].y; } /* партия 26.11: заход с главы 3 сразу у границы кислорода, а не за 11 000 единиц от неё */ setTimeout(() => say(KAP.glavy[sg].nazvanie, 3500), 600); } GL = glv.nachat(world, GLAVA); } // П76, П83: заход с последней непройденной главы
  if (les.vkl()) world.genes.gulp = true; /* Ж.3: «Глотать» сам не выдаётся никогда — только картой после «Плотоядного» (Роман 26.11 23:08); в «Лестнице» с рождения (П86) */ { const nd = world.ne_dat; world.ne_dat = g => (nd && nd(g)) || (!les.vkl() && pit.ne_dat(world, KAP.pitanie, KAP.boj, g, vh.dlina(KAP.rost, (world.me[0] || { m: 1 }).m))); } if (!les.vkl() && GLAVA === 1) bodo.nachalo(world, KAP.bodo); // П54: веха «Глотать: навсегда»; в «Лестнице» хозяина нет, «Глотать» с рождения (П86)
  if (!les.vkl() && KAP.boj.oruzhie.toxin.s_nachala && !window.kaplyaYadKartoy) world.genes.toxin = true; /* L123: яд — кнопка с запасом с первой секунды, не удача с карточкой */
  if (!window.kaplyaBezMetkiYad && new URLSearchParams(location.search).has('yad')) world.genes.toxin = true; /* L121: метка ?yad — яд с первой секунды, проверять кнопку «Яд» без ожидания карточки */
  world.zhivoe = les.vkl() ? null : boj.zhivoe(KAP.boj); world.lestnica = les.vkl(); world.trupy = les.vkl() ? null : []; /* Ж.3 */ /* Д.10 п. 2: живое сначала убить, потом съесть; в «Лестнице» по-старому */ world.cfg.lock_food = KAP.mutaciya.cena; if (window.kaplyaStaryKokk) { KAP.stolk.nepodvizhnye = []; KAP.boj.celi.kokk.bez_otskoka = false; } /* L075; старое — для самопроверки test_kokk_v_igre */ /* 12.5: цена замка ×0,95 вместо ручных ×0,75 (sim.js grow) */ world.lopnut = (kto, q) => lop.lopnut(world, KAP.lopnut, kto, q, radius); boj.ohrana(world, KAP.boj); /* Ш3: гарпун не убивает мимо генома */ if (new URLSearchParams(location.search).has('ameba') && !les.vkl()) setTimeout(() => { const a = world.me[0]; if (!a) return; let X = a.x, Y = a.y; for (let r = 300; r < 6000 && world.zonaGde(X, Y) !== 'zlaya'; r += 150) for (let u = 0; u < 6.283; u += 0.5) { const x = a.x + Math.cos(u) * r, y = a.y + Math.sin(u) * r; if (world.zonaGde(x, y) === 'zlaya') { X = x; Y = y; break; } } a.x = view.x = X; a.y = view.y = Y; world.amoebas.push({ x: X + 160, y: Y, vx: 0, vy: 0, m: Math.max(6, a.m * 6), id: ++world.ids }); }, 1500); /* ?ameba — для проверки захвата: злая вода и амёба рядом (тред проверки 27.11) */ { const g0 = world.grab.bind(world); world.derzhat = window.kaplyaStaryeSlovaAmeby ? null : a => !!(a.grab || (world.amoebas || []).some(m => m.ohv && (m.ohv.kogo || a) === a && ['prilip', 'chasha', 'puzyr'].includes(m.ohv.faza))); /* L092: пока держит хищник, ты не ешь (pravila_mira.js) */ world.mozhnoEst = window.kaplyaStaryMagnit ? null : f => !(world.derzhat && world.me[0] && world.derzhat(world.me[0])) && rost.can(world, f.kind || 'bits'); /* L077: магнит и водоворот не берут еду, которую ещё не умеешь есть */ world.bezZahvata = !!window.kaplyaBezZahvata; /* самопроверка test_L074: старое поведение */ world.grab = (a, who, by) => { if (!world.bezZahvata && zhv.kto(world, a)?.[0] === 'amoeba') return; g0(a, who, by); }; } /* L074: пока держит амёба, пасти не хватают */ { const lose0 = world.lose.bind(world); world.lose = (a, x, y, who) => { const m = a.m; if (world.trupy && a === world.me[0]) { for (const t of world.trupy) if (t.puz) { world.lopnut(t.ck, t.q); t.gone = true; } world.trupy = world.trupy.filter(t => !t.gone); } /* Ж.4: пузырёк лопается вместе с тобой */ if (SVR.vnutri && a === world.me[0]) { SVR.vnutri.q.gone = true; SVR.vnutri = null; a.vnutri = false; } /* Ш39: съели шарик — съели обоих */ lose0(a, x, y, who); if (world.me.length || les.vkl()) return; { const P = mtc.prosnutsya(MUT, world, KAP.mutaciya, who === 'phage'); if (P && !window.kaplyaStaroeProbuzhdenie) for (const m of world.amoebas || []) { const d = Math.hypot(P.a.x - m.x, P.a.y - m.y) || 1, L = radius(m.m) + radius(P.a.m) + KAP.zahvat.zazor; if (d < L) { const ux = d > 1 ? (P.a.x - m.x) / d : 1, uy = d > 1 ? (P.a.y - m.y) / d : 0; P.a.x = m.x + ux * L; P.a.y = m.y + uy * L; } if (d < L + KAP.zahvat.zazor * 4) { m.syt = Math.max(m.syt || 0, KAP.zahvat.ameba_otdyh); m.ohv = { faza: 'otdyh', t: 0 }; } } /* L116 (переигровка 06d0e96: «копия проснулась внутри той же амёбы»): просыпаешься за краем амёбы, она сыта */ if (P) { view.x = P.a.x; view.y = P.a.y; if (P.T != null) STY.T = P.T; /* L079: темп рода — копии */ if (LISTS[who] && who !== 'me' && who !== 'phage' && mst.zapomnit(MST, world, KAP.boj, LISTS[who], x, y, world.stats.time, who)) setTimeout(() => say(KAP.boj.mest.slova.pomechen.replace('{kto}', imyaKto(who)), 4000), 4200); /* Д.9: кто убил — обидчик */ { const t = (P.zamok ? KAP.mutaciya.slova.prosnulas_zamok : KAP.mutaciya.slova.prosnulas).replace('{kto}', imyaKto(who)); if (window.kaplyaStaryeSlovaAmeby) say(t, 4000); else srochno(t, 4000); } /* L100: «Гибель: кто» — сразу, а не через 3 с очереди; строки хватки гаснут */ /* пачка 2, Т13: кто убил — сказано */ /* Е.3 п. 13 */ if (P.gene) say(KAP.mutaciya.slova.zakrep.replace('{}', geneName(P.gene)), 4000, P.gene); return; } } /* Ш13, Ш35: просыпаешься самой крупной из стаи */ const sis = rod.probudit(ROD_K, world, KAP.rod, m, x, y); if (!sis) { sm.zapomnit(world, KAP.semena, who, vh.dlina(KAP.rost, m)); return; } const R = KAP.rod.slova, im = ((KAP.cel.imena[who] || [R.kto])[0] || R.kto).toLowerCase(); view.x = sis.x; view.y = sis.y; if (window.kaplyaStaryeSlovaAmeby) say(R.zhiv.replace('{kto}', im), 4500); else srochno(R.zhiv.replace('{kto}', im), 4500); /* L100: и сестрой — «Гибель: кто» сразу */ }; } // П73: род жив
  fx.reset(); fx.world = world; ended = false; // fx читает мир: сидящие вирусы, запятые, амёбы
  $('end').classList.remove('on');
  if (!les.vkl() && world.me[0]) glc.rasstavit(GLC, KAP.glava, world.me[0].x, world.me[0].y, world.r ? () => world.r() : Math.random, world.zonaGde); /* блок Ц: очаги заразы */
  setTimeout(() => say(les.vkl() ? KAP.start : KAP.glava.slova.start, 6000), 700); // книга П1: цель одной фразой, длинная форма для первого экрана
}
$('again').onclick = () => start(null, world.mode); // снова в том же режиме
{ const B = document.createElement('button'); B.id = 'kles'; B.className = 'ghost'; $('again').after(B); B.onclick = () => { location.search = les.vkl() ? '' : '?lestnica'; }; } // П89: рядом с «Плыть снова» кнопка «Лестница» (в «Лестнице» — назад в главы)
// Род между заплывами: гибели, последний род (для ночи), ветки и поколения ночей, «Тише». Память — в этом браузере.
let ROD = {}; try { ROD = JSON.parse(localStorage.getItem('zaplyv.rod') || '{}') || {}; } catch (_) {}
const saveRod = () => { try { localStorage.setItem('zaplyv.rod', JSON.stringify(ROD)); } catch (_) {} };

// Меню-сценка (книга Э21): водяной столб, объекты сцены — режимы. Первый запуск без меню; после первой гибели меню встречает при входе.
const MODES = {
  swim: { go: 'Плыть', line: 'Твоя клетка в капле пруда. Ешь, делись, не попадись' },
  night: { go: 'Начать ночь', line: 'Тысяча поколений за полминуты. Ставишь одну опасность' },
  sel: { lock: 'Пройди ночь рода — и сможешь растить свои породы' },
  rost: { go: 'Расти', line: 'Клетка не делится, а растёт. Чем крупнее, тем больше еды и тем меньше пастей' },
  evo: { go: 'Расти и меняйся', line: 'Растёшь без предела, на каждом росте новая способность' },
  mut: { go: 'Плыть с мутациями', line: 'При делении дочкам выпадают умения, которых нет в обычном заплыве. Выбирай, кем плыть дальше' }, // отметка Романа 11: «ну мутации и что?»
  golod: { go: 'Плыть в голод', line: 'Без еды клетка худеет и гибнет. Дочки учат копить запас и голодать дольше' },
  hunt: { lock: 'Погибни от красной запятой трижды — и сыграешь за неё' },
  deep: { lock: 'Доплыви до ила — и увидишь, что было в капле миллиард лет назад' },
  dry: { lock: 'Скоро: выжить, когда воды почти не осталось' },
};
let mSel = 'swim';
function menuOpen() {
  const mo = $('menu'); mo.classList.add('on');
  const shoot = () => { for (const i of mo.querySelectorAll('img[data-k]')) if (!i.src) try { i.src = snap(i.dataset.k, KAB.items[i.dataset.k]); } catch (_) {} };
  requestAnimationFrame(() => requestAnimationFrame(shoot)); // снимки живых моделей — когда сцена уже рисуется
  const nb = ROD.branches || 1, w10 = nb % 10, w100 = nb % 100; $('mstate').textContent = ROD.deaths ? 'род: ' + nb + ' ' + (w10 === 1 && w100 !== 11 ? 'ветка' : w10 >= 2 && w10 <= 4 && (w100 < 12 || w100 > 14) ? 'ветки' : 'веток') + (ROD.gens ? ' · ' + ROD.gens + ' поколений' : '') : 'капля пруда, 10 мкм'; // пустые счётчики не показываем
  const g = [...met].filter(k => k.startsWith('gene:')).length; // обитателей считает строка Альманаха ниже, второй счёт спорил с ней (прогон 0.74: «12 обитателей» рядом с «10 из 10»)
  const pl = (k, a, b, c) => k % 10 === 1 && k % 100 !== 11 ? a : k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 12 || k % 100 > 14) ? b : c;
  $('mknow').textContent = g ? 'Ты знаешь ' + g + ' ' + pl(g, 'ген', 'гена', 'генов') : '';
  $('mquiet').textContent = ROD.quiet ? 'Звук выкл' : 'Звук вкл'; $('mak').textContent = kab.label().replace(/^Альманах · /, '');
  const live = menuGo.back && !ended && world.me.length; $('mback').hidden = !live; // из паузы — путь назад в паузу
  $('mscene').scrollTop = 0; menuPick(live ? world.mode : 'swim', true); // каждый раз сверху, а не там, где долистали (О78) // обычный заплыв — одно касание
}
function menuPick(m, quiet) {
  const M = MODES[m];
  if (M.lock) { // закрытое отвечает у самого объекта и гаснет через 3 с; выбор и кнопку не трогает
    const o = $('mscene').querySelector(`.mo[data-m=${m}]`); for (const t of $('mscene').querySelectorAll('.mtip')) t.remove();
    const t = document.createElement('div'); t.className = 'mtip'; t.textContent = M.lock; o.appendChild(t); o.classList.add('peek'); { const sc = $('mscene').getBoundingClientRect(), r = t.getBoundingClientRect(), dx = r.right > sc.right - 6 ? sc.right - 6 - r.right : r.left < sc.left + 6 ? sc.left + 6 - r.left : 0; if (dx) { const x = t.offsetLeft + dx; Object.assign(t.style, { left: x + 'px', right: 'auto', transform: 'none' }); } } // подсказка целиком внутри экрана, в какой колонке ни стоит плитка (О119) // тронутое видно резко, даже когда выбран другой
    setTimeout(() => { t.style.opacity = 0; setTimeout(() => { t.remove(); if (!o.querySelector('.mtip')) o.classList.remove('peek'); }, 400); }, 3000); return;
  }
  $('mline').textContent = M.line;
  for (const o of $('mscene').querySelectorAll('.mo')) o.classList.toggle('sel', o.dataset.m === m);
  $('mscene').querySelector(`.mo[data-m=${m}]`)?.scrollIntoView({ block: 'nearest' }); // выбранный режим виден целиком, даже когда сцена ниже
  $('mscene').classList.toggle('picked', !quiet);
  mSel = m; const same = menuGo.back && !ended && world.me.length && m === world.mode; // тот же режим из паузы: «Продолжить» тот же заплыв, рядом «Новый заплыв» (О45)
  $('mgo').textContent = same ? 'Продолжить' : M.go; $('mgo').sure = false; $('mgo').classList.remove('sure'); $('mnew').hidden = !same; $('mnew').sure = false; $('mnew').classList.remove('sure'); $('mnew').textContent = 'Новый заплыв';
}
function menuGo() { if (mSel === 'night') { $('menu').classList.remove('on'); openNight(); } else if (menuGo.back && !ended && world.me.length && mSel === world.mode) { $('menu').classList.remove('on'); menuGo.back = false; } else { const g = $('mgo'); if (menuGo.back && !ended && world.me.length && !g.sure) { g.sure = true; g.classList.add('sure'); g.textContent = 'Бросить заплыв?'; return; } menuGo.back = false; start(null, mSel); } } // другой режим из паузы бросает идущий заплыв — только вторым касанием (прогон 0.81, О77) // из паузы: «Плыть» в том же режиме возвращает в тот же заплыв, другой режим — новый заплыв
for (const o of document.querySelectorAll('#mscene .mo')) { o.onclick = () => menuPick(o.dataset.m); o.ondblclick = () => { menuPick(o.dataset.m); if (!MODES[o.dataset.m].lock) menuGo(); }; }
$('mgo').onclick = menuGo;
$('mquiet').onclick = () => { ROD.quiet = !ROD.quiet; saveRod(); $('mquiet').textContent = ROD.quiet ? 'Звук выкл' : 'Звук вкл'; };
$('mnew').onclick = () => { const n = $('mnew'); if (!n.sure) { n.sure = true; n.classList.add('sure'); n.textContent = 'Точно заново?'; return; } menuGo.back = false; start(null, mSel); }; // второе касание, как в паузе: смахивание по режимам не бросает заплыв (прогон 0.76)
$('mback').onclick = () => { $('menu').classList.remove('on'); menuGo.back = false; genome.openScreen(); };
$('malm').onclick = () => kab.open('Режимы');

// «Ночь рода» (night.js; design/zaplyv_noch_roda_spec.md): после гибели род живёт 1000 поколений, игрок выбирает опасность, потом ветку.
let NT = null, ntT = 0, ntPick = null;
$('gmenu').onclick = () => { genome.close(); menuGo.back = true; menuOpen(); }; // путь в меню из паузы (L031)
$('tomenu').onclick = () => { $('end').classList.remove('on'); menuGo.back = false; menuOpen(); }; // режимы — только в меню: заплыв остаётся заплывом (Роман: «мы тестируем разные режимы»)
function openNight() { nightIcons(); NT = null; ntPick = null; $('night').classList.add('on'); $('ndanger').hidden = $('nask').hidden = false; $('npicks').innerHTML = ''; $('ngo').disabled = true; $('ngen').textContent = 'Ночь рода'; drawNight(); }
function nightIcons() { // значки опасностей — снимки самой опасности из той же студии, что Альманах (правило дизайнера)
  const im = $('ndanger').querySelectorAll('img'); if (im[0].src) return;
  [['phage', 'phage'], ['maw', 'amoeba'], ['hunger', 'me']].forEach(([d, k], i) => { try { im[i].src = snap(k, KAB.items[k]); } catch (e) { im[i].remove(); } });
}
$('nback').onclick = () => { $('night').classList.remove('on'); NT = null; $('end').classList.remove('on'); menuOpen(); }; // ночь — режим из меню: назад в меню
$('nflag').onclick = e => flag('ночь рода', e.currentTarget);
for (const b of $('ndanger').children) b.onclick = () => {
  NT = night({ genes: ROD.genes || [], n: ROD.most || 1 }, b.dataset.d, ROD.seed || 1, NJ, mut.base(cfg)); NT.danger = b.dataset.d; // род — последний заплыв (из памяти: ночь зовут и из меню)
  ntT = 0; $('ndanger').hidden = $('nask').hidden = true;
};
$('ngo').onclick = () => { if (ntPick) start(ntPick.genes); };
function nightFrame(dt) {
  if (NT && !NT.done) { ntT += dt; const want = Math.min(NJ.gens, Math.ceil(ntT / NJ.seconds * NJ.gens)); while (NT.gen < want) NT.step(); }
  if (NT && NT.done && !NT.res) nightEnd();
  if (NT) $('ngen').textContent = 'Поколение ' + NT.gen + ' из ' + NJ.gens;
  drawNight();
}
function nightEnd() {
  const res = NT.result(), box = $('npicks'); NT.res = res; box.innerHTML = '';
  ROD.branches = (ROD.branches || 0) + NT.branches.length; ROD.gens = (ROD.gens || 0) + NT.gen; saveRod();
  res.picks.forEach((q, k) => {
    const b = document.createElement('button'), i = document.createElement('i'); b.className = 'ghost'; i.style.background = q.color; b.appendChild(i);
    const t = document.createElement('span'), role = q.id === res.best ? 'Выше всех' : q.id === 0 ? 'Твой род' : 'Больше всех', nb = NJ.bands.length - 1;
    t.textContent = role + ' — ' + (q.band ? 'прошла ' + q.band + ' ' + (q.band === 1 ? 'полосу' : 'полосы') + ' из ' + nb : 'не прошла ни одной полосы');
    const sm = document.createElement('small'); sm.textContent = 'Гены: ' + (q.genes.map(geneName).join(', ') || 'нет') + ' · отличий от предка ' + q.diff + ' · клеток ' + q.alive; t.appendChild(sm); b.appendChild(t);
    b.onclick = () => { ntPick = q; for (const x of box.children) x.classList.toggle('on', x === b); $('ngo').disabled = false; };
    box.appendChild(b);
  });
}
function drawNight() {
  const cv = $('ncv'), r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (!r.width || !r.height) return; // как у главного холста: не больше 2
  if (cv.width !== Math.round(r.width * d) || cv.height !== Math.round(r.height * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
  const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, r.width, r.height);
  const C = NT ? NT.cols : NJ.cols, R = NJ.rows, s = Math.min(r.width / C, r.height / R), w = s * C, h = s * R, ox = (r.width - w) / 2, oy = (r.height - h) / 2, nb = NJ.bands.length;
  const bandsOver = () => { for (let k = 1; k < nb; k++) { const y0 = oy + h - (k + 1) * h / nb; // полосы опасности поверх колоний: гуще кверху, тонкая линия на границе
    x.fillStyle = `rgba(255,120,90,${0.06 + NJ.bands[k] * 0.16})`; x.fillRect(ox, y0, w, h / nb); x.fillStyle = 'rgba(255,170,140,0.6)'; x.fillRect(ox, y0 + h / nb - 0.75, w, 1.5); } };
  x.fillStyle = '#071a22'; x.fillRect(ox, oy, w, h);
  if (NT) {
    const d2 = d, oc = drawNight.oc || (drawNight.oc = document.createElement('canvas')), ow = Math.round(r.width * d2), oh = Math.round(r.height * d2);
    if (oc.width !== ow || oc.height !== oh) { oc.width = ow; oc.height = oh; } // холст заводим один раз, а не каждый кадр: WebKit не успевал убирать старые и вкладка падала (урок L036)
    const o = oc.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, ow, oh); o.globalAlpha = 1; o.setTransform(d2, 0, 0, d2, 0, 0); const best = NT.res ? NT.res.best : -1;
    if (best >= 0) { o.fillStyle = '#fff'; o.globalAlpha = 0.9; for (let i = 0; i < NT.grid.length; i++) if (NT.grid[i] === best) { const cx = i % C, cy = (i / C) | 0; // ветка, дошедшая выше всех, обведена светлой каймой (после размытия)
      o.beginPath(); o.arc(ox + (cx + 0.5) * s, oy + h - (cy + 0.5) * s, s * 1.05, 0, 6.283); o.fill(); } }
    for (let i = 0; i < NT.grid.length; i++) { const v = NT.grid[i]; if (v < 0) continue; const cx = i % C, cy = (i / C) | 0, hsh = Math.sin(i * 12.9898) * 43758.5 % 1, j2 = Math.sin(i * 78.233) * 43758.5 % 1; // клетка — мягкое пятно, внахлёст, разного размера
      o.globalAlpha = best < 0 || v === best ? 1 : 0.4; o.fillStyle = NT.branches[v].color; o.beginPath(); o.arc(ox + (cx + 0.5 + hsh * 0.25) * s, oy + h - (cy + 0.5 + j2 * 0.25) * s, s * (0.62 + 0.18 * Math.abs(hsh)), 0, 6.283); o.fill(); }
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.filter = `blur(${1.7 * d}px)`; x.drawImage(oc, 0, 0); x.filter = 'none'; x.restore();
  }
  bandsOver(); x.strokeStyle = 'rgba(207,227,230,0.25)'; x.lineWidth = 1; x.strokeRect(ox, oy, w, h);
}
window.zaplyvNight = () => NT; // для обхода касаниями

// Альманах (almanah.js): полка с разделами, страница по касанию; картинки — снимки живых моделей из игры. Память встреч — в этом браузере.
let met = new Set(['me']);
try { for (const k of JSON.parse(localStorage.getItem('zaplyv.met') || '[]')) met.add(k); } catch (_) {}
const saveMet = () => { try { localStorage.setItem('zaplyv.met', JSON.stringify([...met])); } catch (_) {} };
const KAB = await (await fetch('almanah.json')).json();
const GENY = await fetch('kniga/teksty_genov.json').then(r => r.ok ? r.json() : {}).catch(() => ({})); // гены: имена и тексты книги
mut.addGenes(cfg); mut.names(cfg, GENY); // новые мутации: имена из книги
for (const [id, t] of [...Object.entries(KAP.upravlenie.teksty || {}), ...Object.entries(KAP.boj.teksty || {}), ...Object.entries(KAP.navyki.teksty || {})]) if (id !== '_') { GENY.geny ||= {}; GENY.geny[id] = { ...(GENY.geny[id] || {}), ...t }; }; for (const g of KAP.boj.novye_geny || []) if (!evo.E.svoi.includes(g)) evo.E.svoi.push(g); nv.recepty(evo.E, KAP.navyki); /* П41: ты то, что ты ешь */ /* Ш25: «Шип» и другое новое оружие приходит карточкой только в «Капле» */ /* Ш1: «Нюх» в «Капле» не обещает плыть к еде сам */
const SVYAZI = await fetch('kniga/kto_s_kem.json').then(r => r.ok ? r.json() : {}).catch(() => ({})); // кто кого ест — связи карточек Альманаха
const KNIGA = await fetch('kniga/teksty_sushchestv.json').then(r => r.ok ? r.json() : {}).catch(() => ({})), TEKSTY = KNIGA.sushchestva || {}, PODPISI = KNIGA.podpisi || {}; // тексты книги
// Снимок модели: на миг подменяем мир студией с одним существом в середине кадра, рисуем тем же paint и вырезаем середину.
const SVR_CELI = () => Object.entries(KAP.boj.celi).filter(([k]) => k !== '_').map(([k, C]) => [k, C.spisok]);
const LISTS = { me: 'me', phage: 'phages', bdello: 'bdellos', amoeba: 'amoebas', slipper: 'slippers', bell: 'bells', roti: 'rotis',
  pseudo: 'pseudos', strain: 'pseudos', donor: 'donors', coccus: 'prey', plant: 'plants', crumb: 'crumbs' };
for (const k of dv.zhivut()) LISTS[k] = 'pseudos'; dv.vitrina(KAB, cards, TEKSTY); // виды из анкет: снимок и карточка собираются сами
function studio(k, it) {
  const w = new World(cfg, 7), a = it.a, id = 9001;
  if (it.gene) { w.genes = { [it.gene]: true }; k = 'me'; } // ген — твоя клетка с этим геном: видно, что он меняет на теле
  for (const l of new Set([...Object.values(LISTS), 'food', 'slime', 'away'])) w[l] = [];
  const e = { x: 0, y: 0, vx: 0, vy: 0, a, d: a, dir: a, m: k === 'amoeba' ? 5 : k === 'plant' ? 4 : k === 'crumb' ? 3 : k === 'coccus' ? 1 : 1.1, id,
    sick: -1, gen: 0, t: 0, cool: 0, held: 0, shut: 0, sit: true, link: 0, host: null, strain: k === 'strain', vid: dv.V.vidy[k] ? k : undefined };
  if (k === 'bell') { e.x = -Math.cos(a) * cfg.bell_stalk / 2; e.y = -Math.sin(a) * cfg.bell_stalk / 2; }
  if (k === 'amoeba') e.vx = 20; // ползёт: видна ложноножка
  if (k === 'coccus') e.id = 9004; // гроздь: самая узнаваемая форма кокков
  w[LISTS[k]].push(e);
  return w;
}
// Снимки (Альманах, значки, меню) считаются в двойной плотности, как раньше: в тройной полка открывалась вдвое дольше.
// Плотность кадра возвращается перед следующим кадром игры, так что подряд идущие снимки делят одну перестройку холста.
let shotLow = false;
function shotDensity() {
  if (shotLow || gl.getPixelRatio() <= 2) return; shotLow = true; gl.setPixelRatio(2); resize();
  requestAnimationFrame(() => { shotLow = false; gl.setPixelRatio(dprNow); resize(); });
}
// Мигание (Роман 26.11: «Почему экран мигает?»): снимок для Альманаха и значков рисуется на том же холсте, что игра. Если снимок делался не внутри
// кадра игры (по таймеру, при встрече существа, при открытии карточки), телефон успевал показать студию с одним существом вместо мира: вспышка на кадр.
// Теперь после каждого снимка мир сразу перерисовывается, и на экран уходит игра.
let vKadre = false, igraT = null;
function posleSnimka() { if (vKadre || igraT == null) return; if (shotLow) { shotLow = false; gl.setPixelRatio(dprNow); resize(); } vKadre = true; try { render(igraT); } finally { vKadre = false; } }
function snap(k, it) { const r = snap0(k, it); posleSnimka(); return r; }
window.kaplyaSnimok = (k, bez) => (bez ? snap0 : snap)(k, KAB.items[k]); // для сторожа мигания (test_miganie.cjs): bez — снимок без защиты, сторож обязан его поймать
function snap0(k, it) {
  shotDensity();
  if (it.gene) return geneShot(it.gene, 480, 300); // ген в Альманахе — тот же снимок, что значок: часть, которую он даёт, подсвечена
  const fxs = fx.save(), keep = [world, view, kids, down, moved, puffs, paint.t]; // все анимации эффектов целиком (fx.save), а не только кольца и разряды
  const out = document.createElement('canvas'); out.width = 480; out.height = 300;
  try {
    world = studio(k, it); kids = null; down = null; moved = true; fx.reset(); puffs = [];
    const side = Math.min(W, H) * 0.9;
    view = { x: 0, y: 0, z: side * 0.62 / it.span, tint: [...TINT[0]] };
    for (let i = 0; i < 4; i++) render(30 + i / 30); // пара кадров: тело и жгутики встают на место
    const sx = canvas.width / W, cw = side * sx, ch = cw * 300 / 480;
    out.getContext('2d').drawImage(canvas, (canvas.width - cw) / 2, (canvas.height - ch) / 2, cw, ch, 0, 0, 480, 300);
  } finally { [world, view, kids, down, moved, puffs, paint.t] = keep; fx.load(fxs); }
  return out.toDataURL('image/jpeg', 0.86);
}
// Кадр студии: твоя клетка массы m с генами genes, время стоит — два кадра с разными генами отличаются только геном.
function studioKadr(genes, NW, NH, m) {
  const fxs = fx.save(), keep = [world, view, kids, down, moved, puffs, paint.t], c = document.createElement('canvas'); c.width = NW; c.height = NH;
  try {
    world = studio('me', { a: -0.5 }); world.genes = genes; if (m) world.me[0].m = m; kids = null; down = null; moved = true; fx.reset(); puffs = [];
    const side = Math.min(W, H) * 0.9; view = { x: 0, y: 0, z: side * 0.62 / cfg.icon_span, tint: [...TINT[0]] };
    for (let i = 0; i < 4; i++) { paint.t = 30; render(30); } // время стоит: оба снимка в одной позе, разница — только ген
    const sx = canvas.width / W, cw = side * sx * 0.62 * Math.max(1, NW / NH), ch = cw * NH / NW;
    c.getContext('2d').drawImage(canvas, (canvas.width - cw) / 2, (canvas.height - ch) / 2, cw, ch, 0, 0, NW, NH);
  } finally { [world, view, kids, down, moved, puffs, paint.t] = keep; fx.load(fxs); }
  return c.getContext('2d').getImageData(0, 0, NW, NH);
}
// Ворота «выданное видно на теле» (kolonia_eda_boy.md 13.4 Б4, сторож test_vorota_vidno.cjs): какие гены игра может выдать (карточки, мутации стаи, новое оружие)
// и какая доля кадра студии меняется, когда ген у твоей клетки. Ген без части на теле даёт ноль.
window.kaplyaVorota = { geny: () => [...new Set([...Object.keys(cfg.genes), ...evo.E.svoi, ...Object.values(KAP.mutaciya.spisok).map(x => x.gene)])].filter(g => !evo.E.bez.includes(g)),
  raznica: (g, m) => { shotDensity(); const A = studioKadr({}, 240, 150, m).data, B = studioKadr({ [g]: true }, 240, 150, m).data; let n = 0;
    for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 60) n++; posleSnimka(); return n / (A.length / 4); } };
// Значок гена (макет дизайнера: круг, тело приглушено, часть, которую даёт ген, подсвечена). Снимаем клетку без гена и с геном
// той же студией, что Альманах, и оставляем ярким только то, что изменилось: сам ген на теле. Кеш — снимаем один раз.
const icons = new Map();
function geneShot(g, NW, NH, crop = 0) { const r = geneShot0(g, NW, NH, crop); posleSnimka(); return r; }
function geneShot0(g, NW, NH, crop = 0) {
  shotDensity();
  const grab = genes => studioKadr(genes, NW, NH);
  const A = grab({}), B = grab({ [g]: true }), a = A.data, b = B.data;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.min(1, (Math.abs(b[i] - a[i]) + Math.abs(b[i + 1] - a[i + 1]) + Math.abs(b[i + 2] - a[i + 2])) / 90);
    for (let j = 0; j < 3; j++) b[i + j] = a[i + j] * cfg.icon_dim * (1 - d) + Math.min(255, b[i + j] * 1.25) * d;
  }
  const c = document.createElement('canvas'); c.width = NW; c.height = NH; c.getContext('2d').putImageData(B, 0, 0);
  if (!crop) return c.toDataURL('image/jpeg', 0.85);
  // Значок кадрируется по подсвеченной части: она занимает не меньше половины кружка, тело лишь краем (дизайнер, Э16).
  const D = new Float32Array(NW * NH); let x0 = NW, y0 = NH, x1 = -1, y1 = -1;
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) { const i = (y * NW + x) * 4, v = Math.abs(b[i] - a[i] * cfg.icon_dim) + Math.abs(b[i + 1] - a[i + 1] * cfg.icon_dim) + Math.abs(b[i + 2] - a[i + 2] * cfg.icon_dim);
    if (v > 150) { D[y * NW + x] = 1; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
  const S = x1 < 0 ? NW : Math.max(NW * 0.3, Math.min(NW * 0.5, Math.max(x1 - x0, y1 - y0) * 1.5)); // окно: часть крупно, тело краем
  let best = -1, cx = NW / 2, cy = NH / 2; // окно ставим туда, где подсвеченного больше всего
  if (x1 >= 0) for (let y = 0; y + S <= NH; y += 8) for (let x = 0; x + S <= NW; x += 8) { let n = 0; for (let v = y; v < y + S; v += 4) for (let u = x; u < x + S; u += 4) n += D[(v | 0) * NW + (u | 0)];
    if (n > best) { best = n; cx = x + S / 2; cy = y + S / 2; } }
  const o = document.createElement('canvas'); o.width = o.height = crop;
  o.getContext('2d').drawImage(c, Math.max(0, Math.min(NW - S, cx - S / 2)), Math.max(0, Math.min(NH - S, cy - S / 2)), S, S, 0, 0, crop, crop);
  return o.toDataURL('image/jpeg', 0.85);
}
const geneColor = g => { for (const a of genomeData.arcs) if (a.slots.some(x => x.id === g)) return a.color; const p = genomeData.plasmids.find(x => x.id === g); return p ? p.color : '#7cc8ff'; }; // рамка значка — цвет группы гена
function icon(g) {
  { const k = (KAP.karta.kartinki || {})[g]; if (k && g !== '_') return 'kaplya/karty/' + k + '.png'; } /* Роман 21:43: картинка из конструктора */
  if (!icons.has(g)) { let url = ''; try { url = geneShot(g, 320, 320, 128); } catch (e) { url = ""; console.error("icon " + g + ": " + e.message); } icons.set(g, url); }
  return icons.get(g);
}
const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 300));
setTimeout(function warm(i = 0) { const g = Object.keys(cfg.genes)[i]; if (!g) return; idle(() => { if (!paused && !ended) icon(g); setTimeout(() => warm(i + 1), 400); }); }, 6000); // значки заранее, по одному в свободную минуту: без рывка при первом гене и под пальцем
const geneBook = g => Object.values(GENY.geny || {}).find(q => q.klyuch === g) || Object.values(GENY.geny || {}).find(q => q.plan === g) || {}, /* plan — умение ещё строится (скрытый режим «Эволюция») */ geneName = g => geneBook(g).imya || g; // имя и тексты гена — только из книги
genomeData.book = GENY.geny || {};
GENY.gruppa = Object.fromEntries([...genomeData.arcs.flatMap(a => a.slots.map(x => [x.id, a.name])), ...genomeData.plasmids.map(x => [x.id, 'Чужие'])].filter(x => x[0])); // группа гена — дуга кольца
const kab = almanahScreen({ K: KAB, cards, T: TEKSTY, P: PODPISI, G: GENY, S: SVYAZI, met, snap, onNav: () => { if (curTab === 'alm') $('gback').textContent = '‹ ' + (kab.where() || 'Пауза'); }, onSwim: () => { if (ended || $('menu').classList.contains('on')) start(); else if (paused) genome.close(); } });
const cabLabel = () => { $('cab').textContent = kab.label(); };
cabLabel();
const knowGenes = () => { let add = false; for (const g in world.genes) if (!met.has('gene:' + g)) { met.add('gene:' + g); add = true; } if (add) { saveMet(); cabLabel(); } }; // ген, который у тебя был, — запись в Альманахе
$('cab').onclick = () => { knowGenes(); kab.open(); const kk = world.stats.killer; if (ended && kk && KAB.items[kk] && kk !== 'me') { met.add(kk); kab.openCard(kk); } }; // с гибели — сразу карточка того, кто съел; «‹ Альманах» внизу ведёт на полку
let EDR = edr.sozdat(), ZHV = zhv.sozdat(), GLC = glc.sozdat(), TRP_S = 0, MST = mst.sozdat(), KUS = kus.sozdat(), SOB = sob.sozdat(), SVR = svr.sozdat(), ZON = zn.sozdat(), MUT = mtc.sozdat(), STY = sty.sozdat(), RSV = rsv.sozdat(), VEL = krm.sozdat(), KRM = krm.sozdat(), SVI = svi.sozdat(), PTL = ptl.sozdat(), NAV = {}, toastT = 0, OCHERED = [], pokazT = 0; // очередь строк (П11)
// Пауза с геномом: мир замирает, твоя клетка крупно в середине кольца ДНК.
let paused = false; let ROST_CEL = null;
const genome = genomeScreen({ G: genomeData, cfg, world: () => world, icon: g => icon(g),
  onOpen: () => { paused = true; document.body.classList.add('paused'); pad.end(0); down = null; finger = null; openTab(); },
  onClose: () => { paused = false; document.body.classList.remove('paused'); leaveTabs(); },
  onSend: () => openMarks(), onDraw: () => { showMarks(); if (!window.kaplyaStaryeChisla) { const c = $('gchips').firstElementChild; if (c) c.textContent = `генов включено ${Object.keys(world.genes).filter(g => world.genes[g]).length}`; $('gsub').textContent = `поколение ${rodChisla(world).gen} · кишечная палочка`; } } }); /* L099: «Геном» говорит те же числа, что пауза (L084) */

// Пауза — игровое меню (урок L037): уровень 1 «Пауза» (tab 'hub'): «Продолжить», «Новый заплыв», «Режимы», справочник строками.
// Уровень 2 — раздел (Геном, Альманах, Карта): заголовок раздела, внизу «‹ Пауза» и «Продолжить». Пауза всегда открывается первым уровнем.
let KARTA = { seen: [], marks: [] };
try { KARTA = { ...KARTA, ...JSON.parse(localStorage.getItem('zaplyv.karta') || '{}') }; } catch (_) {}
const saveKarta = () => { try { localStorage.setItem('zaplyv.karta', JSON.stringify(KARTA)); } catch (_) {} };
const keepSeen = () => { const all = new Set([...KARTA.seen, ...world.seen]); KARTA.seen = [...all]; saveKarta(); }; // туман помнит все заплывы: слои пруда постоянны (К2)
const addMark = m => { KARTA.marks.push({ ...m, run: world.seed }); KARTA.marks = KARTA.marks.slice(-60); saveKarta(); };
let curTab = null, mapT = 0, mapHit = null, mapOpenedAt = 0;
const mapIcons = {};
const iconOf = who => { if (!mapIcons[who]) { const im = new Image(); im.src = who.startsWith('gene:') ? icon(who.slice(5)) : KAB.items[who] ? snap(who, KAB.items[who]) : ''; mapIcons[who] = im; } return mapIcons[who]; };
const PNAME = { hub: 'Пауза', genome: 'Геном', map: 'Карта', alm: 'Альманах', staya: 'Стая' };
function tab(t) {
  curTab = t; const G = $('genome'), C = $('cabinet');
  for (const k in PNAME) G.classList.toggle('tab-' + k, t === k);
  $('gtitle').textContent = PNAME[t]; $('map').hidden = t !== 'map'; $('mcard').hidden = true; $('stlist').hidden = t !== 'staya'; if (t === 'staya') stayaFill();
  if (t === 'hub') hubFill();
  $('gback').textContent = '‹ Пауза';
  if (t === 'alm') { knowGenes(); kab.open('Пауза'); kab.back = () => tab('hub'); C.classList.add('inpause'); const top = $('ghead').getBoundingClientRect().bottom + 6, bot = innerHeight - $('gbar').getBoundingClientRect().top + 8;
    C.style.top = top + 'px'; C.style.bottom = bot + 'px'; } else if (C.classList.contains('inpause')) { kab.close(); kab.back = null; C.classList.remove('inpause'); C.style.top = C.style.bottom = ''; }
  if (t === 'map') { keepSeen(); mapOpenedAt = performance.now(); }
}
function stayaFill() { // Ш36: пауза «Стая» — все клетки стаи, у каждой снимок, метка мутации и сколько ей отрастать
  const L = $('stlist'), M = KAP.mutaciya, S = M.slova, A = world.me[0], st = world.staya || []; L.innerHTML = ''; if (!st.length) { L.appendChild(Object.assign(document.createElement('p'), { textContent: S.pusto })); return; }
  const src = snap('me', KAB.items.me); st.forEach((q, i) => { const r = document.createElement('div'); r.className = 'st'; r.dataset.id = q.id; r.dataset.mut = q.mut || '';
    const im = new Image(); im.src = src; im.style.transform = `scale(${Math.max(0.6, Math.min(1.3, 0.5 + Math.sqrt(q.m / ((A && A.m) || q.m))))})`; r.appendChild(im); /* крупнее — больше снимок */
    if (q.mut) { const dot = document.createElement('i'); dot.style.background = `rgb(${M.spisok[q.mut].cvet.map(c => Math.round(c * 255))})`; r.appendChild(dot); }
    const sp = document.createElement('span'), dm = A ? (q.m / A.m).toFixed(2).replace('.', ',') : '—', mt = q.mut ? (q.mt >= M.otrast ? S.gotova.replace('{}', M.spisok[q.mut].imya) : S.rastet.replace('{}', M.spisok[q.mut].imya).replace('{s}', Math.ceil(M.otrast - q.mt))) : S.bez;
    sp.textContent = S.stroka.replace('{n}', i + 1).replace('{m}', dm) + ' · ' + mt; r.appendChild(sp); L.appendChild(r); }); }
const imyaKto = who => { const n = (KAP.cel.imena[who] || [])[0] || 'Хищник'; return n[0].toUpperCase() + n.slice(1); }; const KOL = kol.sozdat(); let KOLD = null, KOLM = [], KOLQ = []; // Е.3 п. 9–12: держишь палец на себе — колесо стаи; отпустил на копии — перелив
function kolesoOtkryt() { const KO = KAP.koleso, S = KO.slova, M = KAP.mutaciya, el = $('koleso'), a = world.me[0]; if (!a) return; KOL.otkryto = true;
  const [sx, sy] = scr(a.x, a.y), r = Math.min(innerWidth, innerHeight) * KO.radius, cx = Math.max(r + 40, Math.min(innerWidth - r - 40, sx * innerWidth / W)), cy = Math.max(r + 60, Math.min(innerHeight - r - 90, sy * innerWidth / W));
  KOLQ = (world.staya || []).slice(0, KAP.staya.max); KOLM = kol.mesta(KOLQ.length, cx, cy, r); for (const e of el.querySelectorAll('.kk')) e.remove(); const src = snap('me', KAB.items.me);
  KOLQ.forEach((q, i) => { const d = document.createElement('div'); d.className = 'kk' + (q.mut ? ' mut' : ''); d.style.left = KOLM[i][0] + 'px'; d.style.top = KOLM[i][1] + 'px'; d.dataset.id = q.id;
    const im = new Image(); im.src = src; if (q.mut) im.style.borderColor = `rgb(${M.spisok[q.mut].cvet.map(c => Math.round(c * 255))})`; const sp = document.createElement('span');
    sp.textContent = q.mut ? M.spisok[q.mut].imya : S.bez; sp.appendChild(document.createElement('b')).textContent = S.temp.replace('{}', Math.round(q.T ?? KAP.staya.T_max)); d.append(im, sp); el.appendChild(d); });
  el.style.setProperty('--cx', cx + 'px'); el.style.setProperty('--cy', cy + 'px'); $('kstroka').textContent = KOLQ.some(q => q.mut) ? S.otmena : S.pusto; el.classList.add('on'); }
function kolesoPod(x, y) { const KO = KAP.koleso, S = KO.slova, M = KAP.mutaciya, i = kol.podPaltsem(KOLM, x, y, KO.lovit); [...$('koleso').querySelectorAll('.kk')].forEach((d, j) => d.classList.toggle('pod', j === i));
  if (i < 0) { $('kstroka').textContent = KOLQ.some(q => q.mut) ? S.otmena : S.pusto; return -1; } const q = KOLQ[i], t = String(KO.pereliv).replace('.', ','), g = q.mut && M.spisok[q.mut].gene;
  $('kstroka').textContent = q.mut ? S.daet.replace('{imya}', M.spisok[q.mut].imya).replace('{daet}', mut.daet(world, g, geneBook(g)).replace(/\.+$/, '')).replace('{t}', t) : S.daet_bez.replace('{T}', Math.round(q.T ?? KAP.staya.T_max)).replace('{t}', t); return i; }
const kolesoZakryt = () => { KOL.otkryto = false; $('koleso').classList.remove('on'); };
window.kaplyaKoleso = () => { const a = world.me[0], [x, y] = a ? scr(a.x, a.y) : [0, 0]; return { otkryto: KOL.otkryto, most: !!KOL.most, mesta: KOLM, id: KOLQ.map(q => q.id), ya: [x * innerWidth / W, y * innerWidth / W], stroka: $('kstroka').textContent }; };
window.kaplyaMut = () => MUT; window.kaplyaSprosit = V => vybor(V, () => {}); /* сторож флажка: окно вопроса (вопрос мутации ушёл в колесо стаи) */ window.kaplyaStayaMenu = () => [...$('stlist').querySelectorAll('.st')].map(r => ({ id: +r.dataset.id, mut: r.dataset.mut || null }));
// L084 (пачка 2, Т3): одни числа рода во всех экранах — поколение по летописи стаи, клеток — ты и стая
const rodChisla = w => { if (window.kaplyaStaryeChisla) return { gen: w.stats.gen, kletok: w.me.length }; const L = STY && STY.letopis; return { gen: Math.max(w.stats.gen || 0, (L && L.pok) || 0), kletok: w.me.length + (w.staya || []).length }; }; window.kaplyaRodChisla = () => rodChisla(world);
function hubFill() { // первый уровень паузы: что в каждом разделе — одной строкой, служебное — мелко
  const own = genomeData.arcs.flatMap(a => a.slots), deaths = KARTA.marks.filter(m => m.kind === 'death').length;
  const RC = rodChisla(world); $('pstate').textContent = ($(`mscene`).querySelector(`.mo[data-m=${world.mode}] b`)?.textContent || 'Заплыв') + ' · поколение ' + RC.gen + ' · клеток ' + RC.kletok; /* L084: те же числа, что в «Стае» и на экране гибели */
  $('pg').textContent = window.kaplyaStaryeChisla ? `включено ${own.filter(x => x.id && world.genes[x.id]).length} из ${own.length}` : `генов включено ${Object.keys(world.genes).filter(g => world.genes[g]).length}`; /* L084: «0 из 21» при включённом «Глотать» — гены «Капли» не в круге генома */
  $('pa').textContent = kab.label().replace(/^Альманах · /, ''); { const st = world.staya || []; $('pst').textContent = st.length ? `копий ${st.length} · мутанток ${st.filter(q => q.mut).length}` : 'пока никого'; }
  keepSeen(); $('pm').textContent = karta.count(cfg.pond, new Set(KARTA.seen)).replace(/^Ты в/, 'В') + (deaths ? ` · гибелей ${deaths}` : '');
  $('psound').textContent = ROD.quiet ? 'Звук выключен' : 'Звук включён';
  const n = $('pnew'); n.sure = false; n.classList.remove('sure'); n.textContent = 'Новый заплыв';
}
// Значки строк паузы — живые снимки разделов (Роман 25.11: «значок генома можно найти красивый»): твоё кольцо ДНК со включёнными генами
// вокруг твоей клетки, последний встреченный в Альманахе, разрез пруда с отметками. Меняются вместе с игрой.
function hubIcons() {
  const [gi, ai, mi, si] = $('phub').querySelectorAll('.pico'), S = 104, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  const own = genomeData.arcs.flatMap(a => a.slots.map(sl => [sl, a.color])), step = Math.PI * 2 / own.length, me = new Image();
  me.onload = () => { x.fillStyle = '#061018'; x.fillRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(S / 2, S / 2, 31, 0, 7); x.clip(); x.drawImage(me, S / 2 - 46, S / 2 - 46, 92, 92); x.restore();
    x.lineWidth = 11; own.forEach(([sl, c], i) => { const on = sl.id && world.genes[sl.id]; x.strokeStyle = c; x.globalAlpha = on ? 1 : 0.22; x.beginPath(); x.arc(S / 2, S / 2, 42, -Math.PI / 2 + i * step + 0.05, -Math.PI / 2 + (i + 1) * step - 0.05); x.stroke(); });
    x.globalAlpha = 1; gi.src = cv.toDataURL(); };
  me.src = snap('me', KAB.items.me); if (si) si.src = me.src; // Ш36: у «Стаи» — твой же снимок
  const last = [...met].reverse().find(k => KAB.items[k] && k !== 'me') || 'me'; ai.src = snap(last, KAB.items[last]);
  const mc = document.createElement('canvas'); mc.width = mc.height = 320; karta.draw(mc.getContext('2d'), 320, 320, { P: cfg.pond, seen: new Set(KARTA.seen), marks: KARTA.marks, icons: {}, me: null, t: 9, hot: -1 }); mi.src = mc.toDataURL();
}
function openTab() { tab('hub'); try { hubIcons(); } catch (e) {} }
function leaveTabs() { const C = $('cabinet'); if (C.classList.contains('inpause')) { kab.close(); kab.back = null; C.classList.remove('inpause'); C.style.top = C.style.bottom = ''; } curTab = null; }
for (const b of $('phub').querySelectorAll('.prow')) b.onclick = () => tab(b.dataset.t);
$('gback').onclick = () => { if (curTab === 'alm' && kab.where()) kab.goBack(); else tab('hub'); }; // в Альманахе «назад» идёт по шагам: карточка → прошлая карточка → полка → пауза
$('psound').onclick = () => { ROD.quiet = !ROD.quiet; saveRod(); hubFill(); };
$('pnew').onclick = () => { const n = $('pnew'); if (!n.sure) { n.sure = true; n.classList.add('sure'); n.textContent = 'Точно заново?'; return; } genome.close(); if (!window.kaplyaStaryjNovyj && world.me.length && !ended) { world.stats.sam = true; world.stats.killer = null; world.me.length = 0; if (world.staya) world.staya.length = 0; return; } /* L110: сначала итог заплыва, «Плыть снова» — с него */ start(null, world.mode); }; // второе касание: текущий заплыв пропадёт
{ let sx = null; // смахивание от левого края вправо — назад на «Паузу», как в приложениях iPhone
  $('genome').addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX < 28 ? [t.clientX, t.clientY] : null; }, { passive: true });
  $('genome').addEventListener('touchend', e => { if (!sx) return; const t = e.changedTouches[0]; if (t.clientX - sx[0] > 70 && Math.abs(t.clientY - sx[1]) < 60 && curTab !== 'hub') tab('hub'); sx = null; }, { passive: true }); }
// Метка-цель в заплыве: тонкая стрелка у края экрана в её сторону и расстояние; доплыл — гаснет сама.
window.zaplyvKarta = { data: () => KARTA, hits: () => mapHit }; // для обхода касаниями (tools/web/zaplyv_tap.mjs)
// Сторона, где существо, словами (без стрелок поверх мира): «справа вверху»
const storona = (a, q) => KAP.cel.storony[(Math.round(Math.atan2(q.y - a.y, q.x - a.x) / (Math.PI / 4)) + 8) % 8];
function goalArrow() {
  const el = $('goal'), G = KARTA.goal;
  if (!G || paused || ended || !world.me.length) { el.hidden = true; return; }
  const c = world.center(), d = Math.hypot(G.x - c.x, G.y - c.y);
  if (d < 260) { fx.ring(G.x, G.y, 0, 160); delete KARTA.goal; saveKarta(); el.hidden = true; return; }
  const a = Math.atan2(G.y - c.y, G.x - c.x), R = Math.min(innerWidth, innerHeight) * 0.42;
  el.hidden = false; el.style.transform = `translate(${innerWidth / 2 + Math.cos(a) * R}px, ${innerHeight / 2 + Math.sin(a) * R}px)`;
  el.firstChild.style.transform = `rotate(${a}rad)`; el.lastChild.textContent = '≈' + (d / 26 / 1000).toFixed(1).replace('.', ',') + ' мм';
}
function drawMap() {
  const cv = $('mcv'), box = $('mbox').getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(box.width * dpr) || cv.height !== Math.round(box.height * dpr)) { cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const all = new Set([...KARTA.seen, ...world.seen]), last = KARTA.marks.length - 1, c = world.center(), t = (performance.now() - mapOpenedAt) / 1000;
  const icons = {}; for (const m of KARTA.marks) icons[m.who] = iconOf(m.who);
  const me = world.me.length ? c : null; if (!mapIcons.me) mapIcons.me = Object.assign(new Image(), { src: snap('me', KAB.items.me) });
  const R = karta.draw(ctx, box.width, box.height, { P: cfg.pond, seen: all, marks: KARTA.marks, goal: KARTA.goal, me, icons, meImg: mapIcons.me, t, hot: t < 1.2 && last >= 0 ? karta.clusters(KARTA.marks, cfg.pond, karta.frame(cfg.pond, box.width, box.height)).findIndex(q => q.list.includes(KARTA.marks[last])) : -1 });
  mapHit = R.C;
  $('mhead').textContent = (me ? 'Ты в слое «' + { film: 'плёнка', light: 'светлая толща', oxy: 'граница кислорода', silt: 'ил' }[world.layer(c.y)] + '» · ' : '') + karta.count(cfg.pond, all);
}
$('mcv').addEventListener('click', e => { // касание отметки — карточка места
  const r = $('mcv').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, card = $('mcard');
  const c = (mapHit || []).find(q => Math.hypot(q.x - x, q.y - y) < 22);
  if (!c) { card.hidden = true; return; }
  const m = c.list[c.list.length - 1], gene = m.who.startsWith('gene:'), t = gene ? null : TEKSTY[m.who] || {};
  const g = gene ? Object.values(GENY.geny).find(q => q.klyuch === m.who.slice(5)) : null;
  card.innerHTML = ''; card.style.borderColor = gene ? 'rgba(90,230,150,0.5)' : '';
  const im = new Image(); im.src = iconOf(m.who).src; im.alt = ''; card.appendChild(im);
  const h = document.createElement('h3'); h.textContent = gene ? (g ? g.imya : m.who) : (t.imya || m.who); card.appendChild(h);
  const p1 = document.createElement('p'); p1.textContent = gene ? 'Здесь ты нашёл чужой ген' + (c.list.length > 1 ? ' · ' + c.list.length + ' раза' : '') : 'Здесь ты погиб' + (c.list.length > 1 ? ' · ' + c.list.length + ' раза' : ''); card.appendChild(p1);
  const p2 = document.createElement('p'); p2.textContent = gene ? (g ? g.daet : '') : (t.sovet || ''); card.appendChild(p2);
  const go = document.createElement('button'); go.id = 'mgoal'; go.className = 'ghost'; go.textContent = 'Запомнить это место'; // метка-цель (Э20): стрелка у края экрана в заплыве
  go.onclick = ev => { ev.stopPropagation(); KARTA.goal = { x: m.x, y: m.y }; saveKarta(); go.textContent = 'Запомнено · стрелка покажет путь'; go.disabled = true; };
  if (KARTA.goal && c.list.some(q => q.x === KARTA.goal.x && q.y === KARTA.goal.y)) { go.textContent = 'Это место — твоя цель'; go.disabled = true; }
  card.appendChild(go);
  if (world.me.length) { const w0 = world.center(), dx = m.x - w0.x, dy = m.y - w0.y, sec = Math.hypot(dx, dy) / cfg.speed; // куда плыть, а не только в каком слое
    const wy = Math.abs(dy) > 400 ? (dy > 0 ? 'вниз' : 'вверх') : '', wx = Math.abs(dx) > 400 ? (dx > 0 ? 'вправо' : 'влево') : '';
    const p4 = document.createElement('p'); p4.className = 'mway'; p4.textContent = !wy && !wx ? 'Ты рядом с этим местом' : 'Плыть ' + [wy, wx].filter(Boolean).join(' и ') + ', ' + (sec < 20 ? 'несколько секунд' : sec < 45 ? 'примерно полминуты' : sec < 90 ? 'около минуты' : 'около ' + Math.round(sec / 60) + ' минут');
    card.insertBefore(p4, go); }
  card.hidden = false;
});
// «Не так»: одно касание — отметка с моментом игры. Копятся здесь, «Отправить» — меню «Поделиться» телефона.
let marks = [];
try { marks = JSON.parse(localStorage.getItem('zaplyv.marks') || '[]'); } catch (_) {}
const keepMarks = () => { try { if (marks.length) localStorage.setItem('zaplyv.marks', JSON.stringify(marks)); else localStorage.removeItem('zaplyv.marks'); } catch (_) {} };
function showMarks() {
  const n = marks.length;
  $('esend').style.display = n ? '' : 'none'; $('esend').textContent = `Отметки · ${n}`;
  const g = $('gsend'); if (g) { g.style.display = n ? '' : 'none'; g.textContent = `Отметки · ${n}`; }
  if ($('mlist').classList.contains('on')) listMarks();
}
// Список отметок: каждую можно убрать ✕, все сразу — «Стереть все» и второе касание «Точно стереть». Отправить — оттуда же.
let wipeSure = false;
function listMarks() {
  const n = marks.length; if (!n) { $('mlist').classList.remove('on'); return; }
  $('mlhead').textContent = `Отметки · ${n}`; $('mlrows').textContent = '';
  marks.forEach((m, i) => { const row = document.createElement('div'); row.className = 'mlrow';
    if (m.img) { const im = new Image(); im.src = m.img; im.alt = ''; row.appendChild(im); }
    const t = document.createElement('span'); t.textContent = m.at + ' · ' + m.text; row.appendChild(t);
    const x = document.createElement('button'); x.className = 'ghost'; x.textContent = '✕'; x.setAttribute('aria-label', 'Убрать отметку ' + (i + 1));
    x.onclick = () => { marks.splice(i, 1); keepMarks(); showMarks(); }; row.appendChild(x); $('mlrows').appendChild(row); });
  $('mlwipe').textContent = wipeSure ? 'Точно стереть?' : 'Стереть все'; $('mlwipe').classList.toggle('sure', wipeSure);
}
const openMarks = () => { wipeSure = false; $('mlist').classList.add('on'); listMarks(); };
$('mlwipe').onclick = () => { if (!wipeSure) { wipeSure = true; listMarks(); return; } marks = []; keepMarks(); wipeSure = false; showMarks(); say('Отметки стёрты', 1800); };
$('mlsend').onclick = async () => { await send(); showMarks(); };
$('mlclose').onclick = () => $('mlist').classList.remove('on');
// Случайное касание флажка (О38: приняли за «закончить заплыв»): под надписью «Убрать» — последняя отметка уходит.
let undoT = 0;
const offerUndo = () => { const u = $('nundo'), r = $('note').getBoundingClientRect(); u.style.top = (r.height ? r.bottom + 8 : 108) + 'px'; u.classList.add('on'); clearTimeout(undoT); undoT = setTimeout(() => $('nundo').classList.remove('on'), 3500); };
$('nundo').onclick = () => { marks.pop(); keepMarks(); showMarks(); $('nundo').classList.remove('on'); $('note').classList.remove('on'); say('Отметка убрана', 1500); };
// Отклик на касание флажка виден на любом экране: флажок вспыхивает, рядом своя надпись поверх всех слоёв (урок L017).
let noteT = 0;
function flag(screen, btn) {
  const now = new Date(), at = `${now.getDate()}.${String(now.getMonth() + 1).padStart(2, '0')} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  let text; try { text = mark(world, cards, $('ver').textContent.replace('Заплыв ', ''), screen, cfg.flag_r, { x: view.x, y: view.y }); } catch (e) { text = $('ver').textContent + ' · ' + screen + ' · (подробности не собрались: ' + e.message + ')'; }
  marks.push({ at, text });
  keepMarks(); showMarks();
  const n = $('note'); n.classList.remove('ok'); n.textContent = `⚑ Отметка ${marks.length} записана` + (screen === 'игра' ? ' · отправить — на паузе' : ''); n.classList.add('on'); offerUndo();
  clearTimeout(noteT); noteT = setTimeout(() => n.classList.remove('on'), 3500);
  if (btn) { btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit'); }
  try { beep(880, 0.08, 0.04, 'sine', 0.8); } catch (_) {}
}
// Картинка отметки с подписью снизу: номер, время и все слова отметки. Без картинки — карточка из одних слов.
async function signed(url, head, text) {
  let im = null; if (url) { im = new Image(); im.src = url; await im.decode(); }
  const W = Math.max(640, im ? im.width : 0), pad = 20, c = document.createElement('canvas'), g = c.getContext('2d'); // кадр не ужимаем
  const ih = im ? Math.round(W * im.height / im.width) : 0, font = '22px -apple-system, system-ui, sans-serif'; g.font = font;
  const lines = []; for (const para of text.split('\n')) { let l = ''; for (const w of para.split(' ')) { const t = l ? l + ' ' + w : w; if (g.measureText(t).width > W - 2 * pad && l) { lines.push(l); l = w; } else l = t; } lines.push(l); }
  c.width = W; c.height = ih + pad * 2 + 34 + lines.length * 28; g.fillStyle = '#081a22'; g.fillRect(0, 0, W, c.height);
  if (im) g.drawImage(im, 0, 0, W, ih);
  g.fillStyle = '#ffc9a8'; g.font = 'bold 24px -apple-system, system-ui, sans-serif'; g.fillText('⚑ ' + head, pad, ih + pad + 22);
  g.fillStyle = '#e8f2f2'; g.font = font; lines.forEach((l, k) => g.fillText(l, pad, ih + pad + 56 + k * 28));
  return await new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('нет картинки')), 'image/jpeg', 0.85));
}
async function send() {
  const text = message(marks);
  try {
    const files = []; for (const [i, m] of marks.entries()) { const head = `Отметка ${i + 1} из ${marks.length} · ${m.at}`; // слова впечатаны в картинку: «Поделиться» часто отдаёт только фото (урок L035)
      try { files.push(new File([await signed(m.full || m.img, head, m.text)], `ne_tak_${i + 1}.jpg`, { type: 'image/jpeg' })); } catch (_) {} } /* одна картинка на отметку, с подписью (Роман 27.11: «без комментария фото не нужно») */
    if (navigator.share && files.length && navigator.canShare?.({ files })) await navigator.share({ text, files }); // картинки мест — вместе со словами
    else if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); say('Скопировано — вставь в чат', 2200); }
    marks = []; keepMarks();
    showMarks();
  } catch (e) { if (e?.name !== 'AbortError') say('Не отправилось — отметки целы, попробуй ещё', 2200); } /* отменил отправку — отметки остаются */
}
$('flag').onclick = e => { if (fdrag.used) { fdrag.used = false; return; } flagAt(null, null); };
// Флажок пальцем (Б16, Роман 24.11: «куда я его могу поставить чтобы игра вырезала…»): тянешь флажок на то место, где не так,
// мир замирает, снимается весь экран с кольцом на месте флажка и лист спрашивает словами, что не так. Один флажок на всех экранах (L070, kaplya/flazhok.js).
let frozen = false; const fdrag = { on: false, used: false, x0: 0, y0: 0 }; const FLSRC = new URL('./vendor/html2canvas.min.js', import.meta.url).href;
$('flag').addEventListener('pointerdown', e => { fdrag.on = true; fdrag.drag = false; fdrag.x0 = e.clientX; fdrag.y0 = e.clientY; fl.podgruzit(FLSRC).catch(() => {}); try { $('flag').setPointerCapture(e.pointerId); } catch (_) {} });
$('flag').addEventListener('pointermove', e => {
  if (!fdrag.on) return;
  if (!fdrag.drag && Math.hypot(e.clientX - fdrag.x0, e.clientY - fdrag.y0) > 14) { fdrag.drag = true; frozen = true; $('fpin').hidden = false; }
  if (fdrag.drag) { const f = $('fpin'); f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px'; }
});
$('flag').addEventListener('pointerup', e => { if (!fdrag.on) return; fdrag.on = false; if (fdrag.drag) { fdrag.used = true; flagAt(e.clientX, e.clientY); } });
$('flag').addEventListener('pointercancel', () => { fdrag.on = false; if (fdrag.drag) { $('fpin').hidden = true; frozen = false; } });
async function flagAt(cx, cy) { // снимок всего экрана: мир и открытое окно; тянул — с кольцом там, где отпустил
  $('fpin').hidden = true; frozen = true; const where = fl.ekran(document, PNAME[curTab]);
  let wp; if (cx != null && where === 'игра') { const [ux, uy] = unit({ clientX: cx, clientY: cy }); wp = toWorld(ux, uy); }
  render(paint.t || performance.now() / 1000); // свежий кадр в буфере — сразу снимаем (снимок копирует холст до первого ожидания)
  let S = null; try { S = await fl.snimok(canvas, 720, FLSRC, cx, cy); } catch (_) {} // 720 в ширину: мелкий кадр на телефоне мыльный (Роман 25.11)
  FLAG.img = S ? S.full : ''; FLAG.wp = wp; FLAG.where = where; FLAG.okna = !!S?.okna;
  $('fsheet').classList.toggle('top', cy != null && cy > innerHeight / 2); // лист от дальнего края: место под флажком остаётся видно
  $('fwhere').hidden = false; $('fwhere').textContent = where; $('fimg').hidden = !S; if (S) $('fimg').src = S.kusok || S.full;
  $('ftext').value = ''; $('fsheet').classList.add('on');
}
const FLAG = {}; window.kaplyaFlag = () => FLAG;
$('fsave').onclick = () => {
  const words = $('ftext').value.trim(), now = new Date(), at = `${now.getDate()}.${String(now.getMonth() + 1).padStart(2, '0')} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  const where = FLAG.where || 'игра';
  let text; try { text = mark(world, cards, $('ver').textContent.replace('Заплыв ', ''), where, cfg.flag_pin_r, FLAG.wp); } catch (e) { text = $('ver').textContent + ' · ' + where; }
  marks.push({ at, text: (words ? '«' + words + '» · ' : '') + text, img: FLAG.img || '' }); /* одна картинка на отметку, подпись впечатается при отправке (Роман 27.11) */
  try { localStorage.setItem('zaplyv.marks', JSON.stringify(marks)); } catch (_) { marks[marks.length - 1].img = ''; try { localStorage.setItem('zaplyv.marks', JSON.stringify(marks)); } catch (_) {} } // место кончилось — оставим слова
  showMarks(); fclose(); const n = $('note'), q = marks.length; n.textContent = q > 1 ? `⚑ Записано · ${q} ${q % 10 >= 2 && q % 10 <= 4 && (q % 100 < 12 || q % 100 > 14) ? 'отметки ждут' : q % 10 === 1 && q % 100 !== 11 ? 'отметка ждёт' : 'отметок ждут'} отправки` : '⚑ Записано с картинкой · отправить — на паузе'; n.classList.add('on', 'ok'); clearTimeout(noteT); noteT = setTimeout(() => n.classList.remove('on'), 2200);
};
const fclose = () => { $('fsheet').classList.remove('on'); frozen = false; };
$('fcancel').onclick = fclose;
$('eno').onclick = e => flag('экран гибели', e.currentTarget);
$('esend').onclick = openMarks;
showMarks();
function slyshuBodo(k, b) { const S = KAP.bodo.slova; // события бодо словами книги (П6: «Бодо разделился: он легче»)
  if (k === 'bodo_delenie' && b.car) say(window.kaplyaStaryeStroki ? S.delenie_staroe : S.delenie, 2400); if (k === 'bodo_syela') { say(b.car ? S.car : S.syela, 4000); if (b.car) { pkz.zhdat(POK, CEL.videl); GLAVA = 2; glv.sohranit(2); setTimeout(() => say(KAP.glavy[2].nazvanie, 3500), 4200); } beep(420, 0.4, 0.06, 'sine', 1.5); } }
function meet(k) { // первая встреча в заплыве: имя и что делать (книга, «значит»), у опасных — в каждом заплыве, а не только в первый раз (L043)
  const t = TEKSTY[k] || {}, name = t.imya || cards[k]?.name, fresh = !met.has(k) && !!cards[k]; if (!name) return;
  if (fresh) { met.add(k); saveMet(); cabLabel(); beep(990, 0.12, 0.03, 'sine', 1.3); }
  if (fresh || t.otnoshenie === 'opasen') { const zn = String(t.znachit || cards[k]?.tip || ''), st = !!window.kaplyaStaryeStroki; say(name + (st ? ': ' + zn : zn ? ' — ' + zn[0].toLowerCase() + zn.slice(1) : '') + (fresh ? ' · новое в Альманахе' : ''), 3200); } /* L133: «Зелёная нить: Держись рядом: …» — одно двоеточие, тире после имени */
}
function pokaz(text, ms, gene) { pokazT = performance.now(); $('toast').textContent = window.kaplyaStaryeStroki ? text : text.replace(/ — /g, '\u00a0— '); /* L139: тире не встаёт в начало строки */ $('toast').classList.toggle('vazhno', !window.kaplyaStaryeStroki && /^Гибель:/.test(text)); /* L139: «Гибель… Род жив» — заметной плашкой, а не серой подсказкой */ if (gene) { const im = new Image(); im.src = icon(gene); im.className = 'ticon'; im.alt = ''; im.style.borderColor = geneColor(gene); if (!window.kaplyaStaryjZnachok) { const d = document.createElement('span'); d.className = 'ticon tkrug'; d.style.borderColor = im.style.borderColor; im.className = ''; d.appendChild(im); $('toast').prepend(d); } else $('toast').prepend(im); } if (false) { } $('toast').classList.add('on'); clearTimeout(toastT); toastT = setTimeout(dalee, ms); }
// П11: строка не перебивает строку. Новая ждёт, пока прошлая провисит min_ms; очередь короткая, старые строки выкидываются. Числа — kaplya.json «stroki».
function say(text, ms, gene, pervoy) { text = String(text).replace(/^Подросла!/, KAP.stroki.podrosla); const K = KAP.stroki, t = performance.now(), T = $('toast'); if (T.classList.contains('on') && t - pokazT < K.min_ms && T.textContent.replace(/\u00a0—/g, ' —') !== text) { if (!OCHERED.some(q => q[0] === text)) { if (pervoy) OCHERED.unshift([text, ms, gene, t, true]); else OCHERED.push([text, ms, gene, t]); if (OCHERED.length > K.ochered) { const i = OCHERED.findIndex(q => !q[4]); OCHERED.splice(i < 0 ? 0 : i, 1); } } /* L115: ответ на твоё касание (pervoy) — первым в очереди, его не вытесняют */ clearTimeout(toastT); toastT = setTimeout(dalee, K.min_ms - (t - pokazT)); return; } pokaz(text, ms, gene); }
// L092: строка про хватку (прилипла, чаша, держит) снимается сразу — на выходе встаёт «Свобода!», при гибели строка гаснет, очередь от хватки чистится.
function srochno(text, ms) { const ZH = [...Object.values(KAP.ameba.slova), ...Object.values(KAP.zahvat.slova)]; for (let i = OCHERED.length - 1; i >= 0; i--) if (ZH.includes(OCHERED[i][0])) OCHERED.splice(i, 1); const T = $('toast'); if (text) pokaz(text, ms); else if (ZH.includes(T.textContent)) { clearTimeout(toastT); dalee(); } }
function dalee() { const t = performance.now(); while (OCHERED.length && t - OCHERED[0][3] > KAP.stroki.zhdat_ms) OCHERED.shift(); if (OCHERED.length) { const [a, b, c] = OCHERED.shift(); pokaz(a, Math.max(b, KAP.stroki.min_ms), c); } else $('toast').classList.remove('on'); }
// П23: коснуться одного из двух вариантов при большом событии. Две кнопки поверх игры, мир не стоит.
// П53: пройдено ли большое событие (объятие или много записей) — навсегда, как вехи
function potolokProiden(n) { if (n === 'obyatie' && (GLAVA > 3 || glv.sohranena() > 3 || (GL && GL.obyatie))) return true; try { return !!localStorage.getItem('zaplyv.kaplya.' + n); } catch (_) { return !!(world && world['_' + n]); } }
function potolokZapisat(n) { if (world) world['_' + n] = true; try { localStorage.setItem('zaplyv.kaplya.' + n, '1'); } catch (_) {} }
window.kaplyaStaya = () => STY; window.kaplyaZona = () => ZON; window.kaplyaSverlo = () => SVR; window.kaplyaSob = () => SOB; window.kaplyaPotolok = () => ({ S: PTL, proiden: potolokProiden });
function vybor(V, otvet) { let el = $('kvybor'); if (!el) { el = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'kvybor' })); Object.assign(el.style, { position: 'fixed', left: '52px', right: '16px', bottom: 'calc(env(safe-area-inset-bottom) + 250px)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: '5', textAlign: 'center' }); }
  el.innerHTML = '<p style="margin:0;font-weight:600;text-shadow:0 1px 4px #000"></p>'; el.firstChild.textContent = V.vopros; V.knopki.forEach((t, i) => { const B = document.createElement('button'); B.textContent = t; B.onclick = e => { e.stopPropagation(); el.remove(); otvet(i); }; el.appendChild(B); }); }
window.kaplyaVybor = () => $('kvybor'); window.kaplyaKarta = () => KAP.karta; window.kaplyaRot = () => ({ K: KAP.rot, S: ROT }); window.kaplyaGL = () => GL; window.kaplyaSposoby = () => world.sposoby; window.kaplyaPokazMira = () => POK; window.kaplyaMayak = () => $('kmayak'); window.kaplyaGol = () => GOL; window.kaplyaZaraza = () => ZAR; window.kaplyaVirus = () => VIR; window.kaplyaKislota = () => KIS;
{ const R = ruka.sozdat(); document.body.classList.toggle('levsha', R.ruka === 'leva'); addEventListener('pointerdown', e => { ruka.kasanie(R, e.clientX, innerWidth, KAP.ruka); }, { passive: true }); /* переигровка 87514c7: кнопка яда и лента стаи перескакивали посреди игры — решение о руке действует со следующего заплыва */ window.kaplyaRuka = () => R; } // П4: рука по первым 20 касаниям
window.kaplyaSay = say; window.kaplyaPokaz = pokaz; window.kaplyaOchered = () => OCHERED.length; window.kaplyaOcheredTeksty = () => OCHERED.map(q => q[0]); /* сторож L115: где в очереди строка */ window.kaplyaLin = () => LIN;
const told = new Set(); // подсказка — один раз и только в момент, когда она нужна
function tell(k, text) { if (told.has(k)) return; told.add(k); say(text, 2600); }
start(null, KAP.rezhim); // скрытый режим «Эволюция»
if (false && !['pesochnica', 'stend'].some(k => new URLSearchParams(location.search).has(k))) menuOpen(); // ссылка на конструктор или стенд меню не открывает (L066) // со второго запуска игра открывается меню режимов (Роман: «почему нет меню выбора режима»); самый первый — сразу заплыв, без непонятных слов (дизайнер)
ROD.visits = (ROD.visits || 0) + 1; saveRod();

const toWorld = (sx, sy) => ({ x: (sx - W / 2) / view.z + view.x, y: (sy - H / 2) / view.z + view.y });
let sway = [0, 0]; // лёгкое покачивание кадра после удара: плавная волна, не дрожь
const scr = (x, y) => [(x - view.x) * view.z + W / 2 + sway[0], (y - view.y) * view.z + H / 2 + sway[1]];
const unit = e => [e.clientX * W / innerWidth, e.clientY * W / innerWidth];

const VKADRE = new Set(); const AMEBA_SKAZANO = new Set(); const YAD = kn.sozdat(KAP.boj.oruzhie.toxin); window.kaplyaYad = () => YAD; // Д.10 п. 3: держишь «Яд» — облако; палец, что ведёт клетку, кнопка не перехватывает (Н.3 п. 5)
{ const b = $('kyad'), vniz = e => { e.preventDefault(); e.stopPropagation(); YAD.derzhu = true; try { b.setPointerCapture(e.pointerId); } catch (_) {} }, verh = e => { e.stopPropagation(); YAD.derzhu = false; };
  b.addEventListener('pointerdown', vniz); for (const k of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(k, verh); b.addEventListener('contextmenu', e => e.preventDefault()); }
function yadKnopka() { const b = $('kyad'), X = KAP.boj.oruzhie.toxin, K = KAP.knopki, vid = !!world.genes.toxin && !les.vkl() && !paused; b.style.display = vid ? '' : 'none'; if (!vid) { YAD.derzhu = false; return; } if (!YAD.skazano) { YAD.skazano = true; say(KAP.knopki.slovo_yad, 4500, 'toxin'); }
  const p = YAD.zapas / X.zapas; b.style.setProperty('--p', (p * 360).toFixed(0) + 'deg'); const st = !!window.kaplyaStarayaKnopkaYad; document.body.classList.toggle('bezPodl', !!window.kaplyaStarayaPodlozhka); document.body.classList.toggle('staryjStolbik', !!window.kaplyaStaryjStolbik); b.style.opacity = p > 0.02 ? 1 : st ? K.tusklo_staryj : K.tusklo; b.classList.toggle('krupno', !st); b.classList.toggle('pusto', !st && p <= 0.02); if (!st && !b.dataset.kr) { b.dataset.kr = 1; const im = b.querySelector('img'); im.style.transform = `scale(${K.yad_krupno})`; im.style.clipPath = `circle(${(50 / K.yad_krupno).toFixed(1)}%)`; } /* L132: палочка крупно во весь круг, пустая кнопка видна и копится зелёным */ b.classList.toggle('derzhu', YAD.derzhu && p > 0); }
canvas.addEventListener('pointerdown', e => {
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} }
  audio?.resume?.();
  const [x, y] = unit(e);
  pad.start(x, y, performance.now()); down = pad.down; finger = pad.finger;
  { const a = world.me[0]; KOLD = null; if (a && !les.vkl()) { const [sx, sy] = scr(a.x, a.y); KOLD = { t: performance.now(), x: e.clientX, y: e.clientY, na: Math.hypot(x - sx, y - sy) < radius(a.m) * view.z * 1.4 + 12 }; } } /* Е.3 п. 9: палец на себе */
});
canvas.addEventListener('pointermove', e => {
  if (!down) return;
  const [x, y] = unit(e); pad.move(x, y); finger = pad.finger; if (KOLD && Math.hypot(e.clientX - KOLD.x, e.clientY - KOLD.y) > KAP.koleso.sdvig) KOLD.na = false; if (KOL.otkryto) kolesoPod(e.clientX, e.clientY);
  if (pad.drag) moved = true;
});
const up = e => {
  if (!down) return;
  if (KOL.otkryto) { const q = KOLQ[kolesoPod(e.clientX, e.clientY)]; kolesoZakryt(); if (q) kol.nachat(KOL, world, q, world.stats.time); pad.end(performance.now()); down = null; finger = null; KOLD = null; return; } /* Е.3 п. 9: отпустил на копии — выбор, в середине — отмена */ KOLD = null;
  if (pad.end(performance.now()) && world.divide()) beep(520, 0.18, 0.06, 'triangle', 1.8);
  down = null; finger = null;
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

// Выбор навыка на ходу (Роман 25.11: «Прерывает игру зачем то — пускай просто всплывает навыки. Игра продолжается аккуратно»):
// мир не стоит, экран не перекрыт. Варианты всплывают полосой у нижнего края под большим пальцем; не выбрал за offer_fold с —
// полоса сворачивается в значок у края, коснёшься — снова раскроется; сам вариант не берётся, значок ждёт касания.
let offerKey = '', offerT = 0; // offerT — время на часах телефона (performance.now), а не мира: полоса сворачивается за 6 настоящих секунд
function offer(dt) {
  { const g = KAP.upravlenie.magnit; if (world.choice.length > 1 && !world.choice.includes(g) && !world.genes[g] && evo.pool(world).includes(g)) world.choice[0] = g; }
  { const P = evo.pool(world), o = KAP.boj.pervyj.find(g => P.includes(g)); if (world.choice.length && !boj.est(world, KAP.boj) && o && !world.choice.some(g => g in KAP.boj.oruzhie)) { if (world.choice.length > 1) world.choice[1] = o; else world.choice.push(o); } } /* одна карточка — оружие второй, а не никогда (пачка 1 п. 1) */ /* Ш25, Роман 21:05: без оружия живое не взять — пока его нет, одно всегда среди карточек */ // Роман 26.11: пищевой магнит — еда плывёт к тебе; пока его нет, он всегда среди карточек
  const key = world.choice.join(), O = $('offer'), D = $('odot');
  if (!window.kaplyaStaryeSlovaAmeby && world.derzhat && world.me[0] && world.derzhat(world.me[0])) world.derzhalT = world.stats.time; const vHvatke = !window.kaplyaStaryeSlovaAmeby && world.stats.time - (world.derzhalT ?? -1e9) < KAP.karta.posle_hvatki;
  if (!world.choice.length || vHvatke) { /* L104: пока держат, карточку не показываем */ if (offerKey) { O.classList.remove('on'); D.classList.remove('on'); offerKey = ''; } return; }
  if (key !== offerKey) { // новый выбор: собрать полосу
    offerKey = key; offerT = performance.now(); $('otitle').textContent = evo.on(world) ? KAP.stroki.podrosla : $('otitle').dataset.d; /* П125: «Подросла!» с родом — своё слово */ const box = $('obtns'); box.innerHTML = '';
    world.choice.forEach(g => { const b = document.createElement('button'); b.innerHTML = '<img class="gicon" alt=""><span></span><small></small>'; if (!window.kaplyaStaryeKarty) { O.classList.add('ryady'); } else document.body.classList.add('staryeKarty');
      b.children[1].textContent = geneName(g) + (world.genes[g] ? ' ' + (mut.lvl(world, g) + 1) : ''); /* К3: имя и уровень */ b.children[2].textContent = mut.daet(world, g, geneBook(g)); b.firstChild.src = icon(g); b.firstChild.style.borderColor = geneColor(g); if (!window.kaplyaStaryeKarty) { const kr = document.createElement('i'); kr.className = 'gkrug'; kr.style.borderColor = geneColor(g); b.insertBefore(kr, b.firstChild); kr.appendChild(b.children[1]); const t = document.createElement('div'); t.className = 'gtekst'; t.append(...[b.children[1], b.children[2]]); b.appendChild(t); } /* L138: картинка крупно во весь круг, имя и что даёт — строкой справа */
      b.onclick = e => { e.stopPropagation(); if (oswipe) return; if (KAP.karta.odin_tap || b.classList.contains('sel')) return take(g); /* Ш20: мир стоит, случайного тапа нет — берётся одним касанием */ // первое касание выбирает, второе берёт: случайный тап большим пальцем навык не возьмёт
        for (const q of box.children) q.classList.remove('sel'); b.classList.add('sel'); offerT = performance.now(); $('otitle').textContent = 'Коснись ещё раз — взять «' + geneName(g) + '»'; $('odesc').textContent = b.querySelector('small').textContent; }; box.appendChild(b); }); $('odesc').textContent = '';
    D.querySelector('img').src = icon(world.choice[0]); O.classList.toggle('karta', !!KAP.karta.pauza); if (KAP.karta.pauza) $('otitle').textContent = KAP.stroki.karta; O.classList.add('on'); D.classList.remove('on'); beep(440, 0.3, 0.04, 'sine', 2);
  }
  const age = (performance.now() - offerT) / 1000;
  if (!KAP.karta.pauza && O.classList.contains('on') && age > cfg.offer_fold) { O.classList.remove('on'); D.classList.add('on'); } // свернулась в значок
  D.style.setProperty('--left', 1); // сам не берётся: значок ждёт касания (прогон 0.84, О86: «Чует еду взялся сам без выбора»)
}
// Свайп, начатый на полосе, — это плавание, а не выбор (прогон 0.84, О86): палец на полосе сразу ведёт джойстик; ушёл дальше 12 точек — касание варианта не считается.
let oswipe = false, ofrom = null;
$('offer').addEventListener('pointerdown', e => { const [x, y] = unit(e); ofrom = [x, y]; oswipe = false; pad.start(x, y, performance.now()); down = pad.down; finger = pad.finger; });
addEventListener('pointermove', e => { if (!ofrom || !down) return; const [x, y] = unit(e); pad.move(x, y); finger = pad.finger; if (Math.hypot(x - ofrom[0], y - ofrom[1]) > 12) { oswipe = moved = true; } });
const oup = () => { if (!ofrom) return; ofrom = null; pad.end(performance.now()); down = null; finger = null; setTimeout(() => { oswipe = false; }, 0); }; // касание полосы не «делится»
addEventListener('pointerup', oup); addEventListener('pointercancel', oup);
function take(g) { world.pick(g); offer(0); say(g === 'gulp' ? KAP.slova_glotat : 'Взято: ' + geneName(g), g === 'gulp' ? 4000 : 2200, g); fx.ring(world.center().x, world.center().y, 0, 300); beep(660, 0.4, 0.06, 'sine', 1.5); }
$('odot').onclick = e => { e.stopPropagation(); offerT = performance.now(); $('offer').classList.add('on'); $('odot').classList.remove('on'); };
$('otitle').dataset.d = $('otitle').textContent;

// L129: дуги и кольца у клетки и целей — сплошной светящейся линией, а не пунктиром из точек (Роман: пунктир, точки, схемы вместо живого — провал). Точки идут чаще своей толщины, яркость делится на перекрытие.
function luk(P, x, y, r, u0, du, w, c, a, f = 1, c2 = c, a2 = a, nStar = 24) { const shag = (N) => { const q = Math.abs(du) * r / Math.max(1, N) / Math.max(0.1, w); window.kaplyaLukShag = Math.max(window.kaplyaLukShag || 0, q); }; /* сторож L129: шаг точек в толщинах линии */ if (window.kaplyaStaryePunktiry) { shag(nStar); for (let j = 0; j < nStar; j++) { const u = j / nStar; P.put(x + Math.cos(u0 + du * u) * r, y + Math.sin(u0 + du * u) * r, w, ...(u <= f ? c : c2), u <= f ? a : a2); } return nStar; }
  const sh = Math.max(0.5, w * 0.15), N = Math.min(900, Math.max(12, Math.ceil(Math.abs(du) * r / sh))), k = Math.min(1, sh / w * 1.1); shag(N); for (let j = 0; j <= N; j++) { const u = j / N; P.put(x + Math.cos(u0 + du * u) * r, y + Math.sin(u0 + du * u) * r, w, ...(u <= f ? c : c2), (u <= f ? a : a2) * k); } return N; }
// L120: подсказка карточки не уходит под нижнюю плашку итога (она липнет к низу, когда лист не влезает) — тесно, и карточка сжимается ступенями: без описания, портрет ниже
function ulozhitItog() { const c = $('card'); c.classList.remove('tesno1', 'tesno2', 'tesno3'); if (window.kaplyaStaryjPodpis) return; for (const k of ['tesno1', 'tesno2', 'tesno3']) { const E = $('end'); if (E.scrollHeight <= E.clientHeight + 1) break; c.classList.add(k); } }
addEventListener('resize', () => { if ($('end').classList.contains('on')) ulozhitItog(); });
// Твой путь за заход: время, поколения и сколько это заняло бы в природе, мутации, кто сколько отнял.
function pathText(w) {
  const L = STY && STY.letopis, s = { ...w.stats, gen: rodChisla(w).gen, most: Math.max(w.stats.most || 0, (L && L.max) || 0, window.kaplyaStaryjPodpis ? 0 : Object.values(w.stats.lost || {}).reduce((x, n) => x + n, 0)) } /* L120: отняли не больше, чем было */, t = Math.round(s.time), mm = (s.gen * 20) | 0; // одно деление ≈ 20 минут при хорошей еде; Е.3 п. 14: поколения и стая — из летописи рода
  const nature = mm < 60 ? mm + ' мин' : Math.floor(mm / 60) + ' ч' + (mm % 60 ? ' ' + (mm % 60) + ' мин' : '');
  const genes = Object.keys(w.genes).filter(g => window.kaplyaStaryjItog || w.genes[g]).map(geneName).join(', ') || 'пока нет'; /* L107: только взятые — выключенный ген (0) в итог не идёт */
  const lost = Object.entries(s.lost).map(([k, n]) => (TEKSTY[k]?.imya || (cards[k] ? cards[k].name : window.kaplyaStaryjItog ? k : imyaKto(k))) + ' — ' + n).join(', ');
  return `Плыл ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}, проплыл ${Math.round(s.path / 26)} мкм<br>`
    + `Поколений: ${s.gen} — в природе это ≈ ${nature}<br>Клеток было до ${s.most}, съедено ${s.eaten}<br>`
    + `Мутации: ${genes}` + (L && L.mutacii.length ? `<br>${KAP.mutaciya.slova.letopis.replace('{rod}', L.mutacii.map(m => KAP.mutaciya.spisok[m].imya).join(', ')).replace('{vzyal}', L.vzyal.map(m => KAP.mutaciya.spisok[m].imya).join(', ') || '—')}` : '') + (lost ? `<br>Отняли клеток: ${lost}` : '');
}


function konecGlavy(pobeda) { if (ended) return; ended = true; const S = KAP.glava.slova, p = pobeda ? 'pobeda' : 'porazh'; /* блок Ц: победа или зараза заняла каплю */
  $('who').textContent = S[p + '_kto']; $('cname').textContent = S[p]; $('ctext').textContent = S[p + '_tekst']; $('cfact').textContent = S[p + '_fakt']; $('ctip').textContent = ''; $('ckill').src = snap('me', KAB.items.me); $('ckill').hidden = false; cabLabel(); $('stats').innerHTML = pathText(world); { const K = KAP.lestnica, rek = les.rekord(LES); $('kles').innerHTML = K.slova.knopka + '<small>' + K.slova.cel + (rek ? ' · ' + K.slova.rekord.replace('{r}', rek) : '') + '</small>'; }
  setTimeout(() => { $('end').classList.add('on'); $('end').scrollTop = 0; $('toast').classList.remove('on'); ulozhitItog(); }, 900); }
window.kaplyaChistka = () => ({ chist: glc.chistota(GLC, KAP.glava), ochagi: GLC.ochagi.map(o => ({ ...o })), konec: GLC.konec, ended, oc: GLC.ochagi });
function events() {
  for (const [k, x, y, size = 1, y2] of world.events) {
    fx.on(k, x, y, size, y2); // вид — fx.js, здесь звук и подписи
    if (k === 'spore') { beep(200, 0.6, 0.06, 'sine', 0.5); say('Сон! Спящих не берут — переждёшь беду', 2600); }
    if (k === 'rost') { beep(440, 0.5, 0.05, 'sine', 1.5); say(rost.text(size), 3200); world.rostT = world.stats.time; } // режим «Рост»: подросла, что теперь можно есть
    if (k === 'igla') { beep(1300, 0.08, 0.05, 'square', 0.5); } // нить-игла уколола соперницу
    if (k === 'yad') { beep(900, 0.06, 0.04, 'sine', 0.7); if (!world.yadSkazano) { world.yadSkazano = true; say(KAP.boj.yad_vid.pervyj, 3500); } } /* Ш25: укол ядом; в первый раз словами — яд пошёл */
    if (k === 'gulp') { beep(200, 0.35, 0.06, 'sine', 0.6); } // проглотила живую клетку
    if (k === 'spit') { beep(260, 0.15, 0.04, 'sine', 0.7); tell('spit', 'Пасть тебя не взяла: ты больше её рта'); }
    if (k === 'sprout') { beep(520, 0.3, 0.05, 'sine', 2); }
    if (k === 'gene') { beep(780, 0.3, 0.05, 'sine', 1.6); say('Ген от сородича: ' + geneName(size) + ' — ' + (geneBook(size).daet || ''), 2600, size); addMark({ kind: 'gene', x, y, who: 'gene:' + size }); } // конъюгация
    if (k === 'zap') { beep(1500, 0.05, 0.05, 'square', 0.4); } // выстрел гарпуна синегнойки
    if (k === 'grab') { beep(240, 0.2, 0.05, 'sawtooth', 1.6); say('Схватили! Резко развернись — вырвешься', 2600); /* каждый раз, не один за заплыв (L043) */ }
    if (k === 'bore') { beep(180, 0.3, 0.05, 'sawtooth', 0.7); say('Прилипла запятая! Резко развернись — стряхнёшь', 2600); } // запятая вбуравливается
    if (k === 'eat' || k === 'gulp') VDOH = vd.nachat(KAP.vdoh); // П13: проглочен кусок — вдох
    if (k === 'eat') { const n = performance.now(); if (n - lastEat > 60) { beep(300 + Math.random() * 200, 0.09, 0.04); lastEat = n; } }
    if (k === 'leave') { tell('leave', 'Дочка уплыла жить сама — мутации копятся дальше'); }
    if (k === 'meet') meet(x);
    if (k === 'stick') { beep(520, 0.06, 0.04, 'square'); if (!mut.calm(world)) tell('stick', 'Сел вирус! Резко развернись — стряхнёшь, пока не впрыснул'); } // прилип фаг: сказать сразу, а не на экране гибели (L042)
    if (k === 'shake') { beep(700, 0.07, 0.03); }
    if (k === 'learn') { beep(620, 0.4, 0.05, 'sine', 1.4); say('Фаг побеждён! Его кусок — новая полоска CRISPR: теперь T4 не страшен', 3000); }
    if (k === 'magnet') beep(392 * Math.pow(2, Math.min(size - 1, 12) / 12), 0.12, 0.05, 'sine', 1.3); // магнит: серия поглощений — восходящие ноты
    if (k === 'snap') { beep(1200, 0.06, 0.04, 'square', 0.3); } // сувойка сжалась пружиной
    if (k === 'slip') beep(900, 0.08, 0.03, 'sine', 1.5); // капсула сработала: амёба не удержала
    if (k === 'shrug') beep(1100, 0.05, 0.03); // новая дверь сработала: вирус отброшен
    if (k === 'bump') { beep(880, 0.05, 0.03); } // капсула: хищник отскочил
    if (k === 'pop') { beep(260, 0.25, 0.06, 'triangle', 0.6); } // чужая клетка лопнула
    if (k === 'otkaz' && y2 === 'zhivoe' && !window.kaplyaStaryOtkaz) { const S = KAP.boj.otkaz_slova, t = world.stats.time; if (!(t - (tell.otkazT ?? -1e9) < S.pauza)) { tell.otkazT = t; if (window.kaplyaStaryOtkazMimo) pokaz(world.genes.toxin && !(world.knopka || {}).toxin ? S.zhivoe_yad : S.zhivoe, 3000); else say(world.genes.toxin && !(world.knopka || {}).toxin ? S.zhivoe_yad : S.zhivoe, 3000, null, !window.kaplyaStaryOtkazVkonce); } } /* L097: щит на живой — сказать, чем её взять; L112: через очередь строк (say), не перебивая прошлую — CI 711fa42, шаг 79 */
    if (k === 'pinch') { beep(1400, 0.05, 0.03, 'square', 0.6); tell('pinch', KAP.boj.slova_pinch); }
    if (k === 'sick') { beep(180, 0.3, 0.05, 'sawtooth', 0.7); }
    if (k === 'burst' || k === 'eaten') { shake = 0.35; beep(110, 0.45, 0.09, 'triangle', 0.5);
      const [sx, sy] = scr(x, y), who = k === 'burst' ? 'phage' : size; // погибла за краем экрана — говорим, кто её взял (урок L039)
      if (world.me.length && !(sx > 0 && sx < W && sy > 0 && sy < H)) { probe.lostFar = (probe.lostFar || 0) + 1; say((window.kaplyaStaryeStroki ? 'Родня погибла за краем экрана: ' : KAP.stroki.kopiya_za_kraem) + ((cards[who] && cards[who].name) || 'хищник'), 2600); } }
  }
  world.events.length = 0;
}

function tick(dt) {
  offer(dt); const DRZ = !window.kaplyaStaryeSlovaAmeby && world.stats.time - (world.derzhalT ?? -1e9) < KAP.karta.posle_hvatki; /* L104: в хватке карточка ждёт — бой не встаёт на паузу посреди спасения */ if (KAP.karta.pauza && (world.choice.length && !DRZ || MUT.vopros)) return; if (KOLD && KOLD.na && down && !KOL.otkryto && !KOL.most && (world.staya || []).length && performance.now() - KOLD.t >= KAP.koleso.derzhat * 1000) kolesoOtkryt(); if (KOL.otkryto) dt *= KAP.koleso.zamedlenie; /* Е.3 п. 9: колесо — мир замедлен */ /* Ш34: и пока лежит «Стать ею?» */ /* Ш20: пока лежат карточки, мир стоит */
  { const H = KAP.hod, me = world.me[0]; if (me) { const zb = view.z / (1 + cfg.close_up * (view.calm || 0)), k = Math.max(1, H.z0 / zb); // Роман 26.11: «чтобы при росте моем не замедлялась клетка»
    cfg.speed = H.v * rsv.hod(KAP.slabyy_start, world) * rost.hod(world, me) * k ** H.stepen / (me.chew && me.m > (me.chew.m || 4) * H.gryzt_bolshe ? rost.R.stoit : 1) * (KOL.most ? KAP.koleso.uyazvim : 1) * (trp.puzyrey(world) ? KAP.trup.tyazhest : 1); } } /* Ж.3: пока тает в пузырьке — тяжелее */ /* Е.3 п. 12: пока мост — вполсилы */ // большую клетку крошечный комок под ней не тормозит: «встать и грызть» только у комка не мельче тебя в gryzt_bolshe раз // скорость на экране не падает: тяжесть не тормозит, а отъезд камеры возмещается ходом в мире
  world.knopka = { toxin: YAD.derzhu && YAD.zapas > 0 }; const MA = am.massy(world); const m0 = new Map(world.me.map(a => [a, a.m])), OS = boj.do_hoda(world, KAP.boj); const ZM = les.vkl() ? null : zn.do_hoda(world, KAP.zona); const KUSY = les.vkl() ? [] : world.food.filter(f => f.ot && !f.kus); world.step(dt, KOL.otkryto ? null : pad.value()); { const A = world.me[0]; if (A) for (const f of KUSY) if (f.gone && Math.hypot(f.x - A.x, f.y - A.y) < radius(A.m) * KAP.mutaciya.kusok_r) { const m = mtc.kusok(MUT, KAP.mutaciya, f); if (m && !MUT['s_kus_' + m]) { MUT['s_kus_' + m] = 1; say(KAP.mutaciya.slova.kusok.replace('{}', KAP.mutaciya.spisok[m].imya), 3500, KAP.mutaciya.spisok[m].gene); } } } /* Е.3 п. 8, И27: съел кусочек гена — шанс этой мутации растёт */ lop.shag(world, dt, KAP.lopnut); if (!les.vkl()) for (const [e] of kus.shag(KUS, world, dt, KAP.kusalka, SVR_CELI(), radius)) if (KAP.kusalka.slova[e] && !KUS['s_' + e]) { KUS['s_' + e] = 1; say(KAP.kusalka.slova[e], 3000); } /* Ш38 */ if (!les.vkl()) for (const [e, x] of svr.shag(SVR, world, dt, KAP.sverlo, SVR_CELI(), KAP.rod.hishchniki, radius)) { const S = KAP.sverlo.slova; SVR.posl = e + (x ? ':' + x : ''); /* Ш39 */
    if (e === 'vnutri' && !SVR.skazano) { SVR.skazano = 1; say(S.vnutri, 4500); } if (e === 'syela') say(S.syela, 2500); if (e === 'oba' && world.me[0]) { const a = world.me[0]; a.vnutri = false; world.lose(a, a.x, a.y, Object.keys(LISTS).find(k => LISTS[k] === x) || 'amoeba'); } } if (ZM) { for (const [, z] of zn.shag(ZON, world, dt, KAP.zona, ZM, radius)) if (!ZON.byla[z]) { ZON.byla[z] = 1; say(KAP.zona.slova[z], 4000); } /* Ш40 */ for (const [e, v] of sob.shag(SOB, world, dt, KAP.sobytiya, ZON.zona || 'tihaya', radius)) if (e === 'obyavleno') say(KAP.sobytiya.vidy[v].slovo, 3500); } /* Ш41 */ const UBITY = boj.posle_hoda(world, dt, KAP.boj, radius, OS); if (!les.vkl()) for (const [e, ck, who] of mst.shag(MST, world, KAP.boj, UBITY)) { const S = KAP.boj.mest.slova; say(S[e].replace('{kto}', imyaKto(who)), 4000); if (e === 'otomshcheno') { const m = (KAP.mutaciya.nositeli || {})[ck]; if (m) MUT.kus[m] = Math.min(KAP.mutaciya.kusok_max, (MUT.kus[m] || 0) + KAP.boj.mest.kuski * KAP.mutaciya.kusok); } } /* Д.9: месть — метка светлеет, победа даёт кусочки гена */ if (world.trupy) { const a = world.me[0], { ev, lop } = trp.shag(world, dt, KAP.trup, a, world.genes.gulp ? Math.max(1, mut.lvl(world, 'gulp')) : 0, (b, m) => world.grow(b, m)); for (const t of lop) { world.lopnut(t.ck, t.q); world.events.push(['pop', t.q.x, t.q.y, t.ck]); } for (const [e] of ev) if (e === 'obvolok') { world.events.push(['eat', a.x, a.y, 1]); if (!TRP_S) { TRP_S = 1; say(KAP.trup.slova.obvolok, 3500, 'gulp'); } } } /* Ж.3: серое тело t секунд, «Глотать» — пузырём */ if (!les.vkl()) for (const [e] of glc.shag(GLC, world, dt, KAP.glava, world.me[0], UBITY, (o, n) => { const K = KAP.glava, r = () => (world.r ? world.r() : Math.random()), R = KAP.novye.sinegnoyka.ochag.r; for (let i = 0; i < n; i++) world[K.spisok].push({ id: ++world.ids, x: o.x + (r() - 0.5) * 2 * R, y: o.y + (r() - 0.5) * 2 * R, a: r() * 6.283, m: K.massa[0] + r() * (K.massa[1] - K.massa[0]), t: r() * 2, faza: 'beg', oc: o }); })) { const S = KAP.glava.slova, a = world.me[0]; /* блок Ц */
      if (e === 'ubil') { if (a && KAP.glava.pochka) { STY.porc = Math.max(STY.porc, KAP.staya.porciya * a.m); STY.nachalo ??= STY.t - (STY.T || KAP.staya.T_max); } if (!GLC.s_perv) { GLC.s_perv = 1; say(S.pervaya, 4000); } } /* цепная реакция: съел заразу — копия */
      if (e === 'chist') say(S.chist.replace('{n}', GLC.ochagi.filter(x => x.sila > 0).length), 4000); if (e === 'pobeda' || e === 'porazhenie') konecGlavy(e === 'pobeda'); } /* таблица боя: яд и игла бьют по геному */ { const X = KAP.boj.oruzhie.toxin, a = world.me[0]; kn.shag(YAD, X, world.genes.toxin && !les.vkl() ? a : null, a ? radius(a.m) : 0, dt, world.stats.time, !!a && a.m > (m0.get(a) ?? a.m)); boj.oblako(world, KAP.boj, 'toxin', (x, y) => kn.vOblake(YAD, X, x, y, world.stats.time), radius); yadKnopka(); if (a && YAD.derzhu && YAD.zapas > 0 && !window.kaplyaStaryjZapas) { const X = KAP.boj.oruzhie.toxin, kol = boj.kolca(world, KAP.boj, a, radius)[0], l = Math.max(1, (world.lvl || {}).toxin || 0); let best = null, bd = 1e9, be = 0; if (kol) for (const [ck, c] of Object.entries(KAP.boj.celi)) { if (ck === '_' || !c.spisok || ((c.stenka || {}).toxin ?? 1) <= 0 || ((c.s_urovnya || {}).toxin || 1) > l) continue; for (const q of world[c.spisok] || []) { if (q.gone) continue; const d = Math.hypot(q.x - a.x, q.y - a.y), e = kol.R + radius(q.m || c.massa) * (c.k_r || 1); if (d < e + X.privyaz && d - e < bd - be) { best = q; bd = d; be = e; } } } if (best && bd > be - 2) { const k = (bd - (be - 2)) / bd; a.x += (best.x - a.x) * k; a.y += (best.y - a.y) * k; } } /* L124: ворс CdiA держит цель — с зажатым «Ядом» течение не уносит тебя из кольца */ if (a && YAD.derzhu) { const L = window.kaplyaYadLog ||= [], R = radius(a.m), kol = boj.kolca(world, KAP.boj, a, radius)[0], C = KAP.boj.celi; for (const [ck, c] of Object.entries(C)) { if (ck === '_' || !c.spisok) continue; for (const q of world[c.spisok] || []) { if (q.gone) continue; const d = Math.hypot(q.x - a.x, q.y - a.y), rq = radius(q.m || c.massa) * (c.k_r || 1); if (d - rq > R * 3) continue; L.push([+world.stats.time.toFixed(2), ck, Math.round(d), Math.round(R + rq), kol ? Math.round(kol.R + rq) : null, +YAD.zapas.toFixed(2), !!(world.knopka || {}).toxin, q.gn ? +q.gn.f.toFixed(2) : 1, q.otkaz ? q.otkaz.p : '', q.held || 0, +(q.m || 0).toFixed(2), +a.m.toFixed(2)]); } } if (L.length > 400) L.splice(0, L.length - 400); } } /* Д.10 п. 3: облако яда с кнопки; журнал яда для переигровки: [время, кто, расстояние, касание, край кольца, запас, яд идёт, здоровье цели, отказ, держат, масса цели, твоя масса] — window.kaplyaYadLog */ if (!les.vkl()) for (const [e] of am.shag(world, dt, KAP.ameba, radius, cfg.speed, MA)) { const S = KAP.ameba.slova; if (e === 'vyrvalas' && !window.kaplyaStaryeSlovaAmeby) { srochno(S[e], 2200); continue; } if (e === 'syela' && !window.kaplyaStaryeSlovaAmeby) { srochno(null); continue; } if (S[e] && !AMEBA_SKAZANO.has(e)) { AMEBA_SKAZANO.add(e); say(S[e], 2600); } } /* L092: «прилипла» гаснет на выходе и при гибели, «Свобода!» сразу; пока держат — не ешь */ /* Д.10 п. 7 */ if (!les.vkl() && !world.bezZahvata) for (const [e] of zhv.shag(ZHV, world, dt, KAP.zahvat, world.me[0], undefined, radius)) { if (e === 'ryvok') beep(330, 0.12, 0.05, 'triangle', 1.4); if (e === 'vyrvalas') { if (window.kaplyaStaryeSlovaAmeby) say(KAP.zahvat.slova.vyrvalas, 2200); else srochno(KAP.zahvat.slova.vyrvalas, 2200); beep(660, 0.2, 0.05, 'sine', 1.6); } } /* L074: рывки против амёбы, развязка за predel секунд */ { const a = world.me[0]; for (const q of world.prey) if (q.kas) { q.kas = false; if (!a || les.vkl() || window.kaplyaStaryKokk) continue; const T0 = world.stats.time; if (!window.kaplyaStaryKokk2 && !(T0 - (q.kasT ?? -99) < KAP.boj.celi.kokk.shchipok_t)) q.touch = KAP.boj.celi.kokk.shchipok_t + dt; /* L088: коснулся заново — жалит сразу, а не через 1,2 с упора (переигровка bac846d: касания короткие, отскок) */ q.kasT = T0; q.touch = (q.touch || 0) + dt; if (q.touch > KAP.boj.celi.kokk.shchipok_t) { q.touch = 0; a.pinch = KAP.boj.celi.kokk.shchipok; world.events.push(['pinch', q.x, q.y]); } } } /* L075: касание по контуру тела (stolk.js) — тоже касание: щипок кокка доходит */ boj.po_tebe(world, dt, KAP.boj, m0); /* Ш3: уколы жителей по тебе — по геному, а не по массе */ stk.shag(world, KAP.stolk, ZAP, VC.vidy[KAP.stolk.igrok.zapis]); /* Роман 21:55: не проходишь сквозь жителей */ for (const t of obl.shag(OBL, world, dt, KAP.oblasti, m0, GLAVA)) say(t, 3500);
  if (kis.shag(KIS, world, dt, KAP.kislota, m0, world.events.some(e => e[0] === 'gulp'))) { let byla = false; try { byla = !!localStorage.getItem('zaplyv.kaplya.kislota'); localStorage.setItem('zaplyv.kaplya.kislota', '1'); } catch (_) {} if (!byla) say(KAP.kislota.slovo, 3000); } // П26: в кислой воде еда растит вдвое слабее; имя мути при первом заходе в жизни
  if (!les.vkl()) { const K = KAP.potolok, t = world.stats.time, { upor } = ptl.shag(PTL, world, m0, K, KAP.rost, potolokProiden);
    if (upor && t - (PTL.skazal[upor.nuzhno] ?? -1e9) > K.povtor) { PTL.skazal[upor.nuzhno] = t; say(upor.upor, 4000); }
    if (upor && upor.nuzhno === 'zapisi' && t - PTL.sprosil > K.snova && !$('kvybor')?.children.length) { PTL.sprosil = t; vybor(K.vybor, i => { if (i === 0) { potolokZapisat('zapisi'); say(upor.posle, 4500); } else say(K.razdelilas, 3500); }); } } /* П53 */
  if (!les.vkl() && GLAVA >= 2) krm.shag(KRM, world, dt, KAP.kormyozhka, v => !!ZAP[zh.SPISKI[v]], radius); /* П35: еда меняется с ростом */
  if (!les.vkl() && potolokProiden(KAP.velikany.posle)) krm.shag(VEL, world, dt, KAP.velikany, v => !!ZAP[zh.SPISKI[v]], radius); /* П53: после объятия ты снова мелкий — рядом всегда великан */
  if (!les.vkl()) for (const t of svi.shag(SVI, world, dt, KAP.svet_il, m0, radius)) say(t, 3500); /* П27, П30 */
  umn.plata(world, m0, KAP.umeniya); // П64: плата умений «растёшь медленнее»
  { const K = KAP.sposoby; if (!les.vkl()) for (const n of sp.poluchit(world, GLAVA)) say(K.slova[n], 4500); if (sp.prisoska(world, dt, K.prisoska, radius, cel.SPIS, ms0) && !world.pyotSkazano) { world.pyotSkazano = true; say(K.slova.pyot, 3000); } if (sp.soki(world, dt, K.soki, radius) && !world.sokiSkazano) { world.sokiSkazano = true; say(K.slova.oblako, 3000); } } // П18, П19
  mk.shag(world, dt, KAP.mayak); // П12: род помнит, где уплывшая сестра
  zr.shag(ZAR, world, dt, KAP.zaraza, radius); // П52, ЛЭ26: на большую клетку садится больше вирусов, вокруг неё больше запятых
  ROT.nos = NOS; vdv.shag(ROT, world, dt, KAP.rot, radius, mut.lvl(world, 'magnet'), KAP.pitanie.plotoyadnyy_k); /* Ж.2б: шире только с «Магнитом» */ /* Ш2, З6: еда перед носом закручивается водоворотом в рот; «Чует еду» (книга: «Нюх» становится «Магнитом», К0 — умения не удаляем) даёт конус первого уровня */
  { const t = les.vkl() ? '' : gol.shag(GOL, world, dt, KAP.golod, GLAVA, OBL.ten); if (t) say(t, 3500); const M = $('kmut') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'kmut' }); if (!M.style.position) Object.assign(M.style, { position: 'fixed', inset: '0', background: KAP.golod.mut.cvet, pointerEvents: 'none', zIndex: '1' }); M.style.opacity = (GOL.mut * KAP.golod.mut.a).toFixed(3); } // П85: голод — вода мутнеет
  { const T = $('kten') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'kten' }); if (!T.style.position) Object.assign(T.style, { position: 'fixed', inset: '0', background: '#000', pointerEvents: 'none', transition: 'opacity 1.5s', opacity: '0', zIndex: '1' }); T.style.opacity = OBL.ten ? KAP.oblasti.ten.a : 0; } // П33: тень от облака
  { const g = sm.shag(SEM, world, world.me[0], KAP.semena, dt, radius); if (g) { world.genes[g] = true; say(KAP.semena.slova.vzyato.replace('{}', geneName(g)), 3000, g); } } // П76: коснулся семени — умение твоё
  vh.hudet(world, evo.E, KAP.rost, dt); nv.shag(NAV, world, KAP.navyki, say); if (umn.tech(world, dt, KAP.umeniya, radius) && !world.vampirSkazano) { world.vampirSkazano = true; say(KAP.umeniya.slova.vampir, 3500); } if (window.kaplyaStarayaGlotat && !world.genes.gulp && world.stats.time >= KAP.glotat_s && !world.choice.length) world.choice = ['gulp']; /* только для самопроверки test_partiya */ if (!les.vkl() && !world.pervayaKarta && world.stats.time >= KAP.karta.pervaya_s && !world.choice.length && world.me.length) { world.pervayaKarta = true; const P = evo.pool(world).filter(g => g !== 'gulp'); for (let i = P.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; } world.choice = P.slice(0, evo.E.vybor); } /* пачка 1 п. 1: первая карточка на pervaya_s секунде — обычный выбор (оружие среди них, offer), а не одна «Глотать» */ /* урок L-gulp (27.11 20:27): старая выдача «Глотать» на 10-й секунде убрана — она клала карточку мимо pitanie.ne_dat, и оружие не приходило; «Глотать» только лестницей питания */ // книга П2, П16: глотать с 10-й секунды, а не после первого роста
  for (const e of rsv.shag(RSV, world, dt, KAP.rastvor, evo.E, RSV_SPISKI, radius, cfg.speed, (a, m) => world.grow(a, m))) if (!RSV[e]) { RSV[e] = 1; say(KAP.rastvor.slova[e], 3000); } /* Ш29: крупное тает у оболочки, отплыл — отпало */
  if (!les.vkl()) { for (const e of sty.shag(STY, world, dt, KAP.staya, m0, cfg.speed, Math.random, KAP.mutaciya, MUT.moya, MUT.kus)) if (KAP.staya.slova[e] && !STY['s_' + e]) { STY['s_' + e] = 1; say(KAP.staya.slova[e], 3500); } /* Ш32, Ш33 */
    for (const [e, , m] of kol.shag(KOL, world, dt, KAP.koleso, STY, MUT, mm => mtc.zakrepit(MUT, world, KAP.mutaciya, mm), world.stats.time)) { const S = KAP.koleso.slova, Mm = m && KAP.mutaciya.spisok[m]; /* Е.3 п. 10–12 */
      if (e === 'gotovo') { if (m && STY.letopis && !STY.letopis.vzyal.includes(m)) STY.letopis.vzyal.push(m); } if (e === 'gotovo') say(Mm ? S.gotovo.replace('{}', Mm.imya) : S.gotovo_bez.replace('{}', Math.round(STY.T ?? KAP.staya.T_max)), 4000, Mm ? Mm.gene : undefined); else say(S[e], 3000); }
    const M = KAP.mutaciya, MS = M.slova, im = m => M.spisok[m].imya; for (const [e, q, g] of mtc.shag(MUT, world, dt, M)) { // Ш34, Ш35, Ш37
      if (e === 'mutant' && !MUT.sprosila[q.mut]) { MUT.sprosila[q.mut] = 1; say(KAP.koleso.slova.rastet.replace('{}', im(q.mut)), 4000, M.spisok[q.mut].gene); } /* Е.3 п. 6, 9: вместо карточки «Стать ею?» — строка; меняешься колесом */
      if (e === 'otskok') { world.events.push(['bump', g.x, g.y]); if (!(MUT.zvon > world.stats.time)) { MUT.zvon = world.stats.time + 0.25; beep(1320, 0.08, 0.03, 'sine'); } } /* 12.5: вирус отскакивает от замка со звоном */
      if (e === 'spas') say(MS.spas.replace('{n}', q).replace('{iz}', g), 5000);
      if (e === 'umerla' && !MUT.s_umerla) { MUT.s_umerla = 1; say(MS.umerla, 3500); } if (e === 'zakrep') say(MS.zakrep.replace('{}', geneName(g)), 4000, g); } }
  if (!les.vkl() && !window.kaplyaBezEdy) edr.shag(EDR, world, dt, KAP.eda_ryadom, world.me[0]); /* L081 */ psh.shag(world, dt, KAP.pishcha, radius); { const B = KAP.bodo, um = !!world.genes.gulp; bodo.shag(world, dt, B, radius, slyshuBodo); bodo.glotat(world, B, radius, evo.E.glotat.syt, 0, um, slyshuBodo); zh.shag(world, dt, KAP.novye, v => (les.vkl() || v !== KAP.glava.kto) && /* блок Ц: синегнойка только из очагов главы */ !!ZAP[zh.SPISKI[v]] && (les.vkl() ? les.poyavitsya(KAP.lestnica, world.me[0] ? world.me[0].m : 1, KAP.novye[v].massa[0]) : (GLAVA >= (KAP.novye[v].glava || 1) || (KAP.novye[v].ranshe ? 'ranshe' : false))), radius); zh.glotat(world, evo.E.glotat.bolshe, radius, um, (v, mq, ma) => say(glk.slovo(KAP.slova_glotka, v === 'kaulo' && (world.syel.kaulo || 0) > 1 ? 'kaulo_snova' : v, mq, ma, evo.E.glotat.syt), 2600)); } // джойстик: направление и сила из сдвига пальца
  { const [fx, fy] = world.flow(view.x, view.y); cur[0] += fx * dt; cur[1] += fy * dt; } // течение несёт взвесь
  if (!window.kaplyaStaroeVtyag) for (const a of world.me) { const g = a.grab; if (g && g.by) { const [mx, my] = world.mouthOf(g); if (!a.vtg || a.vtg.g !== g) a.vtg = { g, by: g.by, x: a.x, y: a.y }; const k = Math.min(1, KAP.zahvat.vtyag * dt); let sx = (mx - a.vtg.x) * k, sy = (my - a.vtg.y) * k; if (!window.kaplyaStaryjSkachokPasti) { const L = Math.hypot(sx, sy), M = KAP.zahvat.vtyag_max * dt; if (L > M) { sx *= M / L; sy *= M / L; } if (a.vtg.mx != null) { const ex = mx - a.vtg.mx, ey = my - a.vtg.my; if (Math.hypot(ex, ey) < KAP.zahvat.skachok_pasti) { a.vtg.x += ex; a.vtg.y += ey; } } a.vtg.mx = mx; a.vtg.my = my; } /* пасть плывёт — клетка с ней; пасть перескочила — клетка догоняет плавно */ a.vtg.x += sx; a.vtg.y += sy; window.kaplyaVtgShag = Math.max(window.kaplyaVtgShag || 0, Math.hypot(sx, sy) / Math.max(dt, 1e-3)); /* L150 (тред проверки на d99c6f6: «туфелька… клетка за кадр прыгает на 30 единиц… пасть резко меняет место при повороте»): к пасти не быстрее vtyag_max ед/с */ a.x = a.vtg.x; a.y = a.vtg.y; a.vx = a.vy = 0; } else if (a.vtg) { a.vtg.by.syt = Math.max(a.vtg.by.syt || 0, KAP.zahvat.ameba_otdyh); a.vtg = null; } } /* L128: пасть втягивает плавно в одну сторону — ни течение, ни колёса, ни палец не дёргают клетку туда-обратно; вырвалась — пасть отдыхает, не хватает тут же снова */
  events(); if (!window.kaplyaStaryjPodpis && world.me.length) world.stats.most = Math.max(world.stats.most || 1, world.me.length + (world.staya || []).length); /* L120: «Клеток было до» — ты и стая */
  if (!world.me.length) {
    if (!ended) {
      ended = true;
      const kk = world.stats.killer, k = cards[kk] || cards.me, t = TEKSTY[kk] || {}; // кто убил — словами книги и его моделью (урок L022)
      if (world.stats.where && kk) addMark({ kind: 'death', x: world.stats.where[0], y: world.stats.where[1], who: kk }); keepSeen(); // отметка на карте: где погиб и кто убил (Э19)
      const bezKarty = !window.kaplyaStaryjItog && kk && kk !== 'me' && !cards[kk] && !t.ubil; /* L107: убийца без карточки (трубач, новые жители) — «Гибель: Трубач» и твой портрет, а не «Это ты» с пустой рамкой */
      $('who').textContent = world.stats.sam ? KAP.rod.slova.itog_sam : bezKarty ? KAP.rod.slova.itog_kto.replace('{kto}', imyaKto(kk)) : t.ubil || k.who; { const S0 = window.kaplyaStaryjPodpis, kp = KAB.items[kk] ? kk : !window.kaplyaStaryjItog && KAB.items.me ? 'me' : null, tvoy = !S0 && kp === 'me' && kk && kk !== 'me', ck = cards[kk] || {}, imyaU = t.imya || ck.name || imyaKto(kk), opis = t.kto || ck.text; $('card').classList.toggle('tvoy', !!tvoy); $('cname').textContent = tvoy ? cards.me.name : t.imya || k.name; $('ctext').textContent = tvoy ? (opis ? imyaU + ': ' + opis : cards.me.text) : t.kto || k.text; } /* L120: портрет твой — подпись под ним твоя, убийца назван в заголовке и в строке о нём */
      $('cfact').textContent = t.priroda || k.fact; $('ctip').textContent = t.sovet || k.tip || '';
      if (kk && KAB.items[kk] && kk !== 'me') $('cab').textContent = 'Кто это · ' + (t.imya || k.name) + ' в Альманахе'; else cabLabel(); // прогон 0.68: «Альманах» с гибели вёл в общий список, а не к убийце
      { const kp = KAB.items[kk] ? kk : !window.kaplyaStaryjItog && KAB.items.me ? 'me' : null; $('ckill').src = kp ? snap(kp, KAB.items[kp]) : ''; $('ckill').hidden = !kp; } /* L107: рамка всегда с портретом */
      $('stats').innerHTML = pathText(world); { const K = KAP.lestnica, rek = les.rekord(LES); $('stats').innerHTML = (sm.pamyat().rekord ? K.slova.rekord_razmer.replace('{r}', sm.pamyat().rekord.toFixed(1).replace('.', ',')) + '<br>' : '') + (les.vkl() ? K.slova.itog.replace('{n}', LES.schet).replace('{r}', rek) + '<br>' : '') + $('stats').innerHTML; $('kles').innerHTML = les.vkl() ? K.slova.nazad : K.slova.knopka + '<small>' + K.slova.cel + (rek ? ' · ' + K.slova.rekord.replace('{r}', rek) : '') + '</small>'; } // П89: счёт и рекорд «Лестницы»
      if (!world.stats.sam) ROD.deaths = (ROD.deaths || 0) + 1; ROD.genes = Object.keys(world.genes).filter(g => world.genes[g]); ROD.most = world.stats.most; ROD.seed = world.seed; // род для ночи и меню
      const kl = world.stats.killer || 'me'; ROD.killers = ROD.killers || {}; if (!world.stats.sam) ROD.killers[kl] = (ROD.killers[kl] || 0) + 1; saveRod();
      setTimeout(() => { $('end').classList.add('on'); $('end').scrollTop = 0; $('toast').classList.remove('on'); ulozhitItog(); }, 700); // лист гибели всегда с начала: убийца сверху (L031) // подсказка заплыва не ложится на экран гибели
    }
    return;
  }
  const C = cfg.cam, ok = world.me.filter(a => !a.grab && !(a.held > 0) && !(a.sick >= 0)), live = ok.length ? ok : world.me; // камера держит здоровых: схваченная, проколотая, заражённая уже не в кадре (L029)
  const lead = live.reduce((b, a) => Math.hypot(a.x - view.x, a.y - view.y) < Math.hypot(b.x - view.x, b.y - view.y) ? a : b); // своя группа — та, где камера сейчас
  const flock = live.filter(a => Math.hypot(a.x - lead.x, a.y - lead.y) < C.group), k = Math.min(1, 3 * dt); // отставшие вдали не тянут кадр
  const c = { x: flock.reduce((s, a) => s + a.x, 0) / flock.length, y: flock.reduce((s, a) => s + a.y, 0) / flock.length };
  view.x += (c.x - view.x) * k; view.y += (c.y - view.y) * k;
  let spread = 0;
  for (const a of flock) spread = Math.max(spread, Math.hypot(a.x - view.x, a.y - view.y));
  // Камера как у оператора: в спокойствии подъезжает к клетке (видна фактура, ворсинки, кромка света),
  // при опасности рядом или на скорости отъезжает — видно, что вокруг.
  const near = (list, r) => list.some(e => Math.hypot(e.x - c.x, e.y - c.y) < r);
  const danger = near(world.amoebas, 420) || near(world.bdellos, 420) || near(world.slippers, 380) || near(world.bells, 300) || near(world.rotis, 420) || near(world.phages.filter(g => g.host === 'me'), 300);
  const fast = world.me.some(a => Math.hypot(a.vx, a.vy) > 120);
  view.calm = (view.calm || 0) + ((danger || fast ? 0 : 1) - (view.calm || 0)) * Math.min(1, dt * (danger ? 2.5 : 0.6));
  const want = rost.zoom(world, Math.max(rost.zoomMin(world), Math.min(2.3, 2.45 - 0.17 * Math.sqrt(world.biggest()), W * 0.36 / Math.max(spread, 1))) * (1 + cfg.close_up * view.calm), lead.m, radius); // в «Росте» камера отходит от выросшей клетки
  view.z += (Math.min(Math.max(want, C.min_px / radius(lead.m)), pkz.zoom(POK, world.me[0], KAP.pokaz, W, POK.q ? radius(ms0(POK.q, POK.who)) : 0, view.z)) - view.z) * Math.min(1, dt * (POK.q ? 4 : 1.5)); // П13: показ нового существа — камера отходит, пока оно не целиком в кадре // клетка на экране не мельче min_px в радиусе
  const t = les.vkl() || !ZON.zona ? TINT[world.biome(view.x, view.y)] : zn.voda(ZON, KAP.zona, TINT[world.biome(view.x, view.y)]); // Ш40: зона видна цветом воды
  for (let i = 0; i < 3; i++) view.tint[i] += (t[i] - view.tint[i]) * Math.min(1, dt * 0.8);
  { const b = world.me.reduce((q, a) => a.m > q.m ? a : q, world.me[0] || { m: 1 }), sp = world.split(); // размер числом: длина палочки в микрометрах (260 единиц — 10 мкм)
    const um = vh.dlina(KAP.rost, b.m); if (!les.vkl()) for (const h of vh.shag(VEHI, KAP.rost, um, { glotat: world.genes.gulp, bodo: GLAVA === 2 })) setTimeout(() => say(h.tekst, 3500), 1500); const umeet = !!world.genes.gulp, ms = (q, who) => q.m || evo.E.glotat.razmer[who] || 1, KC = KAP.cel; // книга П5–П7 // П51 длина, П54 вехи
    LIN ||= lin.sozdat(KAP.lineyka); for (const who of cel.shag(CEL, world, b, KC, ms, evo.E.glotat.bolshe, umeet, evo.E.glotat.syt, window.kaplyaStarayaTrevoga ? null : q => VKADRE.has(q))) { say(cel.slovoTeper(KC, who, LISTS[who] || zh.SPISKI[who] || (who === 'bodo' ? 'bodos' : who), world.zhivoe), 2200); /* L085: живое сначала убить — не «теперь еда!» (пачка 2, Т3, шарик) */ lin.vspyshka(LIN, who, ...scr(b.x, b.y).map(v => v * innerWidth / W)); }
    { const car = les.vkl() ? LES.car && LES.car.who : GLAVA === 1 ? ((world.bodos || []).some(q => q.car && !q.gone) ? 'bodo' : null) : GL && GL.L && GL.L.car ? GL.L.car.who : null;
      lin.obnovit(LIN, CEL.videl, CEL.eda, b.m, KAP.lineyka, car && CEL.videl[car] != null ? car : null); } // П5, П87: столбик силуэтов у линейки; сверху портрет хозяина главы, если его уже видели
    { const kto = pkz.shag(POK, world, b, { ...KAP.pokaz, radius: Math.max(KAP.pokaz.radius, radius(b.m) * 5) }, cel.SPIS, ms, dt); if (kto && !les.vkl()) say(KAP.pokaz.slovo.replace('{}', (KC.imena[kto] || [kto])[0].toLowerCase()), 3500); } // П13, П84: первое новое существо после хозяина — показ и имя
    { const K = KAP.oblasti, g = obl.gde(world, b, K), zp = window.kaplyaStaroeMiganie ? ZON.zona : (ZON.zona !== ZON.pzona ? (ZON.pzona = ZON.zona, ZON.pT = world.stats.time, ZON.pokaz ?? ZON.zona) : world.stats.time - ZON.pT >= KAP.zona.zaderzhka ? (ZON.pokaz = ZON.zona) : (ZON.pokaz ?? ZON.zona)); ZON.pokaz ??= ZON.zona; window.kaplyaZonaPokaz = zp; const mt = [zp && KAP.zona.metka[zp], /* L137: нижняя строка не мигает «тихая ↔ злая» у границы — ждёт zona.zaderzhka с */ g && K.metka[g], OBL.ten && K.metka.ten, gol.idet(GOL) && KAP.golod.metka].filter(Boolean); if (mt.length) CEL.rostom = mt.join(' · ') + ' · ' + CEL.rostom; } // область видна под строкой цели всё время, пока ты в ней
    if (les.vkl() && LES.car && LES.car.q !== POK.car) { POK.car = LES.car.q; pkz.pokazat(POK, LES.car.q, LES.car.who, KAP.lestnica.pokaz.t, KAP.lestnica.pokaz.derzhat); } // П88: новый царь — камера на 1 с показывает его
    if (les.vkl()) { const K = KAP.lestnica, ev = les.shag(LES, world, b, ms, K); if (ev === 'syela') say(K.slova.syela.replace('{n}', LES.schet), 3000); if (ev === 'ty') say(K.slova.ty, 3000); if (LES.ty && !CEL.stroka.includes('!')) CEL.stroka = K.slova.ty_stroka; // П87: строка цели «Лестницы»
      if (!CEL.stroka.includes('!') && LES.car) { const im = KC.imena[LES.car.who] || [LES.car.who, LES.car.who, LES.car.who]; CEL.stroka = cel.eda(CEL, b, ms(LES.car.q, LES.car.who), evo.E.glotat.bolshe, umeet) ? K.slova.eda : K.slova.rasti.replace('{}', im[0].toLowerCase()); }
      CEL.rostom = K.slova.schet.replace('{n}', LES.schet) + ' · ' + CEL.rostom; }
    if (!les.vkl() && GL && GLAVA >= 2 && GLAVA <= 5) { const K = KAP.glavy; if (GL.n !== GLAVA) GL = glv.nachat(world, GLAVA); if (glv.kroha(GL, world, b, K)) vybor(K[3].vybor, i => { GL.zhdet = false; if (i === 0) { GL.obyatie = true; world.zhilec = true; say(K[3].obyatie, 3500); potolokZapisat('obyatie'); pkz.zhdat(POK, CEL.videl); setTimeout(() => say(KAP.potolok.stupeni[0].posle, 4000), 4000); } else say(K[3].perevarit, 2500); }); // П23, П68: выбор при объятии
      const ev = GL.n === 2 ? (glv.proydena(GL, world, b, K) ? 'proydena' : '') : glv.shag(GL, world, b, K, ms, les.shag); if (ev === 'cel') say(GL.L.car ? K.hozyain.slova.cel.replace('{}', (KC.imena[GL.L.car.who] || [GL.L.car.who])[0].toLowerCase()) : K.hozyain.slova.net, 3500); // П77, П116: после цели — хозяин главы
      if (ev === 'proydena') { const n = GLAVA; glv.sohranit(n + 1); pkz.zhdat(POK, CEL.videl); say(K.proydena.replace('{n}', n), 3500); GLAVA = n + 1; GL = glv.nachat(world, GLAVA); setTimeout(() => say(K[GLAVA] ? K[GLAVA].nazvanie : K.konec, 4000), 3800); }
      let st = glv.stroka(GL, world, b, K); if (GL.faza === 'hozyain' && GL.L.car) { const im = KC.imena[GL.L.car.who] || [GL.L.car.who]; st = cel.eda(CEL, b, ms(GL.L.car.q, GL.L.car.who), evo.E.glotat.bolshe, umeet) ? K.hozyain.slova.eda : K.hozyain.slova.rasti.replace('{}', im[0].toLowerCase()); if (Math.hypot(GL.L.car.q.x - b.x, GL.L.car.q.y - b.y) >= KC.vidno) st += K.hozyain.slova.gde.replace('{}', storona(b, GL.L.car.q)); }
      if (st && !CEL.stroka.includes('!')) CEL.stroka = st; } // П79–П82: главы 3–5
    if (GLAVA === 2 && !world.me.some(a => a.grab)) { const G = KAP.glavy[2], ab = world.amoebas.reduce((q, x) => !q || Math.hypot(x.x - b.x, x.y - b.y) < Math.hypot(q.x - b.x, q.y - b.y) ? x : q, null); // П79: глава 2 «Хищник» — цель амёба
      if (!CEL.stroka.includes('!')) CEL.stroka = ab && cel.eda(CEL, b, ms(ab, 'amoeba'), evo.E.glotat.bolshe, umeet) ? G.eda : ab && Math.hypot(ab.x - b.x, ab.y - b.y) < KC.vidno ? G.rasti : G.ishchi; }
    if (!world.molodoySkazano && b.m >= KAP.bodo.molodoy && (world.bodos || []).some(q => !q.car)) { world.molodoySkazano = true; say(KAP.bodo.slova.molodoy, 3000); } // П78: молодой бодо больше не берёт
    { const B = KAP.bodo, car = (world.bodos || []).find(q => q.car); if (car && umeet && b.m >= car.m * B.prizhat) CEL.stroka = Math.hypot(car.x - b.x, car.y - b.y) >= KC.vidno ? B.slova.daleko.replace('{}', storona(b, car)) : bodo.prizhat(B, car, radius, b) || b.m >= car.m * B.bolshe ? B.slova.eda : B.slova.prizhmi; } // партия 26.11: бодо стал едой, но далеко — строка говорит, где он // П78: «Прижми бодо к комку!», «Бодо теперь еда!»
    { const C = $('dnk'), me = world.me[0]; if (C && me) { const r = devicePixelRatio || 1, W = C.clientWidth, H = C.clientHeight; if (C.width !== Math.round(W * r)) { C.width = Math.round(W * r); C.height = Math.round(H * r); } const kc = $('kcel').getBoundingClientRect(); C.style.top = Math.round((kc.height ? kc.top : innerHeight - 90) - H - 4) + 'px'; const g = C.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, W, H); DNK(g, 0, 0, W, H, me.gn ? me.gn.f : 1, performance.now() / 1000); } } /* Ш3: твой геном вверху; укололи — ступеньки осыпаются */ $('count').textContent = (um < 100 ? um.toFixed(1) : um < 1000 ? String(Math.round(um)) : (um / 1000).toFixed(um < 10000 ? 2 : 1)).replace('.', ',') + (um < 1000 ? ' мкм' : ' мм'); $('kcel').innerHTML = CEL.stroka + '<small>' + CEL.rostom + '</small>'; $('kcel').style.visibility = $('offer').classList.contains('on') ? 'hidden' : ''; } // полоса выбора умения не ложится поверх строки цели
  { const el = $('kchist'), on = !les.vkl() && GLC.ochagi.length && !ended; el.hidden = !on; if (on) { const c = glc.chistota(GLC, KAP.glava); el.firstChild.style.width = Math.round(c * 100) + '%'; el.lastChild.textContent = KAP.glava.slova.polosa.replace('{p}', Math.round(c * 100)).replace('{n}', GLC.ochagi.filter(o => o.sila > 0).length); }
    const A = world.me[0], o = on && A && glc.blizhniy(GLC, A), sk = $('kochag'); if (o && Math.hypot(o.x - A.x, o.y - A.y) > KAP.glava.strelka) { const u = Math.atan2(o.y - A.y, o.x - A.x), R = Math.min(innerWidth, innerHeight) * 0.42, Kk = KAP.glava.strelka_kraj, cx = innerWidth / 2, cy = innerHeight / 2; let px = cx + Math.cos(u) * R, py = cy + Math.sin(u) * R; if (!window.kaplyaStarayaStrelka) { const c = Math.cos(u), s2 = Math.sin(u), tx = c > 0 ? (innerWidth - Kk.bok - cx) / c : c < 0 ? (Kk.bok - cx) / c : 1e9, ty = s2 > 0 ? (innerHeight - Kk.niz - cy) / s2 : s2 < 0 ? (Kk.verh - cy) / s2 : 1e9, t = Math.min(tx, ty); px = cx + c * t; py = cy + s2 * t; } window.kaplyaStrelkaXY = [px, py]; sk.hidden = false; sk.style.transform = `translate(${px}px, ${py}px)`; /* L137 (ui.md п. 11: «☣ плавает по экрану из угла в угол, ложится поверх полосы ДНК»): знак к очагу стоит у края экрана, между верхней полосой и нижними кнопками */ sk.classList.remove('u'); } else if (o && !window.kaplyaStaryjOchag) { const [x, y] = window.zaplyvScr(o.x, o.y); sk.hidden = false; sk.classList.add('u'); sk.dataset.p = KAP.glava.podpis_ochaga; { const [ax, ay] = window.zaplyvScr(A.x, A.y), [ox, oy] = window.zaplyvScr(o.x, o.y), u = !window.kaplyaStarayaPodpisNaKletke && Math.hypot(ax - ox, ay - oy) < KAP.glava.pryatat_blizhe; sk.classList.toggle('vnutri', u); } /* L133: ты у очага — подпись и ☣ не лежат на клетке в бою */ sk.style.transform = `translate(${x}px, ${y}px)`; { const kb = $('kyad'), r = kb && kb.style.display !== 'none' ? kb.getBoundingClientRect() : null; const nad = !window.kaplyaStarayaPodpisOchaga && !!r && r.width > 0 && x + 70 > r.left - 8 && x - 70 < r.right + 8 && y + 46 > r.top - 8 && y - 40 < r.bottom + 28; sk.classList.toggle('nad', nad); if (nad) sk.style.setProperty('--nad', Math.min(-20, r.top - 24 - (y - 16)) + 'px'); } /* L111: подпись не ложится на «Яд» — встаёт над знаком */ { const pol = 62, sd = window.kaplyaStarayaKraiOchaga ? 0 : Math.max(8 + pol - x, Math.min(0, innerWidth - 8 - pol - x)); sk.style.setProperty('--sdvig', sd + 'px'); } /* L127: подпись «Очаг синегнойки» у края экрана сдвигается внутрь, а не обрезается */ } else sk.hidden = true; } /* блок Ц: полоса чистоты и знак к ближнему очагу; L096: у самого очага ☣ встаёт над ним с подписью «Очаг синегнойки» */
  $('eaten').textContent = world.rush > 0.05 && !rost.on(world) ? 'рост ×' + (1 + world.rush).toFixed(1) : 'съедено ' + world.stats.eaten; // серия кусков подряд — рост быстрее
  if (world.readyToSplit() && !world.choice.length && !world.me.some(a => a.grab || a.held > 0) && !$('toast').classList.contains('on')) tell('split', 'Выросла! Коснись — поделишься. Или подожди'); // подсказка ждёт, пока на экране весть: не затирает «Сестра погибла за краем…» (L039)
}

// Вид «как под микроскопом» (тёмное поле): палочки длиной в 2–3 ширины растут в длину, внутри светлое
// облако нуклеоида и зёрна, у полюсов светлые шапочки; жгутики пучком на ходу и врозь на месте;
// кокки — одиночки, пары, цепочки, грозди; амёба с ложноножками, током зёрен, ядром и вакуолью;
// фаг T4 — вытянутая головка, хвост, пластинка и шесть ножек; вдали частицы в расфокусе кольцами.
const BALL = [null, [0.55, 0.48, 0.8], [0.55, 0.95, 0.3]], BRIM = [null, [0.85, 0.8, 1], [0.85, 1, 0.6]]; // не по зубам (сиреневые), съедобное
const ball = (x, y, r, side, seed) => bodies.sphere(x, y, r, BALL[side], BRIM[side], seed);
function paint(time) {
  const pdt = Math.min(0.05, Math.max(0, time - (paint.t ?? time))); paint.t = time; // шаг для плавных состояний рисунка
  VDOH = vd.shag(VDOH, pdt); const VD = vd.sila(VDOH, KAP.vdoh); window.kaplyaVdoh = () => VD; // П13: клетка дышит кусками
  const z = view.z, big = world.biggest();
  bodies.begin(); lod.tel = lod.tochek = 0; lod.ya = world.biggest();
  const znaki = []; // знаки у края кадра для кругов, которые ещё за краем (рисуются после колец)
  const on = (x, y, pad = 80) => x > -pad && x < W + pad && y > -pad && y < H + pad;
  VKADRE.clear(); for (const L of cel.OPASNYE) for (const q of world[L] || []) { const [x, y] = scr(q.x, q.y); if (on(x, y, 0)) VKADRE.add(q); } /* L091: кто из хищников в кадре — тревога только про них */
  for (const g of world.slime) { // тяж слизи: прозрачный гель с налипшими крупинками; в нём плыть вязко
    const [x, y] = scr(g.x, g.y); if (!on(x, y, g.len * z)) continue;
    const ca = Math.cos(g.a), sa = Math.sin(g.a), n = Math.ceil(g.len / 9), mel = g.w * z < KAP.lod.px; // слизь издалека: реже точки и без кромки (лаги на большой клетке)
    for (let i = 0; i <= n; i += mel ? KAP.lod.sliz_shag : 1) {
      const u = (i / n - 0.5) * g.len, v = Math.sin(u / g.len * 6.283 + g.id) * g.w * 0.8 + Math.sin(time * 0.4 + i * 0.3) * 2;
      const px = x + (ca * u - sa * v) * z, py = y + (sa * u + ca * v) * z, edge = 1 - Math.abs(i / n - 0.5) * 2;
      const S = g.nest ? cfg.bdello_nest.look : cfg.slime_look, fade = Math.min(1, edge * 3); // гель прозрачный: внутри едва заметен, видна только граница — тонкая светлая кромка, а не пелена (Роман 25.11: «мутнота… фильтр»)
      glow.put(px, py, g.w * z * S.core, ...(S.color || [0.55, 0.8, 0.95]), S.core_a * fade); // гнездо запятых — ржавая биоплёнка, видна издали (L054)

      if (i % 3 === 0) ink.put(px + Math.sin(i * 7.1) * g.w * 0.5 * z, py + Math.cos(i * 5.3) * g.w * 0.5 * z, 0.8 * z + 0.3, 0.8, 0.9, 1, 0.35);
    }
    if (mel) continue;
    const S = g.nest ? cfg.bdello_nest.look : cfg.slime_look, m = Math.ceil(g.len * z / (g.nest ? Math.min(S.rim_step, S.rim * z * 0.8 + 0.2) : S.rim_step)); // у гнезда кромка внахлёст — сплошная // кромка геля сплошной тонкой линией с двух сторон
    for (let j = 0; j <= m; j++) { const u = (j / m - 0.5) * g.len, v = Math.sin(u / g.len * 6.283 + g.id) * g.w * 0.8 + Math.sin(time * 0.4 + j / m * n * 0.3) * 2, f = Math.min(1, (1 - Math.abs(j / m - 0.5) * 2) * 3);
      for (const sd of [-1, 1]) { const vv = v + sd * g.w * 0.5 * S.core, px = x + (ca * u - sa * vv) * z, py = y + (sa * u + ca * vv) * z, k = sd + 1; // кромка геля сплошной трубкой, а не точками (Роман: пунктир — провал)
        if (j && bodies.seg) bodies.seg(g._p[k], g._p[k + 1], px, py, (S.rim * z + 0.3) * 0.5, S.rim_c || [0.75, 0.92, 1], S.rim_a * f * 0.6); else if (!bodies.seg) ink.put(px, py, S.rim * z + 0.3, ...(S.rim_c || [0.75, 0.92, 1]), S.rim_a * f); g._p = g._p || []; g._p[k] = px; g._p[k + 1] = py; } }
  }
  { const Zc = cfg.zone, wn = world.warning(); // край зоны затягивания: тонкая сплошная линия (точки — язык еды, их не занимаем), еле видна всегда, ярче в полутора радиусах, разгорается только у ближайшей (L030)
    probe.znak = 0; probe.tiho = 0; znaki.length = 0; probe.strelki = [];
    const tihie = world.bells.filter(v => v.shut > 0).map(v => [...world.bell(v), cfg.vortex_r, 'bell', true]); // сжатый колокольчик: вихрь затих на пару секунд, круг не пропадает, а тускнеет (О115)
    for (const zn of [...world.zones(), ...tihie]) { const [wx, wy, R] = zn, [x, y] = scr(wx, wy), Rz = R * z, tiho = !!zn[4];
      const gap = Math.hypot(Math.max(0, -x, x - W), Math.max(0, -y, y - H)) - Rz; // край круга за кадром: на сколько точек экрана
      if (gap > 0) { if (!tiho && gap < Zc.znak * z) { znaki.push([x, y, 1 - gap / (Zc.znak * z), wx, wy]); probe.znak++; } continue; } // круг ещё за краем, но близко: знак у края (О115: «вплыл из-за края кадра»)
      if (tiho) probe.tiho++;
      const d = world.me.reduce((m, a) => Math.min(m, Math.hypot(a.x - wx, a.y - wy)), 1e9), lv = !tiho && wn && wn.zone[0] === wx && wn.zone[1] === wy ? wn.level : 0;
      const al = (tiho ? Zc.far * Zc.tiho : (d < R * 1.5 ? Zc.near : Zc.far) + (Zc.warn - Zc.near) * lv), [cr, cg, cb] = Zc.color, sz = (0.6 + 0.4 * lv) * z + 0.5, n = Math.max(90, Math.ceil(6.283 * Rz / (sz * 0.9))); // точки внахлёст: сплошная линия, не пунктир (L047, Роман 25.11 про амёбу)
      { const M = KAP.mut, [mr, mg, mb] = M.cvet; // книга П7: опасное место — красноватая муть в воде, не круг и не линии
        for (let k = 0; k < M.klubov; k++) { const t = k * 2.399 + time * M.krutit * (k % 2 ? 1 : -1), rr = Rz * M.razmah * Math.sqrt((k + 0.5) / M.klubov);
          glow.put(x + Math.cos(t) * rr, y + Math.sin(t) * rr, Rz * M.klub, mr, mg, mb, (tiho ? M.tiho : M.a + M.trevoga * lv) * (0.8 + 0.2 * Math.sin(time * 1.3 + k))); } }
      if (lv > 0) probe.warn[zn[3]] = (probe.warn[zn[3]] || 0) + 1; } }
  const edgeArrow = (x, y, [cr, cg, cb], al, big = 1) => { // стрелка у края экрана, острием к тому, что за кадром: сплошной треугольник из трубок на тёмной кайме, ниже строки счёта (О116)
    const S = cfg.zone.strelka, [cx, cy] = scr(view.x, view.y), a = Math.atan2(y - cy, x - cx), ux = Math.cos(a), uy = Math.sin(a), m = 34, top = Math.max(m, hudNiz() + S.verh);
    const t = Math.min((ux > 0 ? W - m - cx : m - cx) / (ux || 1e-9), (uy > 0 ? H - m - cy : top - cy) / (uy || 1e-9)), px = cx + ux * t, py = cy + uy * t;
    const L = S.dlina * big, hw = S.shir * big / 2, tx = px + ux * L / 2, ty = py + uy * L / 2, bx = px - ux * L / 2, by = py - uy * L / 2, nx = -uy, ny = ux, [pr, pg, pb] = cfg.zone.podlozhka;
    probe.strelki.push([px * innerWidth / W, py * innerHeight / H, L * innerWidth / W]);
    { const E = KAP.kray, [er, eg, eb] = cr > 0.9 && cg < 0.5 ? E.cvet : [cr, cg, cb], ex = px + ux * E.vynos, ey = py + uy * E.vynos; // книга П9: тёплый свет у края экрана со стороны угрозы, не стрелка
      for (let k = -2; k <= 2; k++) glow.put(ex - uy * k * E.shag * big, ey + ux * k * E.shag * big, E.r * big * (1 - Math.abs(k) * 0.15), er, eg, eb, al * E.a * (1 - Math.abs(k) * 0.2)); } };
  { const S = cfg.zone.strelka; for (const d of derzh) d.t -= pdt; // знак держится S.derzhat с после того, как круг ушёл: у быстрой амёбы он больше не мигает одним кадром (О116)
    for (const [x, y, k, wx, wy] of znaki) { let d = derzh.find(q => Math.hypot(q.wx - wx, q.wy - wy) < S.svyaz); if (!d) derzh.push(d = { wx, wy }); Object.assign(d, { wx, wy, k, t: S.derzhat }); }
    for (let i = derzh.length - 1; i >= 0; i--) if (derzh[i].t <= 0) derzh.splice(i, 1);
    for (const d of derzh) { const [x, y] = scr(d.wx, d.wy); if (on(x, y, -8)) continue; edgeArrow(x, y, cfg.zone.color, (0.35 + 0.45 * d.k) * Math.min(1, d.t / (S.derzhat * 0.5))); } } // круг за краем кадра, но рядом: красная стрелка к нему
  { const wn = world.warning(); if (wn && wn.level > 0) { const [x, y] = scr(wn.zone[0], wn.zone[1]); // источник тревоги за кадром: стрелка у края экрана, острием к нему (L030)
    if (!on(x, y, wn.zone[2] * z - 12)) { probe.edge = (probe.edge || 0) + 1; edgeArrow(x, y, cfg.zone.color, 0.45 + 0.4 * wn.level); } } }
  // Сестра за кадром (Роман 25.11: «они просто уплывают куда-то, исчезают»): камера не ждёт схваченную, заражённую и отставшую,
  // поэтому у края — маленькая стрелка к ней; в беде стрелка красная и крупнее (урок L039).
  probe.sisEdge = 0; for (const a of world.me) { const [x, y] = scr(a.x, a.y); if (on(x, y, -8)) continue; const bad = a.grab || a.held > 0 || a.sick >= 0;
    probe.sisEdge++; edgeArrow(x, y, bad ? [1, 0.35, 0.3] : [CELL[0].r, CELL[0].g, CELL[0].b], bad ? 0.55 + 0.35 * Math.sin(time * 8) ** 2 : 0.45, bad ? 0.8 : 0.55); }
  for (const p of world.slippers) { // туфелька: огромная клетка в ресничках, воронка-рот на боку, поток в рот виден
    const [x, y] = scr(p.x, p.y), L = cfg.slipper_len * z; if (!on(x, y, L)) continue;
    const ux = Math.cos(p.a), uy = Math.sin(p.a), w = L * 0.27;
    const [mx, my] = scr(...world.mouth(p));
    if (!zhitel('slippers', p, x, y, p.a, L, time, z)) vid.slipper({ x, y, a: p.a, L, w, z, time, id: p.id, mx, my, bodies, glow, ink }); // туфля с бороздкой, реснички-волоски, ядро, пузырьки (vid.js)
    for (let k = 0; k < 24; k++) { // поток в воронку: крупинки по спирали к рту
      const f = (time * 0.6 + k / 24) % 1, R = cfg.funnel_r * z * (1 - f), t = k * 2.4 + f * 3;
      glow.put(mx + Math.cos(t) * R, my + Math.sin(t) * R, 1.2 * z + 0.4, 0.8, 0.95, 1, 0.35 * f);
    }
    ink.put(mx, my, cfg.mouth_r * z * 0.8, 0.1, 0.2, 0.18, 0.6);
  }
  for (const v of world.bells) { // сувойка: колокольчик на стебле-пружине, венчик ресничек крутит вихрь
    const [x, y] = scr(v.x, v.y); if (!on(x, y, 200)) continue;
    const r = cfg.bell_r * z, dx = Math.cos(v.dir), dy = Math.sin(v.dir); if (zhitel('bells', v, x, y, v.dir, r, time, z)) { if (v.shut > 0) continue; for (let k = 0; k < 18; k++) { const f = (time * 0.5 + k / 18) % 1, R = cfg.vortex_r * z * (1 - f), t = k * 2.1 - f * 6; glow.put(x + dx * r * 2 + Math.cos(t) * R, y + dy * r * 2 + Math.sin(t) * R, 1.1 * z + 0.4, 0.7, 0.95, 1, 0.3 * f); } continue; }
    const [bx, by, open] = vid.bell({ x, y, dir: v.dir, Ls: cfg.bell_stalk * z, r, shut: v.shut || 0, time, id: v.id, z, ink }); // стебель: сжатие в спираль и развёртка — vid.js
    bodies.sphere(bx, by, r * (0.8 + 0.2 * open), [0.75, 0.9, 0.88], [0.9, 1, 1], v.id, 0.7); // свёрнутый бокал сжат в шарик
    if (v.shut > 0) continue;
    { const cx = bx + dx * r * 0.9, cy = by + dy * r * 0.9, pt = t => [cx + Math.cos(t) * r * 0.8, cy + Math.sin(t) * r * 0.35 * Math.abs(dx) + Math.sin(t) * r * 0.35]; // венец ресничек — сплошное колечко, не бусы (О115)
      if (bodies.seg) { probe.venec = 'trubka'; for (let k = 0; k < 24; k++) { const t0 = k / 24 * 6.283 + time * 6, t1 = (k + 1) / 24 * 6.283 + time * 6; bodies.seg(...pt(t0), ...pt(t1), 0.45 * z + 0.15, [0.85, 1, 0.95], 0.6); } }
      else { probe.venec = 'busy'; for (let k = 0; k < 20; k++) ink.put(...pt(k / 20 * 6.283 + time * 6), 0.9 * z + 0.3, 0.85, 1, 0.95, 0.6); } }
    for (let k = 0; k < 18; k++) { const f = (time * 0.5 + k / 18) % 1, R = cfg.vortex_r * z * (1 - f), t = k * 2.1 - f * 6;
      glow.put(bx + Math.cos(t) * R, by + Math.sin(t) * R, 1.1 * z + 0.4, 0.7, 0.95, 1, 0.3 * f); } // вихрь
  }
  for (const q of world.rotis) { // коловратка: прозрачная «ваза» на телескопической ноге, на голове два колеса ресничек, внутри жуют челюсти
    const [x, y] = scr(q.x, q.y), L = cfg.roti_len * z; if (!on(x, y, L)) continue;
    if (zhitel('rotis', q, x, y, q.a, L, time, z)) { const pw = world.wheels(q), [mx, my] = scr(...world.head(q)); for (let k = 0; k < 30; k++) { const ph = time * (0.3 + 0.6 * pw) + k / 30, f = ph % 1, R = cfg.roti_r * z * (1 - f), t = q.a + ((k * 2.399 + Math.floor(ph) * 1.7) % 2.4 - 1.2); glow.put(mx + Math.cos(t) * R, my + Math.sin(t) * R, 1.3 * z + 0.4, 0.8, 0.95, 1, (0.1 + 0.35 * pw) * f); } continue; }
    const pw = world.wheels(q), sway = q.sit ? Math.sin(time * 1.1 + q.id) * 0.12 : Math.sin(time * 2 + q.id) * 0.05;
    const ux = Math.cos(q.a), uy = Math.sin(q.a), a = q.a + sway, vx = Math.cos(a), vy = Math.sin(a), w = L * 0.17;
    const skin = [0.78, 0.9, 0.95];
    for (let k = 0; k < 3; k++) { // нога: три вдвигающихся сегмента, на конце два пальца
      const f = 0.1 + k * 0.12, s = 1 - k * 0.25;
      bodies.shell(x - ux * L * f, y - uy * L * f, q.a, L * 0.16, w * 0.42 * s, skin, q.id + k);
    }
    for (const s of [-1, 1]) bodies.shell(x - ux * L * 0.5 + uy * s * w * 0.16, y - uy * L * 0.5 - ux * s * w * 0.16, q.a + s * 0.35, L * 0.05, w * 0.12, skin, q.id + 5);
    const tx = x + vx * L * 0.2, ty = y + vy * L * 0.2;
    bodies.shell(tx, ty, a, L * 0.24, w, skin, q.id, Math.sin(time * 0.9 + q.id) * w * 0.15); // туловище
    bodies.sphere(tx - vx * L * 0.08, ty - vy * L * 0.08, w * 0.5, [0.85, 0.65, 0.3], [1, 0.85, 0.5], q.id, 0.6); // желудок: съеденное
    for (let k = 0; k < 5; k++) bodies.sphere(tx - vx * L * (0.04 + k * 0.03) + vy * Math.sin(k * 2.3) * w * 0.3, ty - vy * L * (0.04 + k * 0.03) - vx * Math.sin(k * 2.3) * w * 0.3, 1.3 * z + 0.4, [0.4, 0.9, 0.3], [0.7, 1, 0.6], (q.id || 1) * 7 + k); // зелёные съеденные водоросли — объёмные комочки в желудке, не плоские точки
    vid.roti({ tx, ty, vx, vy, L, w, pw, time, id: q.id, z, glow, ink, bite: q.bite || 0 }); // венец, зубцы панциря, кишка и челюсти — vid.js
    const [mx, my] = scr(...world.head(q));
    for (let k = 0; k < 30; k++) { // поток в рот: крупинки прямо к голове, гуще и быстрее на полной силе
      const ph = time * (0.3 + 0.6 * pw) + k / 30, f = ph % 1, R = cfg.roti_r * z * (1 - f), t = q.a + ((k * 2.399 + Math.floor(ph) * 1.7) % 2.4 - 1.2);
      glow.put(mx + Math.cos(t) * R, my + Math.sin(t) * R, 1.3 * z + 0.4, 0.8, 0.95, 1, (0.1 + 0.35 * pw) * f);
    }
  }
  for (const p of world.plants) { // водоросль-нить: цепочка клеток, внутри зелёные хлоропласты
    const [x, y] = scr(p.x, p.y); if (!on(x, y, 220)) continue;
    const r = radius(p.m) * z, a0 = p.id * 1.7;
    glow.put(x, y, r * 3.2, 1, 0.85, 0.45, 0.11 + 0.03 * Math.sin(time * 0.8 + p.id)); // ореол: водоросль кормит сахаром вокруг себя
    if (ZAP.plants && (r * ZH.plants.tolshchina < KAP.lod.px || p.m < lod.ya * KAP.lod.dolya)) { const a = p.id * 1.7, L = r * KAP.lod.nit; lod.tochek++; bodies.seg(x - Math.cos(a) * L, y - Math.sin(a) * L, x + Math.cos(a) * L, y + Math.sin(a) * L, Math.max(0.8, r * ZH.plants.tolshchina), [0.45, 0.85, 0.35], 0.8); continue; } // нить издалека: одна зелёная чёрточка, не бусины
    if (ZAP.plants) { const Z = ZAP.plants, G = KAP.nit, n = G.n[0] + p.id % (G.n[1] - G.n[0] + 1), a = p.id * 1.7 + Math.sin(time * 0.5 + p.id) * 0.08, t = r * ZH.plants.tolshchina; // анабена записью движка: нить бусин, посередине гетероциста
      sobrat_gruppu({ ...Z, gruppa: { ...VC.vidy.anabena.gruppa, n: n | 1 } }, { x, y, a, tolshchina: t, z, time, id: p.id, beg: 0 }, bodies);
      if (VC.vidy.geterocista) sobrat(VC.vidy.geterocista, { x, y, a, tolshchina: t * G.geterocista, z, time, id: p.id + 5, beg: 0 }, bodies); continue; }
    for (let k = -2; k <= 2; k++) {
      const a = a0 + Math.sin(time * 0.5 + k * 0.6 + p.id) * 0.12, cx = x + Math.cos(a) * k * r * 0.72, cy = y + Math.sin(a) * k * r * 0.72;
      const het = k === (p.id % 3) - 1; // гетероциста: крупнее и бледнее, ловит азот воздуха
      bodies.rod(cx, cy, a, r * (het ? 0.44 : 0.4), r * (het ? 0.4 : 0.34), 0, het ? [0.85, 0.95, 0.7] : [0.5, 0.95, 0.35], het ? [0.7, 0.8, 0.5] : [0.25, 0.65, 0.18], p.id * 7 + k);
      if (!het) ink.put(cx, cy, r * 0.17, 0.35, 0.85, 0.3, 0.6);
    }
  }
  for (const k of world.crumbs) { // детрит: бурый рыхлый комок отмершего растения, на нём колонии
    const [x, y] = scr(k.x, k.y); if (!on(x, y, 120)) continue;
    const r = radius(k.m) * z;
    if (ZAP.crumbs) { const D = KAP.komok, n = D.n[0] + k.id % (D.n[1] - D.n[0] + 1); // детрит записью движка: 3–5 бурых кусков внахлёст
      for (let i = 0; i < n; i++) { const t = i * 2.4 + k.id, d = i ? r * D.razbros : 0; zhitel('crumbs', { id: k.id * 7 + i }, x + Math.cos(t) * d, y + Math.sin(t) * d, k.id * 1.3 + i * 1.9, r * (i ? D.melkie : 1), time, z); } continue; }
    for (let i = 0; i < 6; i++) {
      const t = i * 2.4 + k.id, d = i ? r * 0.45 * (0.6 + 0.4 * ((i * 0.37) % 1)) : 0;
      bodies.sphere(x + Math.cos(t) * d, y + Math.sin(t) * d, r * (i ? 0.42 : 0.55), [0.42, 0.28, 0.16], [0.75, 0.55, 0.35], k.id + i, 0.6);
    }
    for (let i = 0; i < 10; i++) { const t = i * 0.628 + k.id, d = r * (0.55 + 0.2 * Math.sin(i * 1.7 + time * 0.3)); ink.put(x + Math.cos(t) * d, y + Math.sin(t) * d, 1.1 * z + 0.4, 0.95, 0.85, 0.6, 0.55); }
  }
  for (const q of world.prey) { // кокки — соседи-соперники, сиреневые; с токсином зеленеют: касание их убьёт
    const [x, y] = scr(q.x, q.y); if (!on(x, y)) continue;
    const side = 1, r = radius(q.m) * z, kind = q.id % 4, a = q.a + time * 0.2;
    if (q.touch > 0) { probe.poison = (probe.poison || 0) + 1; const k = Math.min(1, q.touch / KAP.boj.celi.kokk.shchipok_t); // прижалась к кокку — вокруг него проступает его яд, к «щипку» облачко полное
      const O = KAP.boj.celi.kokk.oblako; for (let i = 0; i < O.kluby; i++) { const f = (time * 0.7 + i / O.kluby) % 1, t = i * 6.283 / O.kluby + q.id + time * 0.3, d = r * (0.8 + f * (0.7 + O.razmah * k)); /* пачка 1 п. 2: облако заметное */ // яд сочится мягкими клубами наружу и тает, без точек по кругу (L047)
        glow.put(x + Math.cos(t) * d, y + Math.sin(t) * d, r * (0.55 + 0.7 * f) + 2, 0.75, 0.95, 0.3, (O.a0 + (O.a - O.a0) * k) * (1 - f)); } }
    const ux = Math.cos(a), uy = Math.sin(a); if (zhitel('prey', q, x, y, a, r, time, z)) continue;
    if (kind === 0) ball(x, y, r * 0.9, side, q.id); // одиночный кокк: гладкий шарик, шипов у кокков нет (Роман 25.11: шипастый «похож на вирус»)
    else if (kind === 1) { ball(x + ux * r * 0.45, y + uy * r * 0.45, r * 0.6, side, q.id); ball(x - ux * r * 0.45, y - uy * r * 0.45, r * 0.6, side, q.id + 1); }
    else if (kind === 2) for (let k = -1.5; k <= 1.5; k++) { // цепочка
      const w = Math.sin(time * 1.5 + k + q.id) * r * 0.15;
      ball(x + ux * k * r * 0.55 - uy * w, y + uy * k * r * 0.55 + ux * w, r * 0.4, side, q.id + k);
    } else for (let k = 0; k < 5; k++) { const t = k * 1.2566 + q.id, d = k ? r * 0.42 : 0; ball(x + Math.cos(t) * d, y + Math.sin(t) * d, r * 0.43, side, q.id + k); } // гроздь
  }
  for (const d of world.donors) { // сородич с плазмидой: золотистая палочка, внутри светится колечко ДНК
    const [x, y] = scr(d.x, d.y); if (!on(x, y)) continue;
    const w = 7 * z;
    if (d.held > 0) { bodies.sphere(x, y, w * 1.4, [1, 0.88, 0.55], [1, 0.5, 0.3], d.id); glow.put(x, y, w * 3, 1, 0.3, 0.1, 0.15); continue; }
    if (zhitel('donors', d, x, y, d.a, w, time, z)) { if (d.to) { const [tx, ty] = scr(d.to.x, d.to.y), f = Math.min(1, d.link / cfg.conj); bodies.seg(x, y, x + (tx - x) * f, y + (ty - y) * f, 1.2 * z + 0.4, [1, 0.95, 0.7], 0.8); } continue; } // соседка записью движка; пиля-мостик сплошной трубкой
    bodies.rod(x, y, d.a, w * 2.1, w, 0, [1, 0.88, 0.55], [0.85, 0.6, 0.25], d.id, Math.sin(time * 1.5 + d.id) * w * 0.15);
    if (!(d.held > 0)) { const pr = 1.1 * z + 0.4, np = Math.max(14, Math.ceil(6.283 * w * 0.45 / (pr * 0.8))); for (let k = 0; k < np; k++) { const t = k / np * 6.283 + time * 0.8; glow.put(x + Math.cos(t) * w * 0.45, y + Math.sin(t) * w * 0.45, pr, 1, 0.95, 0.6, 0.7 * 14 / np); } } // плазмида: точки внахлёст — сплошное колечко, не бусы (L047)
    if (d.to) { const [tx, ty] = scr(d.to.x, d.to.y), f = Math.min(1, d.link / cfg.conj); // пиля-мостик тянется, по нему бежит ДНК
      const br = 1.2 * z + 0.4, nb = Math.max(14, Math.ceil(Math.hypot(tx - x, ty - y) * f / (br * 0.8))); for (let k = 0; k <= nb; k++) { const u = k / nb * f; ink.put(x + (tx - x) * u, y + (ty - y) * u, br, 1, 0.95, 0.6, 0.8); } // мостик сплошной нитью: шаг меньше точки (L047)
      glow.put(x + (tx - x) * ((time * 2) % 1) * f, y + (ty - y) * ((time * 2) % 1) * f, 3 * z, 1, 0.9, 0.5, 0.6); }
  }
  for (const q of world.pseudos) { const [x, y] = scr(q.x, q.y); if (on(x, y) && !(!(q.held > 0) && zhitel('pseudos', q, x, y, q.a, 7 * z, time, z))) dv.risuy(q, { x, y, z, time, bodies, glow }); } // палочки из анкет (vidy.json): тело, цепочка, цвет-метка, жгутики
  for (const e of world.events) if (e[0] === 'split') vid.splitAt(e[3], e[4]); // деление касанием случилось между шагами: рисуем его с первого же кадра, а не после шага
  svi.risovat(world, KAP.svet_il, view, scr, z, glow, time); fx.drawUnder({ scr, z, time, glow, ink }); mut.drawWorld({ w: world, scr, z, glow, ink, kids }); // пузырьки-обманки
  for (const b of world.bdellos) { // бделловибрион: запятая вдвое мельче тебя, один толстый жгутик; на рывке — след
    const [x, y] = scr(b.x, b.y); if (!on(x, y) && !b.aim) continue; // целится из-за кадра — линия прицела всё равно видна
    const w = 4.2 * z, sp = Math.hypot(b.vx, b.vy), ang = b.a, ux = Math.cos(ang), uy = Math.sin(ang);
    if (!zhitel('bdellos', b, x, y, ang, w, time, z)) bodies.rod(x, y, ang, w * 1.5, w, 0, cfg.danger.bdello, [0.75, 0.12, 0.08], b.id, w * 0.35); // слегка изогнутая запятая
    glow.put(x, y, w * 4, 1, 0.3, 0.1, 0.12 + (b.on ? 0.1 * Math.sin(time * 16) : 0));
    if (b.aim) { const [cr, cg, cb] = cfg.zone.color, [tx, ty] = scr(b.aim.x, b.aim.y), L = Math.hypot(tx - x, ty - y); probe.warn.bdello = (probe.warn.bdello || 0) + 1; // выбрала тебя: светится и тянет тонкую линию прицела к клетке (L030)
      glow.put(x, y, w * 6, cr, cg, cb, 0.35 + 0.2 * Math.sin(time * 12));
      const rr = 0.8 * z + 0.5, st = rr * 0.8; for (let d = 8; d < L; d += st) { const u = d / L, pu = 0.55 + 0.45 * Math.sin(d / 7 - time * 14); ink.put(x + (tx - x) * u, y + (ty - y) * u, rr, cr, cg, cb, 0.32 * pu * (1 - u * 0.5)); glow.put(x + (tx - x) * u, y + (ty - y) * u, rr * 2.2, cr, cg, cb, 0.05 * pu); } } // сплошная светящаяся нить, по ней к тебе бегут волны яркости (Роман: пунктир — халтура)
    for (let k = 1; k <= 22; k++) { const s = k / 22, wv = Math.sin(s * 9 - time * 30) * w * 0.5 * s;
      glow.put(x - ux * (w * 1.5 + s * w * 6) - uy * wv, y - uy * (w * 1.5 + s * w * 6) + ux * wv, 1.1 * Math.max(z, 0.7), 1, 0.55, 0.3, 0.6 * (1 - s * 0.6)); }
    if (sp > 150) for (let k = 1; k <= 8; k++) ink.put(x - b.vx * 0.012 * k * z, y - b.vy * 0.012 * k * z, w * (1 - k / 10), 1, 0.4, 0.2, 0.18 * (1 - k / 9)); // рывок
  }
  for (const m of world.amoebas) {
    const [x, y] = scr(m.x, m.y); if (!on(x, y, 320)) continue;
    const side = m.m < big * 0.8 ? 2 : 1, r = radius(m.m) * z, sp = Math.hypot(m.vx, m.vy);
    const head = sp > 3 ? Math.atan2(m.vy, m.vx) : m.id, hx = Math.cos(head), hy = Math.sin(head);
    if (!zhitel('amoebas', m, x, y, head, r, time, z)) vid.amoeba({ m, x, y, r, head, sp, side, time, z, glow, ink, bubbles, col: side === 2 ? BALL[2] : null });
    const O = m.ohv, V = KAP.ameba.vid, me = world.me[0]; if (O && me && ['vyrost', 'prilip'].includes(O.faza) && O.dl > 0) for (let i = 1; i <= V.dolek; i++) { const u = i / V.dolek, d = radius(m.m) * 0.8 + O.dl * u; /* вырост: доли её же тела тянутся к тебе */
      const [lx, ly] = scr(m.x + Math.cos(O.ug) * d, m.y + Math.sin(O.ug) * d); zhitel('amoebas', { id: m.id * 7 + i, m: m.m }, lx, ly, O.ug, r * (V.r0 + (V.r1 - V.r0) * u), time, z); }
    if (O && me && O.faza === 'chasha') { const b = Math.atan2(m.y - me.y, m.x - me.x), Ra = radius(me.m); for (let j = 0; j < V.chasha_dolek; j++) { const s = j % 2 ? 1 : -1, u = b + s * Math.PI * 0.95 * (O.f || 0) * (1 + Math.floor(j / 2)) / Math.ceil(V.chasha_dolek / 2); /* чаша: края обходят тебя с двух сторон */
      const [lx, ly] = scr(me.x + Math.cos(u) * Ra * 1.15, me.y + Math.sin(u) * Ra * 1.15); zhitel('amoebas', { id: m.id * 11 + j, m: m.m }, lx, ly, u + Math.PI / 2, r * V.r1 * 1.4, time, z); } }
  }
  { const me = world.me.reduce((q, a) => a.m > q.m ? a : q, world.me[0] || { m: 1 }), umeet = !!world.genes.gulp, sv = KAP.cel.svet; // П7: можно съесть — тёплый свет, который медленно дышит
    if (umeet) for (const [list, who] of cel.SPIS) for (const q of world[list] || []) { const m = q.m || evo.E.glotat.razmer[who] || 1; if (q.gone || !cel.eda(CEL, me, m, evo.E.glotat.bolshe, umeet)) continue;
      const [x, y] = scr(q.x, q.y); if (!on(x, y, 40)) continue; glow.put(x, y, radius(m) * z * 1.7 + 4, ...sv, 0.12 + 0.07 * Math.sin(time * 2.5 + (q.id || 0))); } }
  for (const [k, list] of Object.entries(zh.SPISKI)) for (const q of world[list] || []) { const [x, y] = scr(q.x, q.y), r = radius(q.m) * z; if (!on(x, y, r * 4)) continue; // жители книги: тела — записи конструктора
    { const N = KAP.novye[k], me = world.me[0], Mz = KAP.mut_krupnyh; if (N && N.povadka && N.povadka !== 'ryvki' && me && me.m * N.bolshe <= q.m && !(q.syt > 0)) { const ux = Math.cos(q.a), uy = Math.sin(q.a), zam = q.faza === 'zamah' ? Math.min(1, q.t / N.ryvok.zamah) : 0; // П7: может убить тебя — красноватая муть у рта (у потока — вокруг), замах — клин дрожащей воды на длину рывка
      if (N.povadka === 'potok') glow.put(x, y, (r + N.potok.r * z) * Mz.potok, ...Mz.cvet, Mz.a * (0.8 + 0.2 * Math.sin(time * 2 + q.id)));
      else { glow.put(x + ux * r * 1.15, y + uy * r * 1.15, r * Mz.rot, ...Mz.cvet, Mz.a + Mz.zamah * zam); if (zam) { const dl = N.ryvok.v * N.ryvok.t * z; for (let i = 1; i <= Mz.klin; i++) { const u = i / Mz.klin, dr = Math.sin(time * 40 + i * 2) * r * 0.05; glow.put(x + ux * (r + dl * u) - uy * dr, y + uy * (r + dl * u) + ux * dr, r * 0.35 * (1 - u * 0.5), ...Mz.cvet, Mz.zamah * zam * (1 - u * 0.4)); } } } } }
    if (q.dom) { const [dx, dy] = scr(q.dom.x, q.dom.y); bodies.seg(x, y, x + (dx - x) * 0.5, y + (dy - y) * 0.5, 0.5 * z + 0.3, [0.85, 0.8, 0.6], 0.7); } // стебелёк к комку
    zhitel(list, q, x, y, q.a + (q.kach || 0), r, time, z); }
  for (const b of world.bodos || []) { const B = KAP.bodo, L = bodo.dlina(B, b.m) * z, [x, y] = scr(b.x, b.y); if (!on(x, y, L * 4)) continue; // бодо: фасолина, два жгутика, задний держит у комка
    const ux = Math.cos(b.a), uy = Math.sin(b.a), [dx, dy] = scr(b.dom.x, b.dom.y), zam = b.faza === 'zamah' ? b.t / B.ryvok.zamah : 0, me = world.me[0];
    if (me && me.m * B.bolshe <= b.m && !b.syt) { const [mx, my] = scr(bodo.rot(B, b).x, bodo.rot(B, b).y); glow.put(mx + ux * L * 0.8, my + uy * L * 0.8, L * 1.3, 1, 0.35, 0.25, 0.1); } // П7: может съесть тебя — красноватая муть перед ртом
    for (let k = 0; k < 10; k++) { const u0 = k / 10, u1 = (k + 1) / 10, w0 = Math.sin(u0 * 9 - time * 6) * L * 0.08, w1 = Math.sin(u1 * 9 - time * 6) * L * 0.08, ax0 = x - ux * L + (dx - x + ux * L) * u0, ay0 = y - uy * L + (dy - y + uy * L) * u0, ax1 = x - ux * L + (dx - x + ux * L) * u1, ay1 = y - uy * L + (dy - y + uy * L) * u1;
      bodies.seg(ax0 - uy * w0, ay0 + ux * w0, ax1 - uy * w1, ay1 + ux * w1, 0.6 * z + 0.3, B.cvet, 0.7); } // задний жгутик-привязь до комка
    for (let k = 0; k < 8; k++) { const u0 = k / 8, u1 = (k + 1) / 8, s = Math.sin(time * 14 + b.id), w0 = Math.sin(u0 * 5 + time * 12) * L * 0.25 * u0, w1 = Math.sin(u1 * 5 + time * 12) * L * 0.25 * u1;
      bodies.seg(x + ux * L * (1 + u0 * 0.9) - uy * w0, y + uy * L * (1 + u0 * 0.9) + ux * w0, x + ux * L * (1 + u1 * 0.9) - uy * w1, y + uy * L * (1 + u1 * 0.9) + ux * w1, 0.5 * z + 0.3, B.cvet, 0.6); } // передний жгутик бьёт
    if (!zhitel('bodos', b, x, y, b.a, L * 2, time, z)) { bodies.rod(x, y, b.a, L, L * 0.55, 0, B.cvet, B.yadro, b.id, L * 0.18 + zam * L * 0.15); bodies.sphere(x - ux * L * 0.2, y - uy * L * 0.2, L * 0.28, B.yadro, B.cvet, b.id + 1, 0.6, 0.7); }
    if (b.syt > 0) bodies.sphere(x + ux * L * 0.25, y + uy * L * 0.25, L * 0.22, [0.35, 0.25, 0.2], [0.5, 0.4, 0.3], b.id + 2, 0.6, 0.8); // пузырёк: в нём тает добыча, рот сомкнут
    if (zam > 0) glow.put(x + ux * L, y + uy * L, L * (0.3 + 0.3 * zam), ...B.nos, 0.25 + 0.4 * zam); } // замах: нос наливается красным
  const [cr, cg, cb] = [CELL[0].r, CELL[0].g, CELL[0].b], fc = cfg.flag.color;
  const b = genome.blink, lkAll = look(b && Math.sin(time * 9) > 0 ? { ...world.genes, [b]: !world.genes[b] } : world.genes, cfg.look, world.spacers.size); // на паузе мигает часть клетки, которую меняет выбранный ген
  if (kids) kids.forEach((a, i) => { a.x = view.x + (i ? 1 : -1) * W * 0.24 / z; a.y = view.y - 20 / z; a.a = -Math.PI / 2 + Math.sin(time * 0.8 + i * 2) * 0.12; a.m = 1.7 + 0.1 * Math.sin(time * 1.3 + i); }); // дочки покачиваются на месте
  const phageNear = world.phages.some(g => g.host === 'me' && Math.hypot(g.x - view.x, g.y - view.y) < 220);
  const foodNear = world.food.some(f => Math.hypot(f.x - view.x, f.y - view.y) < 120);
  for (const q of KUS.celi) { const [x, y] = scr(q.x, q.y), r = radius(q.m || 1) * z, n = q.mesta.length; q.mesta.forEach((h, i) => { if (h >= 1) return; const u = (q.a || 0) + (i + 0.5) / n * 6.2832; ink.put(x + Math.cos(u) * r * 0.9, y + Math.sin(u) * r * 0.9, r * 0.28 * (1.2 - h), 0.12, 0.06, 0.08, 0.75 * (1 - h)); }); } /* Ш38: место укуса темнеет */
  { const V = svr.vid(SVR, radius), K = KAP.sverlo.spiral; if (V) { const [x, y] = scr(V.x, V.y), r = V.r * z, n = K.n; for (let i = 0; i < n; i++) { const u = i / n, t = u * 9 + time * 3, rr = r * (0.3 + 0.6 * u); ink.put(x + Math.cos(t) * rr, y + Math.sin(t) * rr, (2 + 2 * (1 - u)) * Math.max(1, z * 0.6), ...K.cvet, K.a * (V.vhod != null ? Math.min(1, V.vhod / KAP.sverlo.vhod) : 1)); } } } /* Ш39: внутри жертвы тёмная спиралька */
  { const A = world.me[0], Ks = KAP.staya; const stK = !!window.kaplyaStaryeKopii, rMin = A && !stK ? radius(A.m) * Ks.vid_min : 0; (world.staya || []).forEach((q, i) => { const [x, y] = scr(q.x, q.y), r = Math.max(radius(q.m), rMin) * z; /* L136: копия видна клеткой, а не пылинкой */ if (A) window.kaplyaKopiyaR = r / (radius(A.m) * z); q.daleko = i >= Ks.polno; if (!on(x, y, r * 3)) return; zhitel('staya', q, x, y, q.a, r, time, z); const M = KAP.mutaciya; if (KOL.most && KOL.most.q === q && A) { const [ax, ay] = scr(A.x, A.y), c = q.mut ? M.spisok[q.mut].cvet : [0.85, 0.95, 1]; for (let j = 1; j < 12; j++) { const u = j / 12, f = (u + time * 1.5) % 1; glow.put(ax + (x - ax) * u, ay + (y - ay) * u, r * (0.35 + 0.25 * Math.sin(f * 6.283)), ...c, 0.45); } } /* Е.3 п. 10: мост перелива */ if (q.mut && M.chast[q.mut] && q.mt >= M.otrast * 0.25) { const t = r * ZH.staya.tolshchina; chasti_navykov({ [M.chast[q.mut]]: 1 }, { x, y, a: q.a, R: t, L: 2 * t * PROP_YA, z: 1, time, id: q.id, beg: 0 }, bodies); } /* Е.3 п. 6: у мутантки растёт настоящая часть гена (та же, что у тебя на теле) */ if (q.mut) { const f = 0.25 + 0.75 * q.mt / M.otrast; glow.put(x, y, r * (1.3 + 0.7 * f), ...M.spisok[q.mut].cvet, M.metka * f); if (!stK) { const g = Math.min(1, 0.5 + 0.5 * q.mt / M.otrast), c = M.spisok[q.mut].cvet; glow.put(x, y, r * Ks.mut_obod * 1.15, ...c, 0.28 * g); luk(glow, x, y, r * Ks.mut_obod, 0, 6.2832, Math.max(1, r * 0.14), c, 0.4 * g); glow.put(x, y, r * 0.7, ...c, 0.3 * g); window.kaplyaMutObod = (window.kaplyaMutObod || 0) + 1; } } /* L136: мутантка видна на теле — цветная оболочка и свет внутри с первой секунды */ if (q.bol != null) glow.put(x, y, r * 1.8, ...KAP.virus_znak.cvet, 0.5); if (q.otskokT != null && MUT.t - q.otskokT < M.otskok.t) glow.put(x, y, r * 2.2, ...M.spisok[M.zamok].cvet, 0.35 * (1 - (MUT.t - q.otskokT) / M.otskok.t)); }); /* Ш34: метка мутации отрастает; Ш35: больная мутнеет серым */ // Ш33: малышки стаи — твоя же запись, мельче
    const P = A && sty.kaplya(STY, A, Ks, STY.polu = Ks.korma * KAP.stolk.igrok.w * A.m ** KAP.stolk.igrok.stepen); if (P) { const [x0, y0] = scr(P.x0, P.y0), [x, y] = scr(P.x, P.y), r = P.r * z; if (bodies.seg) bodies.seg(x0, y0, x, y, Math.max(0.6, r * 1.1 * P.sheya), Ks.obolochka, 0.85); zhitel('staya', { id: -7, m: STY.pochka.m }, x, y, P.ug, r, time, z); } } // Ш32: капля тянет оболочку перетяжкой и рвётся
  { const A = world.me[0], Ks = KAP.staya, C = Ks.kolco; if (A && C && !les.vkl()) { const [x, y] = scr(A.x, A.y), r = radius(A.m) * z * C.r, f = sty.dolya(STY, Ks, A), n = C.tochek; /* Е.3 п. 1–2: кольцо порции до деления под тобой и темп рода */
    luk(glow, x, y, r, -Math.PI / 2, 6.2832, C.tochka * Math.max(1, z * 0.5), C.cvet, C.a, f, C.cvet, C.a_fon, n); /* L129 */
    const L = $('kstT') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'kstT' }); if (!L.style.position) Object.assign(L.style, { position: 'fixed', zIndex: '3', pointerEvents: 'none', font: '12px -apple-system, system-ui, sans-serif', color: 'rgba(200,225,255,0.85)', textShadow: '0 1px 3px #000', transform: 'translate(-50%, 0)' });
    const Ps = KAP.staya.podpis, st = !!window.kaplyaStaryeStroki, tx = STY.polna ? (st ? 'стая полная' : Ps.polna) : STY.T != null ? (st ? `каждые ${Math.round(STY.T)} с` : Ps.temp.replace('{}', Math.round(STY.T))) : ''; L.classList.toggle('plashka', !st); if (L.textContent !== tx) L.textContent = tx; const k = innerWidth / W; if (window.kaplyaStaryTempNaKletke) { L.style.left = x * k + 'px'; L.style.top = (y + r) * k + 12 + 'px'; } else { L.style.left = '50%'; L.style.top = 'auto'; L.style.bottom = KAP.staya.podpis_niz; } /* L103: не на плашке сверху — над строкой цели внизу */ /* L093: темп рода — у полосок сверху, а не под клеткой (повтор bac846d) */ L.style.display = paused || ended ? 'none' : ''; } }
  for (const a of world.me) if (a.spore > 0) { // сон-персистер: та же палочка, но погасшая — серая, жгутики обвисли, редкое «дыхание»; перед пробуждением теплеет
    const [x, y] = scr(a.x, a.y); vid.sleeper({ a, x, y, z, time, cfg, bodies, glow, ink });
  }
  for (const a of world.me) { const R = radius(a.m) * z, [x, y] = scr(a.x, a.y); // П19: облако общих соков — тёплая дымка вокруг клетки; П18: присоска — свет в месте касания, он бледнеет
    if (a.soki >= KAP.sposoby.soki.zhdat) glow.put(x, y, R * KAP.sposoby.soki.r, 1, 0.85, 0.55, 0.1 + 0.04 * Math.sin(time * 3));
    if (a.pris && a.pris.t >= KAP.sposoby.prisoska.prilip) { const q = a.pris.q, [qx, qy] = scr(q.x, q.y), k = R / (Math.hypot(qx - x, qy - y) || 1); glow.put(x + (qx - x) * k, y + (qy - y) * k, R * 0.6, 1, 0.9, 0.7, 0.3); glow.put(qx, qy, radius(ms0(q, a.pris.who)) * z, 0.9, 0.92, 0.95, 0.18 * (q.bled || 0)); } }
  for (const a of world.me) { const n = umn.nuh(world, a, KAP.umeniya, radius); if (!n) continue; const K = KAP.umeniya.nuh, R = radius(a.m) * z, [x, y] = scr(a.x, a.y), c = Math.cos(n.ugol), s = Math.sin(n.ugol), L = R * K.razmer * (0.5 + 0.5 * n.sila);
    bodies.seg(x + c * R * 0.85, y + s * R * 0.85, x + c * (R * 0.85 + L), y + s * (R * 0.85 + L), L * 0.9 + 1, K.cvet, K.a); } // П65: шапка «Нюха» на носу смотрит на самую густую еду
  for (const q of SEM) { const [x, y] = scr(q.x, q.y), K = KAP.semena, R = K.r * z * 0.6 + 3, h = geneColor(q.g).replace('#', ''), c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255 || 0.6), fade = Math.min(1, (K.t - q.t) / 0.5);
    glow.put(x, y, R * 3, ...c, 0.35 * fade); if (window.kaplyaStaroeSemya) { bodies.seg(x, y - R * 0.5, x, y + R * 0.5, R * 1.3, c, 0.9 * fade); glow.put(x, y, R * 1.2, 1, 1, 1, 0.25 * fade); } else { bodies.sphere(x, y, R * 0.75, c, c.map(v => Math.min(1, v * 0.6 + 0.45)), 7 + (q.id || 0), 0.9, fade); window.kaplyaSemyaShar = (window.kaplyaSemyaShar || 0) + 1; } } /* L150: семя рода — объёмная капля-шарик со светом, а не плоский прямоугольник (ui.md п. 24) */ // семя рода: малая капсула цвета умения
  if (world.zhilec) for (const a of world.me) { const [x, y] = scr(a.x, a.y), R = radius(a.m) * z; for (let k = 0; k < 3; k++) { const u = k * 2.1 + time * 0.4; glow.put(x + Math.cos(u) * R * 0.35, y + Math.sin(u) * R * 0.35, R * 0.22 + 1, 1, 0.8, 0.3, 0.8); } } // П68: дышащая кроха внутри — золотые зёрна
  for (const CR of [LES.car, GL && GL.L && GL.L.car]) if (CR && !CR.q.gone) { const q = CR.q, L = Math.max(6, radius(ms0(q, CR.who)) * z * 1.2), [x, y] = scr(q.x, q.y), K = KAP.korona; // корона царя капли (П88)
    if (on(x, y, 40)) { const hx = x, hy = y - L * KAP.lestnica.korona_vyshe; for (let k = -1; k <= 1; k++) { const bx = hx + k * L * K.shir; bodies.seg(bx, hy, bx, hy - L * K.zub * (k ? 0.75 : 1), L * K.tolsh + 0.6, K.cvet, 0.95); } bodies.seg(hx - L * K.shir * 1.2, hy, hx + L * K.shir * 1.2, hy, L * K.tolsh * 1.2 + 0.6, K.cvet, 0.95); glow.put(hx, hy, L * 1.4, ...K.cvet, 0.25); } }
  for (const b of world.bodos || []) { if (!b.car) continue; const L = bodo.dlina(KAP.bodo, b.m) * z, [x, y] = scr(b.x, b.y); // корона поверх тела, после всех бодо
    { const K = KAP.korona, hx = x, hy = y - L * K.vyshe; for (let k = -1; k <= 1; k++) { const bx = hx + k * L * K.shir; bodies.seg(bx, hy, bx, hy - L * K.zub * (k ? 0.75 : 1), L * K.tolsh, K.cvet, 0.95); } bodies.seg(hx - L * K.shir * 1.2, hy, hx + L * K.shir * 1.2, hy, L * K.tolsh * 1.2, K.cvet, 0.95); glow.put(hx, hy, L * 0.9, ...K.cvet, 0.18); } // П77: корона хозяина над ним (всегда вверх по экрану), видна издалека
  }
  if (world.trupy) for (const t of world.trupy) { const p = t.q._poza, [x, y] = scr(t.q.x, t.q.y), T = KAP.trup; if (!p) { glow.put(x, y, radius(t.q.m || 1) * z + 2, 0.45 * T.temnee, 0.45 * T.temnee, 0.45 * T.temnee, 0.9); continue; } /* мелкий, что рисовался точкой, — серая точка */ const tl = p.t * z * Math.sqrt(Math.max(0.05, t.q.m / (t.puz ? t.puz.m0 : t.q.m || 1))); if (!on(x, y, tl * 4)) continue; /* Ж.3: убитый — тот же вид, серый и тёмный */
    { const k = t.q.vid && ZAP[t.spisok + ':' + t.q.vid] ? t.spisok + ':' + t.q.vid : t.spisok, Z0 = ZAP[k]; ZAP[k] = seryj(k); zhitel(k, { id: t.q.id || 1, m: t.q.m }, x, y, Number.isFinite(p.a) ? p.a : 0, tl / ZH[k].tolshchina, time, z); ZAP[k] = Z0; } /* тот же житель через zhitel, но запись на кадр — серая */ if (t.puz) glow.put(x, y, tl * T.puzyr[0] * 2, 0.75, 0.9, 1, T.puzyr[1]); }
  bodies.podnyat = window.kaplyaStaryjSloj ? 0 : KAP.sloi.ty; /* L082: ты всегда поверх жителей — не прячешься под анабеной и туфелькой (пачка 2, Т7) */
  for (const a of kids || world.me) { // палочка: мягкое тело
    if (a.spore > 0) continue; // перёд ведёт, корма и пучок жгутиков идут по его следу
    const pzr = window.kaplyaStaryPuzyr ? null : (world.amoebas || []).find(m => m.ohv && m.ohv.faza === 'puzyr' && (m.ohv.kogo || a) === a), szh = pzr ? 1 - KAP.ameba.szhatie * Math.min(1, pzr.ohv.t / KAP.ameba.perevar) : 1; /* L095: в пузыре амёбы клетка сжимается — видно, что её переваривают */
    const lk = a.g ? look({ ...world.genes, [a.g]: true }, cfg.look, world.spacers.size) : lkAll, w = (rost.on(world) ? 8.5 * Math.pow(a.m, rost.vid(world)) : DL.w) * z * (a.g ? 1.9 : 1) * szh, sp = Math.hypot(a.vx, a.vy); // толщина постоянная (физика п. 14), в «Росте» видно, что растёшь
    const fm = Math.min(a.m, world.split()) / world.split(), gr = vid.grow(fm, DL); // доля пути к делению: 0,5 у новорождённой, 1 у созревшей
    const run = sp > 25 && !a.tumble, wob = run ? 0.035 : 0.015; // встречное вращение тела к пучку: 3 раза в секунду
    const half = a.held > 0 ? w * (1.05 + 0.6 * a.held / cfg.bdello_kill) : rost.on(world) ? w * (1.6 + 1.0 * fm) : w * gr.half, tailW = w * 7.5 / z; // хищник внутри — клетка округляется в шарик
    const body = follow(a, half / z, tailW);
    a.teloX = body.cx; a.teloY = body.cy; if (!window.kaplyaStaroeOblako) { a.vidX = body.cx; a.vidY = body.cy; } /* L101: где тело нарисовано — там кольцо и облако яда */
    { const hl = half / z, hw = w / z, c = Math.cos(body.ang), sn = Math.sin(body.ang), cx = body.cx, cy = body.cy; // касание еды — по обводу палочки, а не по кругу (находка Романа: еда пропадала до оболочки)
      a.kasaetsya = (q, kr) => { const dx = q.x - cx, dy = q.y - cy, u = Math.max(-hl + hw, Math.min(hl - hw, dx * c + dy * sn)); return Math.hypot(dx - u * c, dy - u * sn) < hw + kr + 2; }; }
    const wm = w * Math.pow(2, rost.vid(world)); // мать: вдвое тяжелее, полудлина как у созревшей (см. half)
    const bo = vid.birth(a, time, world.me, body.ang, half / z, w / z, body.cx, body.cy, rost.on(world) ? wm * 2.6 / z : half * 2 / z, rost.on(world) ? wm / z : w / z); // мать ровно вдвое длиннее дочки той же толщины // деление: мать стягивается, дочки расходятся торец к торцу (vid.json split)
    if (bo) { probe.birth = time; if (bo.hide) continue; } // обход пальцем (test_L050) видит, что рождение рисуется; вторая дочка ещё часть матери
    const [x0, y0] = scr(bo ? bo.x : body.cx, bo ? bo.y : body.cy), sag = Math.max(-w * DL.sag, Math.min(w * DL.sag, body.sag * z)) * (bo ? bo.sag : 1), /* стенка жёсткая: длинная палочка не гнётся бананом */ hl = (bo ? half * bo.fl : half) * VD, wl = (bo ? w * bo.fw : w) * VD;
    const ang = (bo ? bo.ang : body.ang) + Math.sin(time * 18.8 + a.id) * wob, ax = Math.cos(ang), ay = Math.sin(ang);
    const x = x0 - ay * sag * 0.675, y = y0 + ax * sag * 0.675; // центр модели так, чтобы концы легли на хорду
    const along = (s, o = 0) => [x + ax * s - ay * o, y + ay * s + ax * o];
    const arc = u => -sag * 0.675 + sag * (1 - Math.min(1, (u * z / half) ** 2)); // прогиб в точке u (u — в единицах мира от центра)
    const pinch = bo ? bo.pinch : rost.on(world) ? 0 : gr.u; // кольцо сжимается по массе и только в одну сторону, у созревшей тонкая перемычка (п. 14)
    const dna = bo ? (bo.pinch > 0 ? 1 : 0) : rost.on(world) ? 0 : gr.dna; // две ДНК расходятся раньше кольца
    bodies.rod(x, y, ang, hl, wl, pinch, [CELL[0].r, CELL[0].g, CELL[0].b], [CORE[0].r, CORE[0].g, CORE[0].b], a.id, -sag * (1 - pinch * 0.8));
    if (!rost.on(world) && !a.g && !(a.held > 0)) { const N = DL.nuc, s = hl * N.apart * dna, al = N.a * (0.5 + 0.5 * dna); // светлая ДНК (нуклеоид): одна посередине, к делению вытягивается и расходится к половинкам раньше кольца
      for (const sd of [-1, 1]) glow.put(x + ax * s * sd, y + ay * s * sd, wl * N.r, ...N.c, al); }
    rost.draw({ w: world, a, x, y, ang, half, wd: w, z, glow, time, scr, bezKontura: true }); // в «Капле» без кольца из точек: рост виден полосой внизу // контур следующего роста, струйки от комка
    for (const g of world.gulps || []) if (g.rv && g.a === a && g.tt) { const [gx, gy] = scr(g.x, g.y), f = 1 - Math.min(1, g.t / g.tt) * 0.75; zhitel(RSV_SPISKI[g.who], g.q || { id: 1, m: g.m }, gx, gy, (g.q && g.q.a) || 0, radius(g.m * f) * z, time, z); } // Ш29: растворяемое видно у оболочки, тает
    evo.draw({ w: world, a, x, y, z, glow, scr }); // «Эволюция»: нити глотания
    if (a.grab) glow.put(x, y, half * 1.8, 1, 0.25, 0.15, 0.22 + 0.15 * Math.sin(time * 14)); // схвачена: бьётся в пасти
    { const V = KAP.boj.celi.kokk.vspyshka, u = a.ujalT != null ? world.stats.time - a.ujalT : 1e9; if (u < V.t) glow.put(x, y, half * V.r, ...KAP.boj.yad_vid.cvet, V.a * (1 - u / V.t)); } /* пачка 1 п. 2: щипок виден вспышкой */
    if (a === world.me[0] && a.zahvachen) { const K = KAP.zahvat.kolco, f = ZHV.ryvki / KAP.zahvat.ryvkov, r = half * K.r; luk(glow, x, y, r, -Math.PI / 2, 6.283, Math.max(2, half * 0.12), K.cvet, K.a, f, K.cvet, K.a * 0.25, K.tochek); /* L129 */ } /* L074: кольцо «вырвись» заполняется рывками */
    if (world.rush > 0.05) glow.put(x, y, half * (1.4 + world.rush * 0.6), 1, 0.75, 0.35, 0.08 + 0.1 * world.rush); // разгон роста: рибосомы работают на всю
    vid.skin({ a, lk, x, y, ang, ax, ay, half: hl, w: wl, z, along, arc, body, scr, time, pdt, run, phageNear, foodNear, spacers: world.spacers.size, plasmid: world.plasmid, cfg, alive: world.me, glow, ink });
    if (a.sick >= 0) glow.put(x, y, half, 1, 0.2, 0.3, 0.25 + 0.2 * Math.sin(time * 20));
    PROP_YA = hl / wl; { const NT = KAP.boj.na_tele || {}, nb = {}; for (const g in NT) if (g !== '_' && world.genes[g]) nb[NT[g]] = Math.max(1, mut.lvl(world, g)); if (Object.keys(nb).length) chasti_navykov(nb, { x, y, a: ang, R: wl, L: 2 * hl, z: 1, time, id: a.id, beg: run ? 1 : 0 }, bodies); } /* Ш25: оружие видно на теле частью из движка */
  }
  for (const b of world.away) { // уплывшая дочка: уходит своим курсом и тает в толще
    const [x, y] = scr(b.x, b.y), w = 8.5 * Math.pow(b.m, 0.3) * z, f = b.t / cfg.away_time; if (!on(x, y)) continue;
    if (f < 0.7) bodies.rod(x, y, b.a, w * 2.2, w, 0, [CELL[0].r, CELL[0].g, CELL[0].b], [CORE[0].r, CORE[0].g, CORE[0].b], b.id, 0);
    glow.put(x, y, w * 3, 0.6, 0.85, 1, 0.25 * (1 - f));
  }
  bodies.podnyat = 0;
  for (const a of world.me) { // след: клетка расталкивает взвесь, частицы расходятся и гаснут — вязкость видна
    const sp = Math.hypot(a.vx, a.vy); if (KAP.bez_sleda || sp < 40 || puffs.length > 230) continue; // в «Капле» цепочки бледных кругов за клеткой нет
    const ux = Math.cos(a.a), uy = Math.sin(a.a), rr = radius(a.m), side = Math.random() < 0.5 ? -1 : 1;
    puffs.push({ x: a.x - ux * rr * 1.3 - uy * side * rr * 0.6, y: a.y - uy * rr * 1.3 + ux * side * rr * 0.6, vx: -uy * side * 18 - ux * 6, vy: ux * side * 18 - uy * 6, t: 0 });
  }
  puffs = puffs.filter(p => (p.t += 1 / 60) < 1.4);
  for (const p of puffs) { p.x += p.vx / 60; p.y += p.vy / 60; p.vx *= 0.95; p.vy *= 0.95; const [x, y] = scr(p.x, p.y); wake.put(x, y, (5 + 9 * p.t) * z, 0.8, 0.92, 1, 0.07 * (1 - p.t / 1.4)); } // мягкие широкие завихрения, а не цепочка бусин за кормой (отзыв 25.11: «пунктирные следы за клеткой»)
  for (const f of world.food) { // еда трёх видов (Е2, Е4): жёлтые крошки, белые искры глюкозы, розовый белковый сок
    const [x, y] = scr(f.x, f.y); if (!on(x, y, 20)) continue;
    const F = cfg.food_kinds[f.kind || 'bits'], k = Math.sqrt(f.s || 1) * F.size, tw = F.twinkle ? 0.75 + 0.25 * Math.sin(time * 7 + f.x * 0.3 + f.y) : 1;
    const dm = rost.dim(world, f.kind || 'bits'); if (z > KAP.lod.eda_z) glow.put(x, y, 9 * z * k * F.halo_r, ...(f.cvet || F.halo), 0.14 * tw * dm); // большая клетка: у крупинок без ореола (лаги)
    glow.put(x, y, 3.2 * z * k + 0.6, ...(f.cvet || F.core), 0.9 * tw * dm); /* Ш4: точки внутренностей — цветом своей части */ // ценность видна размером и ореолом: крошка меньше всех, сок крупнее (дизайнер); искры мерцают
  }
  { const K = KAP.kislota; for (const g of KIS.grozdi) { const k = kis.krug(g, world, K); if (!k) continue; const [x, y] = scr(k.x, k.y), R = k.r * z; if (!on(x, y, R)) continue; // П26: бледно-жёлтая муть с мелкими пузырьками у грозди шариков
    for (let j = 0; j < 7; j++) { const t = j * 2.399 + time * 0.1, rr = R * 0.7 * Math.sqrt((j + 0.5) / 7); glow.put(x + Math.cos(t) * rr, y + Math.sin(t) * rr, R * 0.6, ...K.cvet, K.a); }
    for (let j = 0; j < K.puzyrki; j++) { const t = j * 2.399, f = (time * 0.25 + j / K.puzyrki) % 1, rr = R * 0.8 * Math.sqrt((j + 0.5) / K.puzyrki); ink.put(x + Math.cos(t) * rr, y + Math.sin(t) * rr - f * R * 0.3, (1.2 + j % 2) * Math.max(1, z), ...K.cvet, 0.5 * (1 - f)); } } }
  { const K = KAP.rot; for (const k of ROT.kuski) { const F = cfg.food_kinds[k.f.kind || 'bits']; for (const t of vdv.tochki(k, K, radius)) { if (t.p >= 1) continue; const [x, y] = scr(t.x, t.y); if (!on(x, y, 10)) continue; const r = K.r_tochki * (1 - 0.45 * t.p) * (1 + K.obyom * t.gl) * Math.max(1, z * 0.6), al = K.a * (1 - K.obyom + K.obyom * (t.gl + 1) / 2); glow.put(x, y, r * 2.6, ...F.halo, 0.22 * al); glow.put(x, y, r, ...F.core, al); } } } /* Ш2: кусок рассыпался на точки, они воронкой бегут в рот */
  { const K = KAP.rot, a = world.me[0]; if (a && ROT.kuski.some(k => k.a === a)) { const R = radius(a.m), [mx, my] = vdv.rot(a, R, NOS(a.m)), C = vdv.konus(K, mut.lvl(world, 'magnet')), L = C.dlina * R, c = Math.cos(a.a), sn = Math.sin(a.a); /* Ж.2б: вода завитками закручивается в рот вместе с едой */
    for (let j = 0; j < K.voda_zavitkov; j++) for (let i = 0; i < K.voda_tochek; i++) { const p = ((i / K.voda_tochek + time * 0.9 + j / K.voda_zavitkov) % 1), u = L * (1 - p), sir = u * Math.tan(C.ugol * Math.PI / 180), v = sir * Math.sin(6.283 * (K.oborotov * p + j / K.voda_zavitkov));
      const [x, y] = scr(mx + u * c - v * sn, my + u * sn + v * c); ink.put(x, y, Math.max(1, z * 0.5), 0.75, 0.9, 1, K.voda_a * Math.sin(Math.PI * p)); } } }
  { const Y = KAP.boj.yad_vid, O = Y.oblako, X = KAP.boj.oruzhie.toxin, t0 = world.stats.time; for (const c of window.kaplyaStaroeOblako ? YAD.oblaka : []) { const [x, y] = scr(c.x, c.y), f = 1 - (t0 - c.t0) / X.oblako_t; if (!on(x, y, 80) || f <= 0) continue; for (let j = 0; j < O.kluby; j++) { const u = c.t0 * 7 + j * 2.399, rr = c.r * z * 0.45 * Math.sqrt((j + 0.5) / O.kluby); glow.put(x + Math.cos(u) * rr, y + Math.sin(u) * rr, c.r * z * (0.7 + 0.3 * (1 - f)), ...Y.cvet, O.a * f); } }
    if (!window.kaplyaStaroeOblako) { const a = world.me[0], kol = a ? boj.kolca(world, KAP.boj, a, radius)[0] : null; for (const c of YAD.oblaka) { const [x, y] = scr(c.x, c.y), f = 1 - (t0 - c.t0) / X.oblako_t; if (f > 0 && on(x, y, 120)) tuman.put(x, y, Math.max(c.r, kol ? kol.R : 0) * z, ...O.cvet, O.a_tuman * f); } if (a && kol && YAD.derzhu && YAD.zapas > 0) { const [x, y] = scr(a.vidX ?? a.x, a.vidY ?? a.y); tuman.put(x, y, kol.R * z, ...O.cvet, O.a_ty); } } } /* L090: зелёное облако до кольца досягаемости, клетку видно; L101: пока держишь — густой круг на самой клетке, облако не отстаёт */ /* Д.10 п. 3: облако яда тянется следом и тает */
  { const Y = KAP.boj.yad_vid; for (const L of Object.values(KAP.boj.celi)) for (const q of world[L.spisok] || []) if (gm.otravlen(q)) { const [x, y] = scr(q.x, q.y); if (on(x, y, 40)) glow.put(x, y, 26 * z, ...Y.cvet, Y.a + (Y.a_gibnet || 0) * (1 - Math.max(0, q.gn.f))); } /* Ш25: отравленная светится цветом яда, ярче к гибели */
    { const O = KAP.boj.otkaz_vid, t0 = world.stats.time; let shit = null; for (const L of Object.values(KAP.boj.celi)) for (const q of world[L.spisok] || []) if (q.otkaz && q.otkaz.t > t0 && !q.gone) { const [x, y] = scr(q.x, q.y), r = radius(q.m || L.massa) * (L.k_r || 1) * z * 1.15; /* Д.3 п. 2: не берёт — серая обводка и щит */
      luk(glow, x, y, r, 0, 6.2832, O.r * Math.max(1, z * 0.5), O.cvet, O.a, 1, O.cvet, O.a, O.tochek); /* L129 */ if (!shit || q.otkaz.t > shit.t) shit = { x, y: y - r, t: q.otkaz.t }; }
      { const V = KAP.boj.mest.metka; for (const o of MST.spisok) { const q = o.q; if (q.gone) continue; const [x, y] = scr(q.x, q.y), r = radius(q.m || 1) * z * 1.2 + V.otstup * z; if (!on(x, y, 60)) continue; /* Д.9: метка обидчика — тёмная дуга снизу, «по зубам» — светлая */
        luk(ink, x, y, r, Math.PI / 2 - V.ugol / 2, V.ugol, V.r * Math.max(1, z * 0.5), o.poZubam ? V.cvet_po_zubam : V.cvet, V.a, 1, V.cvet, V.a, V.tochek); /* L129 */ } }
      { const V = KAP.boj.zdorove_vid; for (const L of Object.values(KAP.boj.celi)) for (const q of world[L.spisok] || []) { const f = q.gone ? null : boj.duga(q, t0, V); if (f == null) continue; const [x, y] = scr(q.x, q.y), r = radius(q.m || L.massa) * (L.k_r || 1) * z * 1.15 + V.otstup * z; if (!on(x, y, 60)) continue; /* Д.10 п. 1: дуга здоровья над раненым */
        luk(ink, x, y, r, Math.PI * 1.5 - V.ugol / 2, V.ugol, V.r * Math.max(1, z * 0.5), V.cvet, V.a, f, V.cvet_net, V.a_net, V.tochek); /* L129 */ } }
      const E = $('kshit') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'kshit', textContent: '🛡' }); if (!E.style.position) Object.assign(E.style, { position: 'fixed', zIndex: '3', pointerEvents: 'none', fontSize: '20px', transform: 'translate(-50%, -100%)', filter: 'grayscale(1)' });
      E.style.display = shit && !paused && window.kaplyaStaryePunktiry ? '' : 'none'; /* L129: пиксельный значок щита убран — отказ видно серым сплошным кольцом на самой цели */ if (shit) { const k = innerWidth / W; E.style.left = shit.x * k + 'px'; E.style.top = shit.y * k + 'px'; } }
    const K = Y.kolco; if (K) for (const a of world.me) for (const o of boj.kolca(world, KAP.boj, a, radius)) { const [x, y] = scr(a.vidX ?? a.x, a.vidY ?? a.y), r = o.R * z, al = o.cel ? K.a_cel : K.a; if (a === world.me[0]) window.kaplyaKolcoXY = [x * innerWidth / W, y * innerWidth / W]; /* сторож L101: где нарисовано кольцо */ /* досягаемость яда: кольцо вокруг клетки, ярче, когда есть кого травить (Роман 27.11) */
      luk(glow, x, y, r, time * 0.15, 6.2832, K.r * z + 1, Y.cvet, al, 1, Y.cvet, al, K.tochek); /* L129 */ } }
  { const K = KAP.virus_znak, me = world.me[0]; VIR = me ? vir.muti(world.phages, me, K, radius(me.m), cfg.speed / rost.hod(world, me)) : []; for (const q of VIR) { const [x, y] = scr(q.x, q.y); if (!on(x, y, 80)) continue; const ob = q.vid === 'oblako'; glow.put(x, y, (ob ? K.r_oblako : K.r_blizko) * z, ...K.cvet, ob ? K.a_oblako : K.a_blizko); } } // П7: вирус опасен водой — серая муть рядом и в облаке, без красного и розового
  { const M = sob.muti(SOB, KAP.sobytiya), K = KAP.sobytiya; if (M) { const [x, y] = scr(M.x, M.y), c = K.vidy[M.vid].cvet; for (let j = 0; j < 7; j++) { const t = j * 2.399 + time * 0.2, rr = K.r * z * 0.6 * Math.sqrt((j + 0.5) / 7); glow.put(x + Math.cos(t) * rr, y + Math.sin(t) * rr, K.r * z * 0.7, ...c, K.a * M.sila); } } } /* Ш41: беда видна водой до прихода */
  for (const g of world.phages) { // фаг T4: головка позади, хвостом вперёд — садится хвостом
    const [x, y] = scr(g.x, g.y); if (!on(x, y)) continue;
    const s = 6 * z + 1, d = g.d, ux = Math.cos(d), uy = Math.sin(d); // сам не плывёт: смотрит куда попало, прилипший — ножками в клетку
    const P = (a, b) => [x + ux * a - uy * b, y + uy * a + ux * b];
    const pink = (p, r, al = 0.95) => ink.put(p[0], p[1], r, 0.82, 0.8, 0.92, al); // серебристый, как на снимках
    if (zhitel('phages', g, x, y, d, s, time, z)) continue; bodies.sphere(x, y, s * 0.22, [0.62, 0.62, 0.6], [0.5, 0.5, 0.5], g.id, 0.9); continue; // книга П7: вирус — мелкое матовое серое зёрнышко, не схема T4
    if (g.host === 'me') glow.put(...P(-2.1 * s, 0), s * 1.8, ...cfg.danger.phage, g.on ? 0.3 + 0.2 * Math.sin(time * 14) : 0.12); // белёсое свечение: опасен тебе; красный — только у хищной запятой (урок L022)
    pink(P(0.85 * s, -0.35 * s), s * 0.22); pink(P(0.85 * s, 0.35 * s), s * 0.22);
    vid.phageLegs({ P, s, on: !!g.on, key: g, seed: g.x, time, ink }); // шесть лап: плывёт — поджаты, сел — веером на плёнке, хвост поперёк борта (vid.js)
  }
  fx.drawOver({ scr, z, time, glow, ink });
  if (down) { // джойстик под большим пальцем: кольцо в точке касания и шарик за пальцем
    for (let i = 0, n = Math.ceil(6.283 * STICK / 1.4); i < n; i++) { const t = i * 6.283 / n; glow.put(down.x + Math.cos(t) * STICK, down.y + Math.sin(t) * STICK, 1.8, 1, 1, 1, 0.1); } // сплошное кольцо: шаг меньше радиуса
    const dx = finger.x - down.x, dy = finger.y - down.y, l = Math.hypot(dx, dy), k = l > STICK ? STICK / l : 1;
    glow.put(down.x + dx * k, down.y + dy * k, 26, 0.7, 0.95, 1, 0.22);
  } else if (!moved && world.me.length) { // подсказка без слов: палец внизу экрана тянет вверх
    const k = (time / 1.6) % 1, x = W / 2, y = H * 0.78;
    if (window.kaplyaStaryjKrugDzh) for (let i = 0, n = Math.ceil(6.283 * STICK / 1.4); i < n; i++) { const t = i * 6.283 / n; glow.put(x + Math.cos(t) * STICK, y + Math.sin(t) * STICK, 1.8, 1, 1, 1, 0.08); } window.kaplyaKrugDzh = !!window.kaplyaStaryjKrugDzh; /* L133: пустого кольца джойстика без пальца нет — только мягкий шарик тянет вверх */
    glow.put(x, y - STICK * k, 26, 1, 1, 1, 0.35 * (1 - k * 0.5));
  }
  const wrap = (v, n) => ((v % n) + n) % n;
  for (let i = 0; i < 32; i++) { // вдали: частицы в расфокусе — кольца, плывут медленнее
    const h = Math.abs(Math.sin(i * 91.7) * 43758.5) % 1, h2 = Math.abs(Math.sin(i * 12.9) * 9631.2) % 1;
    const warm = i % 3 === 0; // тёплые огоньки вдали, как на снимках
    far.put(wrap(h * 1400 - view.x * 0.35, 1400) - 340, wrap(h2 * 2400 - view.y * 0.35, 2400) - 500, (warm ? 6 : 14) + h * (warm ? 14 : 46), warm ? 1 : 0.6, warm ? 0.9 : 0.8, warm ? 0.75 : 1, warm ? 0.2 : 0.025 + h2 * 0.035);
  }
  for (let i = 0; i < 70; i++) { // рядом: пылинки дрожат (броуновское) — видно, какие мы маленькие
    const h = Math.abs(Math.sin(i * 33.1) * 1758.5) % 1, h2 = Math.abs(Math.sin(i * 71.3) * 5631.7) % 1;
    const jx = Math.sin(time * 13 + i * 7) * 1.2 + Math.sin(time * 0.3 + i) * 6, jy = Math.cos(time * 11 + i * 5) * 1.2 + Math.cos(time * 0.27 + i) * 6;
    dust.put(wrap(h * 1000 - (view.x - cur[0]) * z, 1000) - 140 + jx, wrap(h2 * 1900 - (view.y - cur[1]) * z, 1900) - 170 + jy, 1 + h * 1.6, 0.9, 0.95, 1, 0.22);
  }
  for (let i = 0; i < 3; i++) { // передний план (референсы Романа): огромная клетка в расфокусе ближе нас, только у края кадра —
    // три мягких пятна вдоль оси; к середине экрана гаснет, чтобы не закрывать опасности. Пятна, а не экранный проход — так дёшево
    const h = Math.abs(Math.sin(i * 47.3) * 3758.5) % 1, x = wrap(h * 1800 - view.x * 1.7, 1800) - 540, y = wrap(h * 7.1 % 1 * 2600 - view.y * 1.7, 2600) - 650;
    const e = Math.max(Math.abs(x / W - 0.5), Math.abs(y / H - 0.5)) * 2, al = 0.3 * Math.min(1, Math.max(0, (e - 0.55) / 0.4));
    if (al <= 0.01) continue;
    const a = h * 6.3 + time * 0.03, L = 60 + h * 40, r = 70 + h * 30;
    for (const s of [-1, 0, 1]) near.put(x + Math.cos(a) * s * L, y + Math.sin(a) * s * L, r, 0.35 + view.tint[0] * 3, 0.6 + view.tint[1] * 3, 0.68 + view.tint[2] * 3, al);
  }
  bodies.end(time);
  { const sp = world.split(), top = world.me.reduce((b, a) => a.m > b.m ? a : b, world.me[0] || { m: 0 }); // полоса: самая близкая к делению сестра, от половинки до деления
    let g = Math.max(0, Math.min(1, (top.m - sp / 2) / (sp / 2))); if (!window.kaplyaStaryjRost && world.me.length && !les.vkl()) { const Kr = KAP.rost, um = vh.dlina(Kr, top.m), st = Kr.shag_mkm, cel = (Math.floor(um / st + 1e-6) + 1) * st; g = (um - (cel - st)) / st; const L = $('growlbl') || Object.assign($('scalebox').appendChild(document.createElement('div')), { id: 'growlbl' }); const tx = Kr.polosa.replace('{}', cel.toFixed(1).replace('.', ',')); if (L.textContent !== tx) { if (L.textContent && ROST_CEL != null && cel > ROST_CEL) { say(Kr.podrosla.replace('{}', (cel - st).toFixed(1).replace('.', ',')), 2200); const H = $('hud'); H.classList.remove('rost'); void H.offsetWidth; H.classList.add('rost'); window.kaplyaPodroslo = (window.kaplyaPodroslo || 0) + 1; } L.textContent = tx; } ROST_CEL = cel; document.body.classList.add('rostNa'); } $('growfill').style.width = (g * 100).toFixed(1) + '%'; probe.grow = g; /* L135 (итог ночи п. 4: «Роста не видно: 2,0 мкм после 10–30 крошек»): полоса — рост до следующих rost.shag_mkm, подписана; дошла — «Подросла», число вспыхивает */
    const ill = world.me.filter(a => a.sick >= 0), k = ill.length ? Math.min(...ill.map(a => a.sick)) / cfg.sick : 0; // заражена — красная засечка на конце, тает к разрыву
    const n = $('sicknotch'); n.style.width = (ill.length ? 4 + 18 * k : 0) + '%'; n.style.left = Math.max(0, g * 100 - (ill.length ? 4 + 18 * k : 0)).toFixed(1) + '%'; probe.sickNotch = ill.length ? k : -1; }
  U.tint.value.set(...view.tint);
  U.drift.value.set(view.x * view.z / W, -view.y * view.z / W); // в ширинах экрана: слои сзади сдвигаются медленнее
  lod.glow = glow.n; lod.ink = ink.n; lod.chastey = bodies.all.reduce((n, m) => n + (m.count || 0), 0); lod.po = bodies.all.map(m => m.count || 0).join(','); // для замера: сколько всего рисуется в кадре
  for (const d of [far, glow, tuman, ink, near, dust, bubbles, wake]) d.done();
}

function render(t, after) { const byl = vKadre; vKadre = true; try { render0(t, after); } finally { vKadre = byl; } }
function render0(t, after) {
  U.time.value = t;
  paint(t); if (after) after();
  gl.autoClear = false;
  gl.setRenderTarget(rt); gl.render(water, cam); gl.setRenderTarget(null);
  gl.clear();
  gl.render(back, cam);
  gl.clearDepth();
  gl.render(bodies.scene, bodies.cam);
  gl.render(scene, cam);
}
// Замер для проверки: кадры, худший и средний кадр за последние 5 с, число клеток и точек.
window.zaplyvWorld = () => world; // для проверок и кадров
if (new URLSearchParams(location.search).has('pesochnica')) import('../pesochnica.js'); // песочница движка: пустая вода, умения касанием (pesochnica.js)
window.zaplyvScr = (x, y) => { const [sx, sy] = scr(x, y); return [sx * innerWidth / W, sy * innerHeight / H]; }; // для проверок: где на экране точка мира (в точках CSS)
const probe = window.zaplyvProbe = { dpr0: dprNow, warn: {}, frames: 0, worst: 0, avg: 0, js: 0, jsWorst: 0, cells: 0, dots: 0, errors: 0 };
addEventListener('error', () => probe.errors++);
let last = performance.now(), acc = [], js = [];
const dprAcc = [];
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  if (($('menu').classList.contains('on') || $('night').classList.contains('on')) && !frame.hid) { frame.hid = true; $('pause').style.display = 'none'; } // кнопки заплыва не лежат поверх меню и ночи
  if ($('menu').classList.contains('on') && !$('cabinet').classList.contains('on')) { last = now; probe.frames++; requestAnimationFrame(frame); return; } // меню закрывает мир: мир стоит
  if ($('night').classList.contains('on')) { last = now; nightFrame(dt); probe.frames++; requestAnimationFrame(frame); return; } // ночь рода закрывает мир
  const play = !ended; // замер «средний кадр» — только пока плывёшь; экран гибели в него не подмешивается
  if (play) { acc.push(now - last); if (acc.length > 300) acc.shift(); }
  if (play && !shotLow && dprNow > cfg.dpr_max && probe.frames > 90) { dprAcc.push(now - last); if (dprAcc.length >= cfg.dpr_check) { // тяжело — плотность ниже, один раз
    if (dprAcc.reduce((a, b) => a + b, 0) / dprAcc.length > cfg.dpr_slow) { dprNow = Math.min(devicePixelRatio, cfg.dpr_max); gl.setPixelRatio(dprNow); resize(); probe.dprDrop = probe.frames; }
    dprAcc.length = 0; } }
  last = now;
  const t0 = performance.now();
  if (!ended && !paused && !frozen) tick(dt);
  if (paused && world.me.length && curTab === 'genome' && genome.inner() > 0) { // клетка — в середину кольца, крупно (только на вкладке «Геном»: на других кольцо спрятано)
    const c = world.me.reduce((b, a) => a.m > b.m ? a : b), [fx, fy] = genome.center(), k = Math.min(1, dt * 4);
    const z = cfg.genome_zoom * genome.inner() * W / innerWidth / (25 * Math.pow(c.m, 0.3)); // полклетки ≈ 25·m^0.3 единиц мира
    view.z += (z - view.z) * k;
    view.x += (c.x - (fx - 0.5) * W / view.z - view.x) * k; view.y += (c.y - (fy - 0.5) * H / view.z - view.y) * k;
  }
  { const hide = ended || paused || !!kids; if (hide !== frame.hid) { frame.hid = hide; $('pause').style.display = hide ? 'none' : ''; } }
  fx.step(dt);
  shake = Math.max(0, shake - dt * 0.9);
  sway = [Math.sin(now / 1000 * 5) * 6 * shake, Math.sin(now / 1000 * 3.7 + 1) * 4 * shake];
  // Экран гибели или кабинет закрыли мир: кадр не перерисовываем (раньше мир под ними рисовался дальше, и в WebKit без видеокарты кадр рос с 27 до 50 мс).
  if (paused && curTab === 'map') { goalArrow(); drawMap(); probe.frames++; probe.covered = true; requestAnimationFrame(frame); return; } // карта закрывает мир: рисуем только её
  const covered = $('end').classList.contains('on') || $('cabinet').classList.contains('on');
  probe.covered = covered;
  if (covered) { probe.frames++; requestAnimationFrame(frame); return; }
  goalArrow();
  const solo = kids ? Object.fromEntries(['food', 'slime', ...Object.values(LISTS)].filter(l => l !== 'me').map(l => [l, world[l]])) : null; // выбор дочки: на сцене только две дочки — чужое существо не попадает за дочку (холодный игрок видел амёбу на «Пучке жгутиков»)
  if (solo) for (const l in solo) world[l] = [];
  igraT = now / 1000; try { render(now / 1000, () => { if (!ended) { js.push(performance.now() - t0); if (js.length > 300) js.shift(); } }); } finally { if (solo) Object.assign(world, solo); }
  if (LIN && !ended) for (const [list, who] of cel.SPIS) if (CEL.videl[who] != null && !LIN.sil[who]) { const q = (world[list] || []).find(q => { if (q.gone) return false; const [x, y] = scr(q.x, q.y); return x > 90 && x < W - 90 && y > 200 && y < H - 310; }); if (q) { const [x, y] = scr(q.x, q.y); lin.snyat(LIN, KAP.lineyka, canvas, who, x, y, radius(q.m || evo.E.glotat.razmer[who] || 1) * view.z, W); } } // силуэт: кадр самой игры при первой встрече
  { const M = KAP.mayak, me = world.me[0], r = world.rodnya, el = $('kmayak') || Object.assign(document.body.appendChild(document.createElement('img')), { id: 'kmayak' }); // П12: маяк — живой силуэт сестры у края, пока она за краем
    if (!el.style.position) Object.assign(el.style, { position: 'fixed', width: M.px + 'px', height: M.px + 'px', marginLeft: -M.px / 2 + 'px', marginTop: -M.px / 2 + 'px', pointerEvents: 'none', zIndex: '3', borderRadius: '50%', opacity: '0.85' });
    if (LIN && me && !LIN.sil._ya) { const [x, y] = scr(me.x, me.y); if (x > 90 && x < W - 90 && y > 200 && y < H - 310) lin.snyat(LIN, KAP.lineyka, canvas, '_ya', x, y, radius(me.m) * view.z, W); }
    const p = r && !ended && LIN && LIN.sil._ya ? mk.kraj(...scr(r.x, r.y), W, H, M) : null; el.style.display = p ? 'block' : 'none';
    if (p) { if (el.src !== LIN.sil._ya) el.src = LIN.sil._ya; el.style.left = p.x * innerWidth / W + 'px'; el.style.top = p.y * innerHeight / H + 'px'; el.style.transform = `rotate(${p.a + Math.sin(performance.now() / 400) * M.kach}rad)`; } }
  { const K = KAP.lestnica.pokaz, c = les.vkl() && LES.car, el = $('kcar') || Object.assign(document.body.appendChild(document.createElement('img')), { id: 'kcar' }); // П88: пока царь за краем — его силуэт у края с его стороны; тёплый край, когда он еда
    if (!el.style.position) Object.assign(el.style, { position: 'fixed', width: K.px + 'px', height: K.px + 'px', marginLeft: -K.px / 2 + 'px', marginTop: -K.px / 2 + 'px', pointerEvents: 'none', zIndex: '3', borderRadius: '50%', border: '2px solid #e9c46a' });
    const p = c && !ended && LIN && LIN.sil[c.who] ? mk.kraj(...scr(c.q.x, c.q.y), W, H, { otstup: K.otstup }) : null; el.style.display = p ? 'block' : 'none';
    if (p) { if (el.src !== LIN.sil[c.who]) el.src = LIN.sil[c.who]; el.style.left = p.x * innerWidth / W + 'px'; el.style.top = p.y * innerHeight / H + 'px'; const me = world.me[0], eda = me && ms0(c.q, c.who) * evo.E.glotat.bolshe <= me.m; el.style.boxShadow = eda ? '0 0 14px 6px rgba(255,170,90,0.75)' : 'none'; } }
  if (probe.frames % 60 === 0) knowGenes();
  probe.frames++; probe.dpr = dprNow; probe.cells = world.me.length; probe.z = view.z; // масштаб камеры: тап-обход проверяет, что она возвращается (L029)
  probe.js = js.reduce((s, v) => s + v, 0) / Math.max(js.length, 1); probe.jsWorst = Math.max(0, ...js.slice(5)); probe.path = Math.max(probe.path || 0, world.stats.path);
  probe.dots = world.food.length + world.prey.length + world.phages.length; probe.lost = (glow.lost || 0) + (ink.lost || 0); probe.finger = finger ? [Math.round(finger.x), Math.round(finger.y)] : null; // палец ведёт джойстик (обход касаний: свайп с полосы — плавание)
  probe.worst = Math.max(...acc.slice(5)); probe.avg = acc.reduce((s, v) => s + v, 0) / Math.max(acc.length, 1); probe.ended = ended;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
