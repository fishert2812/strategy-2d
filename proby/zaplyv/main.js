// «Заплыв» на экране (Three.js). Управление большим пальцем: коснулся где угодно — там встал джойстик,
// сдвиг пальца от этой точки задаёт, куда и как быстро плыть; короткое касание — вытянувшиеся делятся.
// Клетки — объёмные тела со светом (body3d.js): капсулы, шары с шипами, амёбы, гранёные фаги.
// Сверху — точки: еда, жгутики, крупинки внутри клеток, фаги, взвесь вдали и размытые соринки вблизи.
import * as THREE from './three.module.min.js';
import { World, radius } from './sim.js';
import { Stick } from './controls.js';
import { follow } from './soft.js';
import { look } from './look.js';
import { Bodies } from './body3d.js';
import { genomeScreen } from './genome.js';
import { mark, message } from './feedback.js';

const cfg = await (await fetch('data.json')).json();
const cards = await (await fetch('cards.json')).json();
const genomeData = await (await fetch('genome.json')).json();
const W = 720; // ширина экрана в единицах игры
const canvas = document.getElementById('c');
const gl = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
gl.setPixelRatio(Math.min(devicePixelRatio, 2));
let H = W;
const cam = new THREE.OrthographicCamera(0, W, 0, W, -1, 1);
const back = new THREE.Scene(); // фон и дальнее
const water = new THREE.Scene(); // толща воды: считается в треть разрешения — она мягкая, а телефону легче
const rt = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
const scene = new THREE.Scene(); // точки поверх тел
const bodies = new Bodies();
// Цвета как на раскрашенных снимках: у каждой стороны оболочка одного цвета, содержимое другого.
const CELL = [new THREE.Color(0.35, 0.85, 1.0), new THREE.Color(1.0, 0.5, 0.2), new THREE.Color(0.6, 1.0, 0.35)]; // оболочка
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
           float a = 0.35 + smoothstep(0.7, 0.93, d) * (1.0 - smoothstep(0.93, 1.0, d)) * 1.6; gl_FragColor = vec4(vc.rgb, vc.a * a); }`
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
    if (this.n >= this.max) return;
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
const far = new Dots(80, back, 1, 'ring', 0);
const glow = new Dots(3000, scene, 3, true, 0.6);
const ink = new Dots(3000, scene, 4, false, 0.8);
const near = new Dots(12, scene, 5, false, 0); // передний план: размытые клетки у края кадра
const dust = new Dots(120, scene, 3, true, 0.9);
const bubbles = new Dots(60, scene, 4, 'ring', 0);
const wake = new Dots(240, scene, 3, true, 0.9); // след в воде: частицы, которые клетка расталкивает
let puffs = [], cur = [0, 0], zaps = [], kids = null;

function resize() {
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
  if (!audio) return;
  const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
};

const STICK = 56; // полный ход большого пальца (~30 точек экрана); дальше кольцо едет за пальцем
const pad = new Stick(STICK);
let world, view, finger = null, down = null, moved = false, rings = [], shake = 0, ended = false, lastEat = 0;
const $ = id => document.getElementById(id);
const ver = (await (await fetch('version.json')).json()).number; // свой номер «Заплыва», список — VERSIONS.md
$('ver').textContent = 'Заплыв ' + ver;
fetch('../version.txt').then(r => r.ok ? r.text() : '').then(t => { if (t.trim()) $('ver').textContent = 'Заплыв ' + ver + ' · ' + t.trim().slice(0, 7); }).catch(() => {});

function start() {
  world = new World(cfg, (Math.random() * 2 ** 31) | 0);
  view = { x: 0, y: 0, z: 2.2, tint: [...TINT[0]] };
  rings = []; ended = false;
  $('end').classList.remove('on');
}
$('again').onclick = start;

// Кабинет: кого встречал, карточки с настоящими фактами. Память — в этом браузере (только удобство).
const KEYS = Object.keys(cards).filter(k => k !== '_');
let met = new Set(['me']);
try { for (const k of JSON.parse(localStorage.getItem('zaplyv.met') || '[]')) met.add(k); } catch (_) {}
const saveMet = () => { try { localStorage.setItem('zaplyv.met', JSON.stringify([...met])); } catch (_) {} };
const cabLabel = () => { $("cab").textContent = $("gcab").textContent = `Кабинет · ${KEYS.filter(k => met.has(k)).length} из ${KEYS.length}`; };
cabLabel();
$('cab').onclick = () => {
  const shelf = $('shelf'); shelf.innerHTML = '';
  for (const k of KEYS) {
    const c = cards[k], d = document.createElement('div');
    d.className = 'cardk' + (met.has(k) ? '' : ' no');
    if (met.has(k)) { d.innerHTML = '<h2></h2><p class="t"></p><p class="f"></p>'; d.querySelector('h2').textContent = c.name; d.querySelector('.t').textContent = c.text; d.querySelector('.f').textContent = c.fact; }
    else d.innerHTML = '<h2>???</h2><p>Ещё не встречал. Плыви дальше.</p>';
    shelf.appendChild(d);
  }
  $('cabinet').classList.add('on');
};
$('back').onclick = () => $('cabinet').classList.remove('on');
let toastT = 0;
// Пауза с геномом: мир замирает, твоя клетка крупно в середине кольца ДНК.
let paused = false;
const genome = genomeScreen({ G: genomeData, cfg, world: () => world,
  onOpen: () => { paused = true; document.body.classList.add('paused'); pad.end(0); down = null; finger = null; },
  onClose: () => { paused = false; document.body.classList.remove('paused'); },
  onCabinet: () => $('cab').onclick(), onSend: () => send(), onDraw: () => showMarks() });
// «Не так»: одно касание — отметка с моментом игры. Копятся здесь, «Отправить» — меню «Поделиться» телефона.
let marks = [];
try { marks = JSON.parse(localStorage.getItem('zaplyv.marks') || '[]'); } catch (_) {}
function showMarks() {
  const n = marks.length, label = `Отправить отметки · ${n}`;
  $('esend').style.display = n ? '' : 'none'; $('esend').textContent = label;
  const g = $('gsend'); if (g) { g.style.display = n ? '' : 'none'; g.textContent = `Отправить · ${n}`; }
}
// Отклик на касание флажка виден на любом экране: флажок вспыхивает, рядом своя надпись поверх всех слоёв (урок L017).
let noteT = 0;
function flag(screen, btn) {
  const now = new Date(), at = `${now.getDate()}.${String(now.getMonth() + 1).padStart(2, '0')} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  let text; try { text = mark(world, cards, $('ver').textContent.replace('Заплыв ', ''), screen, cfg.flag_r, { x: view.x, y: view.y }); } catch (e) { text = $('ver').textContent + ' · ' + screen + ' · (подробности не собрались: ' + e.message + ')'; }
  marks.push({ at, text });
  try { localStorage.setItem('zaplyv.marks', JSON.stringify(marks)); } catch (_) {}
  showMarks();
  const n = $('note'); n.textContent = `⚑ Отметка ${marks.length} записана` + (screen === 'игра' ? ' · отправить — на паузе' : ''); n.classList.add('on');
  clearTimeout(noteT); noteT = setTimeout(() => n.classList.remove('on'), 2200);
  if (btn) { btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit'); }
  try { beep(880, 0.08, 0.04, 'sine', 0.8); } catch (_) {}
}
async function send() {
  const text = message(marks);
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); say('Скопировано — вставь в чат', 2200); }
    marks = []; try { localStorage.removeItem('zaplyv.marks'); } catch (_) {}
    showMarks();
  } catch (e) { if (e?.name !== 'AbortError') say('Не отправилось — отметки целы, попробуй ещё', 2200); } /* отменил отправку — отметки остаются */
}
$('flag').onclick = e => flag('игра', e.currentTarget);
$('gflag').onclick = $('gno').onclick = e => flag('геном', e.currentTarget);
$('eno').onclick = e => flag('экран гибели', e.currentTarget);
$('esend').onclick = send;
showMarks();
function meet(k) { // первая встреча: на секунду имя у края экрана, без паузы и без нажатий
  if (met.has(k) || !cards[k]) return;
  met.add(k); saveMet(); cabLabel();
  say('Новая карточка · ' + cards[k].name, 1600);
  beep(990, 0.12, 0.03, 'sine', 1.3);
}
function say(text, ms) { $('toast').textContent = text; $('toast').classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.remove('on'), ms); }
const told = new Set(); // подсказка — один раз и только в момент, когда она нужна
function tell(k, text) { if (told.has(k)) return; told.add(k); say(text, 2600); }
start();

const toWorld = (sx, sy) => ({ x: (sx - W / 2) / view.z + view.x, y: (sy - H / 2) / view.z + view.y });
let sway = [0, 0]; // лёгкое покачивание кадра после удара: плавная волна, не дрожь
const scr = (x, y) => [(x - view.x) * view.z + W / 2 + sway[0], (y - view.y) * view.z + H / 2 + sway[1]];
const unit = e => [e.clientX * W / innerWidth, e.clientY * W / innerWidth];

canvas.addEventListener('pointerdown', e => {
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} }
  audio?.resume?.();
  const [x, y] = unit(e);
  pad.start(x, y, performance.now()); down = pad.down; finger = pad.finger;
});
canvas.addEventListener('pointermove', e => {
  if (!down) return;
  const [x, y] = unit(e); pad.move(x, y); finger = pad.finger;
  if (pad.drag) moved = true;
});
const up = e => {
  if (!down) return;
  if (pad.end(performance.now()) && world.divide()) beep(520, 0.18, 0.06, 'triangle', 1.8);
  down = null; finger = null;
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

function ask() {
  if ($('genes').classList.contains('on')) return;
  const box = $('cards'); box.innerHTML = ''; $('genes').querySelectorAll('.kid').forEach(e => e.remove());
  kids = world.choice.map((g, i) => ({ g, x: 0, y: 0, vx: 0, vy: 0, m: 1.7, a: -Math.PI / 2, id: 900 + i, sick: -1 })); // две дочки крупно: мутация видна на теле
  world.choice.forEach((g, i) => {
    const go = () => { world.pick(g); kids = null; $('genes').classList.remove('on'); ring(world.center().x, world.center().y, 0, 300); beep(660, 0.4, 0.06, 'sine', 1.5); };
    const b = document.createElement('button');
    b.innerHTML = cfg.genes[g][0] + '<small>' + cfg.genes[g][1] + '</small>'; b.onclick = go; box.appendChild(b);
    const k = document.createElement('button'); k.className = 'kid'; k.style.left = i ? '52%' : '2%'; k.onclick = go; k.setAttribute('aria-label', cfg.genes[g][0]); $('genes').appendChild(k);
  });
  $('genes').classList.add('on');
  beep(440, 0.5, 0.05, 'sine', 2);
}

// Твой путь за заход: время, поколения и сколько это заняло бы в природе, мутации, кто сколько отнял.
function pathText(w) {
  const s = w.stats, t = Math.round(s.time), mm = (s.gen * 20) | 0; // одно деление ≈ 20 минут при хорошей еде
  const nature = mm < 60 ? mm + ' мин' : Math.floor(mm / 60) + ' ч' + (mm % 60 ? ' ' + (mm % 60) + ' мин' : '');
  const genes = Object.keys(w.genes).map(g => w.cfg.genes[g][0]).join(', ') || 'пока нет';
  const lost = Object.entries(s.lost).map(([k, n]) => (cards[k] ? cards[k].name : k) + ' — ' + n).join(', ');
  return `Плыл ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}, проплыл ${Math.round(s.path / 26)} мкм<br>`
    + `Поколений: ${s.gen} — в природе это ≈ ${nature}<br>Клеток было до ${s.most}, съедено ${s.eaten}<br>`
    + `Мутации: ${genes}` + (lost ? `<br>Отняли клеток: ${lost}` : '');
}

function ring(x, y, side, r) { rings.push({ x, y, side, r, t: 0 }); }

function events() {
  for (const [k, x, y, size = 1, y2] of world.events) {
    if (k === 'spore') { ring(x, y, 0, 160); beep(200, 0.6, 0.06, 'sine', 0.5); say('Уснула! Спящую не берут — переждёшь беду', 2600); }
    if (k === 'sprout') { ring(x, y, 2, 120); beep(520, 0.3, 0.05, 'sine', 2); }
    if (k === 'gene') { ring(x, y, 0, 120); beep(780, 0.3, 0.05, 'sine', 1.6); say('Ген от сородича: ' + cfg.genes[size][0] + ' — ' + cfg.genes[size][1], 2600); } // конъюгация
    if (k === 'zap') { zaps.push({ x, y, x2: size, y2, t: 0 }); beep(1500, 0.05, 0.05, 'square', 0.4); } // выстрел гарпуна синегнойки
    if (k === 'grab') { ring(x, y, 1, 40); beep(240, 0.2, 0.05, 'sawtooth', 1.6); tell('grab', 'Схватили! Резко развернись — вырвешься'); }
    if (k === 'sick' && world.me.some(a => a.held > 0)) tell('bdello', 'Прилип хищник! Резко развернись — стряхнёшь');
    if (k === 'eat') { ring(x, y, 2, 26 + 14 * size); const n = performance.now(); if (n - lastEat > 60) { beep(300 + Math.random() * 200, 0.09, 0.04); lastEat = n; } }
    if (k === 'split') ring(x, y, 0, 70);
    if (k === 'meet') meet(x);
    if (k === 'stick') { ring(x, y, 1, 22); beep(520, 0.06, 0.04, 'square'); } // прилип фаг: резко развернись — стряхнёшь
    if (k === 'shake') { ring(x, y, 0, 30); beep(700, 0.07, 0.03); }
    if (k === 'cut') ring(x, y, 2, 26);
    if (k === 'learn') { ring(x, y, 2, 80); beep(620, 0.4, 0.05, 'sine', 1.4); say('Пережила фага! Его кусок — новая полоска CRISPR: теперь T4 не страшен', 3000); }
    if (k === 'sit') ring(x, y, 0, 46); // коловратка присела на ногу: сейчас раскрутит колёса
    if (k === 'snap') { ring(x, y, 0, 60); beep(1200, 0.06, 0.04, 'square', 0.3); } // сувойка сжалась пружиной
    if (k === 'bump') { ring(x, y, 0, 24); beep(880, 0.05, 0.03); } // капсула: хищник отскочил
    if (k === 'pop') { ring(x, y, 2, 90); beep(260, 0.25, 0.06, 'triangle', 0.6); } // чужая клетка лопнула
    if (k === 'pinch') { ring(x, y, 1, 50); beep(1400, 0.05, 0.03, 'square', 0.6); tell('pinch', 'Кокк щиплет своим ядом — отплыви'); }
    if (k === 'sick') { ring(x, y, 1, 50); beep(180, 0.3, 0.05, 'sawtooth', 0.7); }
    if (k === 'burst' || k === 'eaten') { ring(x, y, 1, 150); shake = 1; beep(110, 0.45, 0.09, 'triangle', 0.5); }
  }
  world.events.length = 0;
}

function tick(dt) {
  if (world.choice.length) { ask(); return; }
  world.step(dt, pad.value()); // джойстик: направление и сила из сдвига пальца
  { const [fx, fy] = world.flow(view.x, view.y); cur[0] += fx * dt; cur[1] += fy * dt; } // течение несёт взвесь
  events();
  if (!world.me.length) {
    if (!ended) {
      ended = true;
      const k = cards[world.stats.killer] || cards.me;
      $('who').textContent = k.who; $('cname').textContent = k.name; $('ctext').textContent = k.text;
      $('cfact').textContent = k.fact; $('ctip').textContent = k.tip || '';
      $('stats').innerHTML = pathText(world);
      setTimeout(() => $('end').classList.add('on'), 700);
    }
    return;
  }
  const c = world.center(), k = Math.min(1, 3 * dt);
  view.x += (c.x - view.x) * k; view.y += (c.y - view.y) * k;
  let spread = 0;
  for (const a of world.me) spread = Math.max(spread, Math.hypot(a.x - view.x, a.y - view.y));
  // Камера как у оператора: в спокойствии подъезжает к клетке (видна фактура, ворсинки, кромка света),
  // при опасности рядом или на скорости отъезжает — видно, что вокруг.
  const near = (list, r) => list.some(e => Math.hypot(e.x - c.x, e.y - c.y) < r);
  const danger = near(world.amoebas, 420) || near(world.bdellos, 420) || near(world.slippers, 380) || near(world.bells, 300) || near(world.rotis, 420) || near(world.phages.filter(g => g.host === 'me'), 300);
  const fast = world.me.some(a => Math.hypot(a.vx, a.vy) > 120);
  view.calm = (view.calm || 0) + ((danger || fast ? 0 : 1) - (view.calm || 0)) * Math.min(1, dt * (danger ? 2.5 : 0.6));
  const want = Math.max(0.9, Math.min(2.3, 2.45 - 0.17 * Math.sqrt(world.biggest()), W * 0.36 / Math.max(spread, 1))) * (1 + cfg.close_up * view.calm);
  view.z += (want - view.z) * Math.min(1, dt * 1.5);
  const t = TINT[world.biome(view.x, view.y)];
  for (let i = 0; i < 3; i++) view.tint[i] += (t[i] - view.tint[i]) * Math.min(1, dt * 0.8);
  $('count').textContent = 'клеток ' + world.me.length;
  $('eaten').textContent = world.rush > 0.05 ? 'рост ×' + (1 + world.rush).toFixed(1) : 'съедено ' + world.stats.eaten; // серия кусков подряд — рост быстрее
  if (world.readyToSplit() && !world.me.some(a => a.grab || a.held > 0)) tell('split', 'Выросла! Коснись — поделишься. Или подожди');
}

// Вид «как под микроскопом» (тёмное поле): палочки длиной в 2–3 ширины растут в длину, внутри светлое
// облако нуклеоида и зёрна, у полюсов светлые шапочки; жгутики пучком на ходу и врозь на месте;
// кокки — одиночки, пары, цепочки, грозди; амёба с ложноножками, током зёрен, ядром и вакуолью;
// фаг T4 — вытянутая головка, хвост, пластинка и шесть ножек; вдали частицы в расфокусе кольцами.
const SPIKES = [[1, 0.45, 0.75], [1, 0.6, 0.2], [0.45, 0.7, 1], [0.8, 0.5, 1]];
const BALL = [null, [0.55, 0.48, 0.8], [0.55, 0.95, 0.3]], BRIM = [null, [0.85, 0.8, 1], [0.85, 1, 0.6]]; // не по зубам (сиреневые), съедобное
const ball = (x, y, r, side, seed) => bodies.sphere(x, y, r, BALL[side], BRIM[side], seed);
function paint(time) {
  const z = view.z, big = world.biggest();
  bodies.begin();
  const on = (x, y, pad = 80) => x > -pad && x < W + pad && y > -pad && y < H + pad;
  for (const g of world.slime) { // тяж слизи: прозрачный гель с налипшими крупинками; в нём плыть вязко
    const [x, y] = scr(g.x, g.y); if (!on(x, y, g.len * z)) continue;
    const ca = Math.cos(g.a), sa = Math.sin(g.a), n = Math.ceil(g.len / 9);
    for (let i = 0; i <= n; i++) {
      const u = (i / n - 0.5) * g.len, v = Math.sin(u / g.len * 6.283 + g.id) * g.w * 0.8 + Math.sin(time * 0.4 + i * 0.3) * 2;
      const px = x + (ca * u - sa * v) * z, py = y + (sa * u + ca * v) * z, edge = 1 - Math.abs(i / n - 0.5) * 2;
      glow.put(px, py, g.w * z * (0.7 + 0.5 * edge), 0.55, 0.8, 0.95, 0.045 * Math.min(1, edge * 3));
      if (i % 3 === 0) ink.put(px + Math.sin(i * 7.1) * g.w * 0.5 * z, py + Math.cos(i * 5.3) * g.w * 0.5 * z, 0.8 * z + 0.3, 0.8, 0.9, 1, 0.35);
    }
  }
  for (const p of world.slippers) { // туфелька: огромная клетка в ресничках, воронка-рот на боку, поток в рот виден
    const [x, y] = scr(p.x, p.y), L = cfg.slipper_len * z; if (!on(x, y, L)) continue;
    const ux = Math.cos(p.a), uy = Math.sin(p.a), w = L * 0.27;
    bodies.rod(x, y, p.a, L / 2, w, 0, [0.72, 0.95, 0.85], [0.32, 0.6, 0.48], p.id, Math.sin(time * 1.3 + p.id) * w * 0.15);
    for (let k = 0; k < 72; k++) { // реснички: волна бежит по краю
      const t = k / 72 * 6.283, c = Math.cos(t), s = Math.sin(t), e = 1.12 + 0.06 * Math.sin(t * 8 - time * 9);
      const px = x + ux * c * (L / 2) * e * 0.98 - uy * s * w * e, py = y + uy * c * (L / 2) * e * 0.98 + ux * s * w * e;
      ink.put(px, py, 0.9 * z + 0.3, 0.8, 1, 0.9, 0.45);
    }
    for (let k = 0; k < 6; k++) { const t = k * 1.9 + p.id, px = x + ux * Math.sin(t + time * 0.2) * L * 0.3 - uy * Math.cos(t * 1.3) * w * 0.5, py = y + uy * Math.sin(t + time * 0.2) * L * 0.3 + ux * Math.cos(t * 1.3) * w * 0.5;
      glow.put(px, py, w * 0.18, 1, 0.75, 0.4, 0.35); } // пищеварительные пузырьки
    const [mx, my] = scr(...world.mouth(p));
    for (let k = 0; k < 24; k++) { // поток в воронку: крупинки по спирали к рту
      const f = (time * 0.6 + k / 24) % 1, R = cfg.funnel_r * z * (1 - f), t = k * 2.4 + f * 3;
      glow.put(mx + Math.cos(t) * R, my + Math.sin(t) * R, 1.2 * z + 0.4, 0.8, 0.95, 1, 0.35 * f);
    }
    ink.put(mx, my, cfg.mouth_r * z * 0.8, 0.1, 0.2, 0.18, 0.6);
  }
  for (const v of world.bells) { // сувойка: колокольчик на стебле-пружине, венчик ресничек крутит вихрь
    const [x, y] = scr(v.x, v.y); if (!on(x, y, 200)) continue;
    const [bx, by] = scr(...world.bell(v)), r = cfg.bell_r * z, dx = Math.cos(v.dir), dy = Math.sin(v.dir), Ls = Math.hypot(bx - x, by - y);
    for (let k = 0; k <= 30; k++) { const f = k / 30, coil = v.shut > 0 ? Math.sin(f * 40) * 5 * z : Math.sin(f * 5 + time) * 2 * z;
      ink.put(x + dx * Ls * f - dy * coil, y + dy * Ls * f + dx * coil, 0.9 * z + 0.4, 0.7, 0.85, 0.8, 0.6); }
    bodies.sphere(bx, by, r, [0.75, 0.9, 0.88], [0.9, 1, 1], v.id, 0.7);
    if (v.shut > 0) continue;
    for (let k = 0; k < 20; k++) { const t = k / 20 * 6.283 + time * 6, cx = bx + dx * r * 0.9, cy = by + dy * r * 0.9;
      ink.put(cx + Math.cos(t) * r * 0.8, cy + Math.sin(t) * r * 0.35 * Math.abs(dx) + Math.sin(t) * r * 0.35, 0.9 * z + 0.3, 0.85, 1, 0.95, 0.6); }
    for (let k = 0; k < 18; k++) { const f = (time * 0.5 + k / 18) % 1, R = cfg.vortex_r * z * (1 - f), t = k * 2.1 - f * 6;
      glow.put(bx + Math.cos(t) * R, by + Math.sin(t) * R, 1.1 * z + 0.4, 0.7, 0.95, 1, 0.3 * f); } // вихрь
  }
  for (const q of world.rotis) { // коловратка: прозрачная «ваза» на телескопической ноге, на голове два колеса ресничек, внутри жуют челюсти
    const [x, y] = scr(q.x, q.y), L = cfg.roti_len * z; if (!on(x, y, L)) continue;
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
    for (let k = 0; k < 5; k++) ink.put(tx - vx * L * (0.04 + k * 0.03) + vy * Math.sin(k * 2.3) * w * 0.3, ty - vy * L * (0.04 + k * 0.03) - vx * Math.sin(k * 2.3) * w * 0.3, 1.3 * z + 0.4, 0.4, 0.9, 0.3, 0.6); // зелёные съеденные водоросли
    const chew = Math.abs(Math.sin(time * (4 + 4 * pw) + q.id)) * w * 0.14, jx = tx + vx * L * 0.1, jy = ty + vy * L * 0.1; // челюсти-мастакс
    for (const s of [-1, 1]) bodies.sphere(jx - vy * s * (w * 0.1 + chew), jy + vx * s * (w * 0.1 + chew), w * 0.17, [0.95, 0.75, 0.45], [1, 0.95, 0.7], q.id + s, 0.8);
    const hx = tx + vx * L * 0.22, hy = ty + vy * L * 0.22;
    for (const s of [-1, 1]) { // два колеса: реснички бегут по кругу навстречу друг другу, быстрее на полной силе
      const cx = hx - vy * s * w * 0.55, cy = hy + vx * s * w * 0.55, R = w * 0.55;
      glow.put(cx, cy, R * 1.8, 0.75, 0.92, 1, 0.1 + 0.15 * pw);
      for (let k = 0; k < 22; k++) { const t = k / 22 * 6.283 + s * time * (3 + 14 * pw);
        ink.put(cx + Math.cos(t) * R, cy + Math.sin(t) * R, 1.1 * z + 0.4, 0.9, 1, 1, 0.45 + 0.45 * pw);
        if (k % 2 === 0) ink.put(cx + Math.cos(t) * R * 1.25, cy + Math.sin(t) * R * 1.25, 0.8 * z + 0.3, 0.9, 1, 1, 0.25 + 0.35 * pw); }
    }
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
    for (let i = 0; i < 6; i++) {
      const t = i * 2.4 + k.id, d = i ? r * 0.45 * (0.6 + 0.4 * ((i * 0.37) % 1)) : 0;
      bodies.sphere(x + Math.cos(t) * d, y + Math.sin(t) * d, r * (i ? 0.42 : 0.55), [0.42, 0.28, 0.16], [0.75, 0.55, 0.35], k.id + i, 0.6);
    }
    for (let i = 0; i < 10; i++) { const t = i * 0.628 + k.id, d = r * (0.55 + 0.2 * Math.sin(i * 1.7 + time * 0.3)); ink.put(x + Math.cos(t) * d, y + Math.sin(t) * d, 1.1 * z + 0.4, 0.95, 0.85, 0.6, 0.55); }
  }
  for (const q of world.prey) { // кокки — соседи-соперники, сиреневые; с токсином зеленеют: касание их убьёт
    const [x, y] = scr(q.x, q.y); if (!on(x, y)) continue;
    const side = 1, r = radius(q.m) * z, kind = q.id % 4, a = q.a + time * 0.2;
    const ux = Math.cos(a), uy = Math.sin(a);
    if (kind === 0) { // шар с шипами, у каждого свой цвет шипов
      ball(x, y, r * 0.9, side, q.id);
      const hue = SPIKES[q.id % SPIKES.length];
      for (let k = 0; k < 14; k++) { const t = k * 0.4488 + a * 0.3, c = Math.cos(t), s = Math.sin(t);
        ink.put(x + c * r * 1.02, y + s * r * 1.02, 1.1 * z + 0.4, hue[0], hue[1], hue[2], 0.8);
        bodies.spike(x + c * r * 1.28, y + s * r * 1.28, 2.6 * z + 0.6, hue); }
    }
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
    bodies.rod(x, y, d.a, w * 2.1, w, 0, [1, 0.88, 0.55], [0.85, 0.6, 0.25], d.id, Math.sin(time * 1.5 + d.id) * w * 0.15);
    if (!(d.held > 0)) for (let k = 0; k < 14; k++) { const t = k / 14 * 6.283 + time * 0.8; glow.put(x + Math.cos(t) * w * 0.45, y + Math.sin(t) * w * 0.45, 1.1 * z + 0.4, 1, 0.95, 0.6, 0.7); } // плазмида
    if (d.to) { const [tx, ty] = scr(d.to.x, d.to.y), f = Math.min(1, d.link / cfg.conj); // пиля-мостик тянется, по нему бежит ДНК
      for (let k = 0; k <= 14; k++) { const u = k / 14 * f; ink.put(x + (tx - x) * u, y + (ty - y) * u, 1.2 * z + 0.4, 1, 0.95, 0.6, 0.8); }
      glow.put(x + (tx - x) * ((time * 2) % 1) * f, y + (ty - y) * ((time * 2) % 1) * f, 3 * z, 1, 0.9, 0.5, 0.6); }
  }
  for (const q of world.pseudos) { // синегнойка: палочка как ты, зеленоватая, один жгутик сзади
    const [x, y] = scr(q.x, q.y); if (!on(x, y)) continue;
    const w = 7.5 * z, ux = Math.cos(q.a), uy = Math.sin(q.a);
    const col = q.strain ? [0.66, 0.7, 0.76] : [0.45, 0.95, 0.72], rim = q.strain ? [0.32, 0.36, 0.44] : [0.15, 0.55, 0.42];
    if (q.held > 0) { bodies.sphere(x, y, w * 1.5, col, [1, 0.5, 0.3], q.id); glow.put(x, y, w * 3, 1, 0.3, 0.1, 0.15); continue; } // в ней хищник: шарик
    if (q.strain) { // чужой штамм кишечной палочки: серая, жгутики со всех сторон, как у тебя
      bodies.rod(x, y, q.a, w * 2.4, w * 1.05, 0, col, rim, q.id, Math.sin(time * 3 + q.id) * w * 0.15);
      for (let j = 0; j < 4; j++) for (let k = 1; k <= 12; k++) { const f = k / 12, s = j < 2 ? 1 : -1, b = (j % 2 ? 0.6 : -0.6) * w * 2;
        const wv = Math.sin(f * 9 - time * 22 + j) * w * 0.6 * f, dx = -uy * s * 3.5 - ux * 2.5, dy = ux * s * 3.5 - uy * 2.5, L = Math.hypot(dx, dy); // нить отходит вбок-назад и вьётся
        glow.put(x + ux * b - uy * s * w + dx * f * w - dy / L * wv, y + uy * b + ux * s * w + dy * f * w + dx / L * wv, Math.max(z, 0.7), 0.75, 0.8, 0.9, 0.4 * (1 - f * 0.5)); }
      continue;
    }
    bodies.rod(x, y, q.a, w * 2.3, w, 0, col, rim, q.id, Math.sin(time * 4 + q.id) * w * 0.2);
    for (let k = 1; k <= 28; k++) { const f = k / 28, wv = Math.sin(f * 10 - time * 26) * w * 0.6 * f;
      glow.put(x - ux * (w * 2.3 + f * w * 7) - uy * wv, y - uy * (w * 2.3 + f * w * 7) + ux * wv, 1.1 * Math.max(z, 0.7), 0.6, 1, 0.8, 0.55 * (1 - f * 0.5)); }
    if (q.cool > 0) glow.put(x, y, w * 3.5, 0.5, 1, 0.75, 0.25 * q.cool); // только что стреляла
  }
  zaps = zaps.filter(p => (p.t += 1 / 60) < 0.35);
  for (const p of zaps) { const [x1, y1] = scr(p.x, p.y), [x2, y2] = scr(p.x2, p.y2), f = 1 - p.t / 0.35; // гарпун: пружинный чехол выстреливает иглу
    for (let k = 0; k <= 12; k++) { const u = k / 12; ink.put(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 1.4 * z + 0.5, 0.7, 1, 0.8, 0.9 * f); }
    glow.put(x2, y2, 14 * z * f + 2, 0.7, 1, 0.8, 0.5 * f); }
  for (const b of world.bdellos) { // бделловибрион: запятая вдвое мельче тебя, один толстый жгутик; на рывке — след
    const [x, y] = scr(b.x, b.y); if (!on(x, y)) continue;
    const w = 4.2 * z, sp = Math.hypot(b.vx, b.vy), ang = b.a, ux = Math.cos(ang), uy = Math.sin(ang);
    bodies.rod(x, y, ang, w * 1.5, w, 0, [1, 0.38, 0.15], [0.75, 0.12, 0.08], b.id, w * 0.35); // слегка изогнутая запятая
    glow.put(x, y, w * 4, 1, 0.3, 0.1, 0.12 + (b.on ? 0.1 * Math.sin(time * 16) : 0));
    for (let k = 1; k <= 22; k++) { const s = k / 22, wv = Math.sin(s * 9 - time * 30) * w * 0.5 * s;
      glow.put(x - ux * (w * 1.5 + s * w * 6) - uy * wv, y - uy * (w * 1.5 + s * w * 6) + ux * wv, 1.1 * Math.max(z, 0.7), 1, 0.55, 0.3, 0.6 * (1 - s * 0.6)); }
    if (sp > 150) for (let k = 1; k <= 8; k++) ink.put(x - b.vx * 0.012 * k * z, y - b.vy * 0.012 * k * z, w * (1 - k / 10), 1, 0.4, 0.2, 0.18 * (1 - k / 9)); // рывок
  }
  for (const m of world.amoebas) {
    const [x, y] = scr(m.x, m.y); if (!on(x, y, 320)) continue;
    const side = m.m < big * 0.8 ? 2 : 1, r = radius(m.m) * z, sp = Math.hypot(m.vx, m.vy);
    const head = sp > 3 ? Math.atan2(m.vy, m.vx) : m.id, hx = Math.cos(head), hy = Math.sin(head);
    bodies.blobby(x, y, r * 0.95, head, sp > 3 ? 1 : 0.3, side === 2 ? BALL[2] : [1, 0.4, 0.12], side === 2 ? BRIM[2] : [1, 0.75, 0.35], m.id); // ложноножки — в шейдере
    for (let k = 0; k < 26; k++) { // ток зёрен к ведущей ложноножке
      const s = (time * 0.12 + k * 0.618) % 1, t = k * 2.39996 + Math.sin(time * 0.3 + k) * 0.4, d = r * 0.5 * ((k * 0.381) % 1);
      ink.put(x + Math.cos(t) * d + hx * r * 0.4 * (s - 0.5), y + Math.sin(t) * d + hy * r * 0.4 * (s - 0.5), 1.4 * z + 0.6, 0.12, 0.04, 0.08, 0.4);
    }
    const nx = x - hx * r * 0.2 + hy * r * 0.12, ny = y - hy * r * 0.2 - hx * r * 0.12; // ядро с ядрышком
    ink.put(nx, ny, r * 0.2, 0.3, 0.1, 0.15, 0.4); glow.put(nx, ny, r * 0.07, 1, 0.85, 0.9, 0.25);
    const v = (time / 6 + m.id * 0.37) % 1; // сократительная вакуоль: набухает и выплёскивает
    bubbles.put(x - hx * r * 0.45 - hy * r * 0.2, y - hy * r * 0.45 + hx * r * 0.2, r * 0.18 * Math.sqrt(v) + 1, 0.85, 0.95, 1, 0.3 * (1 - v * v * v));
  }
  const [cr, cg, cb] = [CELL[0].r, CELL[0].g, CELL[0].b];
  const b = genome.blink, lkAll = look(b && Math.sin(time * 9) > 0 ? { ...world.genes, [b]: !world.genes[b] } : world.genes, cfg.look, world.spacers.size); // на паузе мигает часть клетки, которую меняет выбранный ген
  if (kids) kids.forEach((a, i) => { a.x = view.x + (i ? 1 : -1) * W * 0.24 / z; a.y = view.y - 20 / z; a.a = -Math.PI / 2 + Math.sin(time * 0.8 + i * 2) * 0.12; a.m = 1.7 + 0.1 * Math.sin(time * 1.3 + i); }); // дочки покачиваются на месте
  const phageNear = world.phages.some(g => g.host === 'me' && Math.hypot(g.x - view.x, g.y - view.y) < 220);
  const foodNear = world.food.some(f => Math.hypot(f.x - view.x, f.y - view.y) < 120);
  for (const a of world.me) if (a.spore > 0) { // сон-персистер: та же палочка, но погасшая — серая, жгутики обвисли, редкое «дыхание»; перед пробуждением теплеет
    const [x, y] = scr(a.x, a.y), w = 8.5 * Math.pow(a.m, 0.3) * z, f = 1 - a.spore / cfg.spore, ux = Math.cos(a.a), uy = Math.sin(a.a);
    bodies.rod(x, y, a.a, w * 2.1, w, 0, [0.32 + 0.4 * f, 0.36 + 0.2 * f, 0.46 + 0.1 * f], [0.2, 0.25, 0.35], a.id, 0);
    for (let j = 0; j < 4; j++) for (let k = 1; k <= 10; k++) { const s = j % 2 ? 1 : -1, b = (j < 2 ? -0.5 : 0.5) * w * 2, f2 = k / 10; // обвисшие жгутики не бьют
      ink.put(x + ux * b - uy * s * (w + f2 * w * 2.5) - ux * f2 * w * 1.5, y + uy * b + ux * s * (w + f2 * w * 2.5) - uy * f2 * w * 1.5, 0.7 * z + 0.3, 0.5, 0.55, 0.65, 0.35); }
    glow.put(x, y, w * 2.4, 0.6, 0.7, 1, 0.06 + 0.08 * (0.5 + 0.5 * Math.sin(time * 1.2)) + 0.25 * f * f);
  }
  for (const a of kids || world.me) { // палочка: мягкое тело
    if (a.spore > 0) continue; // перёд ведёт, корма и пучок жгутиков идут по его следу
    const lk = a.g ? look({ ...world.genes, [a.g]: true }, cfg.look, world.spacers.size) : lkAll, w = 8.5 * Math.pow(a.m, 0.3) * z * (a.g ? 1.9 : 1), sp = Math.hypot(a.vx, a.vy);
    const run = sp > 25 && !a.tumble, wob = run ? 0.035 : 0.015; // встречное вращение тела к пучку: 3 раза в секунду
    const half = a.held > 0 ? w * (1.05 + 0.6 * a.held / cfg.bdello_kill) : w * (1.6 + 1.0 * Math.min(a.m, cfg.split) / cfg.split), tailW = w * 7.5 / z; // хищник внутри — клетка округляется в шарик
    const body = follow(a, half / z, tailW);
    const [x0, y0] = scr(body.cx, body.cy), sag = body.sag * z;
    const ang = body.ang + Math.sin(time * 18.8 + a.id) * wob, ax = Math.cos(ang), ay = Math.sin(ang);
    const x = x0 - ay * sag * 0.675, y = y0 + ax * sag * 0.675; // центр модели так, чтобы концы легли на хорду
    const along = (s, o = 0) => [x + ax * s - ay * o, y + ay * s + ax * o];
    const arc = u => -sag * 0.675 + sag * (1 - Math.min(1, (u * z / half) ** 2)); // прогиб в точке u (u — в единицах мира от центра)
    const pinch = a.m >= cfg.split ? 0.62 + 0.12 * Math.sin(time * 6) : 0; // перетяжка: вот-вот две
    bodies.rod(x, y, ang, half, w, pinch, [CELL[0].r, CELL[0].g, CELL[0].b], [CORE[0].r, CORE[0].g, CORE[0].b], a.id, -sag);
    if (a.grab) glow.put(x, y, half * 1.8, 1, 0.25, 0.15, 0.22 + 0.15 * Math.sin(time * 14)); // схвачена: бьётся в пасти
    if (world.rush > 0.05) glow.put(x, y, half * (1.4 + world.rush * 0.6), 1, 0.75, 0.35, 0.08 + 0.1 * world.rush); // разгон роста: рибосомы работают на всю
    if (pinch) for (let k = 0; k < 18; k++) { const t = k * 0.349, R = half * (1.35 + 0.08 * Math.sin(time * 5)); glow.put(x + Math.cos(t) * R, y + Math.sin(t) * R, 2.2, 1, 1, 1, 0.4); }
    for (let k = 0; k < 16; k++) { // пили: короткие ворсинки по всей оболочке
      const t = k / 16 * 6.283, c = Math.cos(t), s = Math.sin(t), l = 1 + 0.25 * Math.sin(time * 3 + k * 1.7 + a.id);
      for (const e of [1.08, 1.32 * l]) { const u = c * (half - w * 0.2) + c * w * (e - 1), [px, py] = along(u, s * w * e + arc(u / z)); ink.put(px, py, 0.9 * z + 0.4, 0.55, 0.9, 1, 0.55); }
    }
    if (lk.halo) for (let k = 0; k < 30; k++) { // капсула: прозрачный ореол слизи вокруг тела, слегка колышется
      const t = k / 30 * 6.283, c = Math.cos(t), s = Math.sin(t), e = 1.55 + 0.08 * Math.sin(time * 2 + k * 0.9), u = c * (half - w * 0.2) + c * w * (e - 1);
      const [px, py] = along(u, s * w * e + arc(u / z)); glow.put(px, py, w * 0.5, 0.75, 0.95, 1, 0.09);
    }
    for (let k = 0; k < lk.stripes; k++) { // CRISPR: полоски-штрихкод поперёк тела, вспыхивают, когда рядом знакомый фаг
      const u = (k - (lk.stripes - 1) / 2) * w * (0.32 + 0.1 * (k % 2)), al = phageNear && world.spacers.size ? 0.55 + 0.35 * Math.sin(time * 12) : 0.3;
      for (let j = -3; j <= 3; j++) { const [px, py] = along(u, j * w * 0.2 + arc(u / z)); glow.put(px, py, 0.9 * z + 0.3, 0.7, 1, 0.8, al); }
    }
    for (let k = 0; k < lk.toxin; k++) { // токсин: тёмные точки у края
      const t = k / lk.toxin * 6.283 + a.id, u = Math.cos(t) * (half - w * 0.45), [px, py] = along(u, Math.sin(t) * w * 0.78 + arc(u / z));
      ink.put(px, py, 1.3 * z + 0.4, 0.12, 0.02, 0.1, 0.75);
    }
    for (let k = 0; k < lk.pili; k++) { const t = k / lk.pili * 6.283 + 0.1, ct = Math.cos(t), st = Math.sin(t); // фимбрии: короткие прямые волоски; прилип — натянуты
      for (let j = 0; j < 3; j++) { const e = 1.04 + j * (a.stuck ? 0.13 : 0.09), u = ct * (half - w * 0.1) * (1 + (e - 1) * 0.5), [px, py] = along(u, st * w * e + arc(u / z)); ink.put(px, py, 0.8 * z + 0.3, 0.85, 0.9, 0.8, a.stuck ? 0.75 : 0.45); } }
    for (let k = 0; k < lk.studs; k++) { const t = k / lk.studs * 6.283 + 0.2, u = Math.cos(t) * (half - w * 0.15), [px, py] = along(u, Math.sin(t) * w * 1.02 + arc(u / z)); ink.put(px, py, 1.5 * z + 0.4, 0.25, 0.45, 1, 0.85); }
    if (world.plasmid && !a.g) for (let k = 0; k < 12; k++) { const t = k / 12 * 6.283 + time * 0.8, [px, py] = along(Math.cos(t) * w * 0.35 + w * 0.3, Math.sin(t) * w * 0.35); glow.put(px, py, 0.9 * z + 0.4, 1, 0.95, 0.6, 0.7); } // плазмида: колечко ДНК, теперь и ты донор
    if (lk.dormant) { const [px, py] = along(-half + w * 0.9, arc(-half / z + w * 0.9 / z)); glow.put(px, py, w * 0.6, 0.45, 0.55, 1, 0.3 + 0.15 * Math.sin(time * 1.2 + a.id)); } // ген сна: у кормы тусклое голубое пятно медленно дышит
    for (let k = 0; k < lk.receptors; k++) { // хемотаксис: рецепторы на переднем конце мигают, когда чуют еду
      const t = (k - 2) * 0.35, [px, py] = along(half - w * 0.15 + Math.cos(t) * w * 0.1, Math.sin(t) * w * 0.85 + arc(half / z));
      glow.put(px, py, 1.4 * z + 0.4, 1, 0.95, 0.5, foodNear ? 0.5 + 0.45 * Math.sin(time * 14 + k) : 0.25);
    }
    for (let k = 0; k < lk.ribosomes; k++) { // содержимое: розовые зёрна рибосом (быстрый рост — их вдвое больше)
      const t = k * 2.4 + a.id, u = Math.sin(t + time * 0.2) * (half - w * 0.8), [px, py] = along(u, Math.cos(t * 1.7 + time * 0.25) * w * 0.45 + arc(u / z));
      glow.put(px, py, 1.6 * z + 0.6, 1, 0.35, 0.75, 0.35);
    }
    for (let k = 0; k < 4; k++) { // зёрна плывут внутри
      const t = time * (0.5 + k * 0.17) + a.id * 1.3 + k * 2.1, u = Math.sin(t) * (half - w * 0.6), [px, py] = along(u, Math.cos(t * 1.3) * w * 0.4 + arc(u / z));
      ink.put(px, py, 0.9 * z + 0.7, 0.85, 1, 0.95, 0.5);
    }
    // жгутики: на бегу — пучок за кормой, ложится по дуге пути; в кувырке — веером, два кудрявые; на месте — врозь и медленно
    const fan = a.tumble ? a.tumble / cfg.swim.tumble_time : 0;
    const mid = (lk.flagella - 1) / 2, sp5 = 5 / lk.flagella; // пучок той же толщины, нитей больше
    for (let f = 0; f < lk.flagella; f++) {
      let bx, by, dx, dy;
      if (run || a.tumble) {
        const spread = fan * (f - mid) * 0.55 * sp5;
        [bx, by] = along(-half + w * 0.3, (f - mid) * w * 0.22 * sp5 + arc(half / z));
        dx = -Math.cos(ang + spread); dy = -Math.sin(ang + spread);
      } else { const t = f * 6.283 / lk.flagella + 0.6 + a.id, c = Math.cos(t), s = Math.sin(t); [bx, by] = along(c * (half - w * 0.5), s * w * 0.9); const l = Math.hypot(c * 1.2, s * 1.8); dx = (ax * c * 1.2 - ay * s * 1.8) / l; dy = (ay * c * 1.2 + ax * s * 1.8) / l; }
      const curly = fan > 0 && f % 3 === 1; // вышедший из пучка жгутик перекручивается
      for (let k = 1; k <= 40; k++) {
        const s = k / 40, back = s * w * (run ? 7 : 5.5), amp = w * (curly ? 0.8 : 0.42) * Math.min(1, s * 3);
        const wv = Math.sin(s * (curly ? 22 : 10) - time * (run ? lk.beat : 4) + f * 0.5) * amp, conv = run ? (f - mid) * sp5 * w * 0.22 * (s * 0.9) : 0;
        let px = bx + dx * back, py = by + dy * back, nx = dy, ny = -dx;
        if (run) { // пучок лежит на следе клетки: где она прошла, там и хвост
          const [qx, qy] = scr(...body.at(2 * half / z + back / z)), [rx, ry] = scr(...body.at(2 * half / z + back / z + 2));
          const ox = -ay * (f - mid) * sp5 * w * 0.22, oy = ax * (f - mid) * sp5 * w * 0.22; // свой сдвиг жгутика в пучке
          const tl = Math.hypot(rx - qx, ry - qy) || 1; nx = -(ry - qy) / tl; ny = (rx - qx) / tl;
          px = qx + ox * (1 - s * 0.9); py = qy + oy * (1 - s * 0.9);
        }
        glow.put(px + nx * (wv - conv), py + ny * (wv - conv), 0.8 * Math.max(z, 0.7) + 0.3, cr, cg, cb, 0.5 * (1 - s * 0.5));
      }
    }
    if (a.sick >= 0) glow.put(x, y, half, 1, 0.2, 0.3, 0.25 + 0.2 * Math.sin(time * 20));
  }
  for (const a of world.me) { // след: клетка расталкивает взвесь, частицы расходятся и гаснут — вязкость видна
    const sp = Math.hypot(a.vx, a.vy); if (sp < 40 || puffs.length > 230) continue;
    const ux = Math.cos(a.a), uy = Math.sin(a.a), rr = radius(a.m), side = Math.random() < 0.5 ? -1 : 1;
    puffs.push({ x: a.x - ux * rr * 1.3 - uy * side * rr * 0.6, y: a.y - uy * rr * 1.3 + ux * side * rr * 0.6, vx: -uy * side * 18 - ux * 6, vy: ux * side * 18 - uy * 6, t: 0 });
  }
  puffs = puffs.filter(p => (p.t += 1 / 60) < 1.4);
  for (const p of puffs) { p.x += p.vx / 60; p.y += p.vy / 60; p.vx *= 0.95; p.vy *= 0.95; const [x, y] = scr(p.x, p.y); wake.put(x, y, (1.1 + p.t) * z, 0.8, 0.92, 1, 0.3 * (1 - p.t / 1.4)); }
  for (const f of world.food) { // сахар: мелкие светящиеся зёрна
    const [x, y] = scr(f.x, f.y); if (!on(x, y, 20)) continue;
    const k = Math.sqrt(f.s || 1); glow.put(x, y, 9 * z * k, 1, 0.8, 0.35, 0.14); glow.put(x, y, 3.2 * z * k + 0.6, 1, 0.93, 0.65, 0.9); // крупный кусок крупнее и светит ярче
  }
  for (const g of world.phages) { // фаг T4: головка позади, хвостом вперёд — садится хвостом
    const [x, y] = scr(g.x, g.y); if (!on(x, y)) continue;
    const s = 6 * z + 1, d = g.d, ux = Math.cos(d), uy = Math.sin(d); // сам не плывёт: смотрит куда попало, прилипший — ножками в клетку
    const P = (a, b) => [x + ux * a - uy * b, y + uy * a + ux * b];
    const pink = (p, r, al = 0.95) => ink.put(p[0], p[1], r, 0.82, 0.8, 0.92, al); // серебристый, как на снимках
    bodies.phage(x, y, d, s);
    if (g.host === 'me') glow.put(...P(-2.1 * s, 0), s * 1.8, 1, 0.3, 0.4, g.on ? 0.25 + 0.15 * Math.sin(time * 14) : 0.1); // красное свечение: опасен тебе
    pink(P(0.85 * s, -0.35 * s), s * 0.22); pink(P(0.85 * s, 0.35 * s), s * 0.22);
    for (let k = 0; k < 6; k++) {
      const sd = k < 3 ? -1 : 1, i = k % 3, wig = Math.sin(time * 9 + k + g.x) * s * 0.15;
      const kx = 0.85 * s + s * (0.35 + 0.15 * i), ky = sd * s * (0.7 + 0.4 * i), ex = 0.85 * s + s * (1.4 + 0.25 * i) + wig, ey = sd * s * (0.55 + 0.45 * i);
      for (let t = 0.33; t <= 1; t += 0.33) { pink(P(0.85 * s + (kx - 0.85 * s) * t, sd * 0.35 * s + (ky - sd * 0.35 * s) * t), s * 0.11, 0.8); pink(P(kx + (ex - kx) * t, ky + (ey - ky) * t), s * 0.11, 0.8); }
    }
  }
  for (const r of rings) { // вспышка-кольцо
    const k = r.t / 0.6, [x, y] = scr(r.x, r.y), R = r.r * z * (0.3 + k), c = CELL[r.side];
    for (let i = 0; i < 28; i++) { const t = i * 0.2244; glow.put(x + Math.cos(t) * R, y + Math.sin(t) * R, 4 * (1 - k) + 1.2, c.r, c.g, c.b, 0.6 * (1 - k)); }
  }
  if (down) { // джойстик под большим пальцем: кольцо в точке касания и шарик за пальцем
    for (let i = 0; i < 32; i++) { const t = i * 0.19635; glow.put(down.x + Math.cos(t) * STICK, down.y + Math.sin(t) * STICK, 2.2, 1, 1, 1, 0.25); }
    const dx = finger.x - down.x, dy = finger.y - down.y, l = Math.hypot(dx, dy), k = l > STICK ? STICK / l : 1;
    glow.put(down.x + dx * k, down.y + dy * k, 26, 0.7, 0.95, 1, 0.22);
  } else if (!moved && world.me.length) { // подсказка без слов: палец внизу экрана тянет вверх
    const k = (time / 1.6) % 1, x = W / 2, y = H * 0.78;
    for (let i = 0; i < 32; i++) { const t = i * 0.19635; glow.put(x + Math.cos(t) * STICK, y + Math.sin(t) * STICK, 2.2, 1, 1, 1, 0.2); }
    glow.put(x, y - STICK * k, 26, 1, 1, 1, 0.35 * (1 - k * 0.5));
  }
  const wrap = (v, n) => ((v % n) + n) % n;
  for (let i = 0; i < 32; i++) { // вдали: частицы в расфокусе — кольца, плывут медленнее
    const h = Math.abs(Math.sin(i * 91.7) * 43758.5) % 1, h2 = Math.abs(Math.sin(i * 12.9) * 9631.2) % 1;
    const warm = i % 3 === 0; // тёплые огоньки вдали, как на снимках
    far.put(wrap(h * 1400 - view.x * 0.35, 1400) - 340, wrap(h2 * 2400 - view.y * 0.35, 2400) - 500, (warm ? 6 : 14) + h * (warm ? 14 : 46), warm ? 1 : 0.6, warm ? 0.55 : 0.8, warm ? 0.2 : 1, warm ? 0.25 : 0.025 + h2 * 0.035);
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
  $('scale').style.width = (260 * z * innerWidth / W) + 'px';
  U.tint.value.set(...view.tint);
  U.drift.value.set(view.x * view.z / W, -view.y * view.z / W); // в ширинах экрана: слои сзади сдвигаются медленнее
  for (const d of [far, glow, ink, near, dust, bubbles, wake]) d.done();
}

// Замер для проверки: кадры, худший и средний кадр за последние 5 с, число клеток и точек.
window.zaplyvWorld = () => world; // для проверок и кадров
const probe = window.zaplyvProbe = { frames: 0, worst: 0, avg: 0, js: 0, jsWorst: 0, cells: 0, dots: 0, errors: 0 };
addEventListener('error', () => probe.errors++);
let last = performance.now(), acc = [], js = [];
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  const play = !ended; // замер «средний кадр» — только пока плывёшь; экран гибели в него не подмешивается
  if (play) { acc.push(now - last); if (acc.length > 300) acc.shift(); }
  last = now;
  const t0 = performance.now();
  if (!ended && !paused) tick(dt);
  if (paused && world.me.length) { // клетка — в середину кольца, крупно
    const c = world.me.reduce((b, a) => a.m > b.m ? a : b), [fx, fy] = genome.center(), k = Math.min(1, dt * 4);
    const z = cfg.genome_zoom * genome.inner() * W / innerWidth / (25 * Math.pow(c.m, 0.3)); // полклетки ≈ 25·m^0.3 единиц мира
    view.z += (z - view.z) * k;
    view.x += (c.x - (fx - 0.5) * W / view.z - view.x) * k; view.y += (c.y - (fy - 0.5) * H / view.z - view.y) * k;
  }
  { const hide = ended || paused || !!kids; if (hide !== frame.hid) { frame.hid = hide; $('pause').style.display = $('flag').style.display = hide ? 'none' : ''; } }
  for (const r of rings) r.t += dt;
  rings = rings.filter(r => r.t < 0.6);
  shake = Math.max(0, shake - dt * 0.9);
  sway = [Math.sin(now / 1000 * 5) * 6 * shake, Math.sin(now / 1000 * 3.7 + 1) * 4 * shake];
  // Экран гибели или кабинет закрыли мир: кадр не перерисовываем (раньше мир под ними рисовался дальше, и в WebKit без видеокарты кадр рос с 27 до 50 мс).
  const covered = $('end').classList.contains('on') || $('cabinet').classList.contains('on');
  probe.covered = covered;
  if (covered) { probe.frames++; requestAnimationFrame(frame); return; }
  U.time.value = now / 1000;
  paint(now / 1000);
  if (!ended) { js.push(performance.now() - t0); if (js.length > 300) js.shift(); }
  gl.autoClear = false;
  gl.setRenderTarget(rt); gl.render(water, cam); gl.setRenderTarget(null);
  gl.clear();
  gl.render(back, cam);
  gl.clearDepth();
  gl.render(bodies.scene, bodies.cam);
  gl.render(scene, cam);
  probe.frames++; probe.cells = world.me.length;
  probe.js = js.reduce((s, v) => s + v, 0) / Math.max(js.length, 1); probe.jsWorst = Math.max(0, ...js.slice(5)); probe.path = Math.max(probe.path || 0, world.stats.path);
  probe.dots = world.food.length + world.prey.length + world.phages.length;
  probe.worst = Math.max(...acc.slice(5)); probe.avg = acc.reduce((s, v) => s + v, 0) / Math.max(acc.length, 1); probe.ended = ended;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
