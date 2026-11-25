// «Заплыв» на экране (Three.js). Управление большим пальцем: коснулся где угодно — там встал джойстик,
// сдвиг пальца от этой точки задаёт, куда и как быстро плыть; короткое касание — вытянувшиеся делятся.
// Клетки — объёмные тела со светом (body3d.js): капсулы, шары с шипами, амёбы, гранёные фаги.
// Сверху — точки: еда, жгутики, крупинки внутри клеток, фаги, взвесь вдали и размытые соринки вблизи.
import * as THREE from './three.module.min.js';
import { World, radius } from './sim.js';
import * as mut from './mutacii.js';
import * as rost from './rost.js';
import * as dv from './dvizhok.js'; // палочки-соседи рисуются по анкетам (vidy.json)
import * as evo from './evo.js'; // режим «Эволюция»: пока только по адресу ?rezhim=evo, плитка в меню — когда все умения нарисованы
import { Stick } from './controls.js';
import { follow } from './soft.js';
import { look } from './look.js';
import * as vid from './vid.js';
import { Fx } from './fx.js';
import { Bodies } from './body3d.js';
import { genomeScreen } from './genome.js';
import { mark, message } from './feedback.js';
import { almanahScreen } from './almanah.js';
import { night } from './night.js';
import * as karta from './karta.js';

const cfg = await (await fetch('data.json')).json();
const DL = cfg.delenie; // деление по физике (design/zaplyv_fizika_kak_v_zhizni.md, п. 14)
const NJ = await (await fetch('night.json')).json(); // «Ночь рода»: числа ночи
const cards = await (await fetch('cards.json')).json();
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
const bodies = new Bodies();
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
let puffs = [], cur = [0, 0], kids = null;

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
  if (!audio || ROD.quiet) return;
  const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
};

const STICK = 56; // полный ход большого пальца (~30 точек экрана); дальше кольцо едет за пальцем
const pad = new Stick(STICK);
let world, view, finger = null, down = null, moved = false, shake = 0, ended = false, lastEat = 0;
const $ = id => document.getElementById(id);
const ver = (await (await fetch('version.json')).json()).number; // свой номер «Заплыва», список — VERSIONS.md
$('ver').textContent = 'Заплыв ' + ver;
fetch('../version.txt').then(r => r.ok ? r.text() : '').then(t => { if (t.trim()) $('ver').textContent = 'Заплыв ' + ver + ' · ' + t.trim().slice(0, 7); }).catch(() => {});

function start(genes, mode) {
  world = new World(cfg, (Math.random() * 2 ** 31) | 0); world.mode = mode || 'swim'; // режим «Мутации» включает новые мутации (mutacii.js)
  world.posle = Object.fromEntries(Object.values(GENY.geny || {}).filter(q => q.klyuch).map(q => [q.klyuch, q.posle || []])); world.known = met; // ген от того, кого уже встречал
  if (Array.isArray(genes)) world.inherit(genes); // заплыв веткой рода после «Ночи рода»
  $('night').classList.remove('on'); $('menu').classList.remove('on');
  view = { x: 0, y: 0, z: 2.2, tint: [...TINT[0]] };
  fx.reset(); fx.world = world; ended = false; // fx читает мир: сидящие вирусы, запятые, амёбы
  $('end').classList.remove('on');
}
$('again').onclick = () => start(null, world.mode); // снова в том же режиме
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
  mut: { go: 'Плыть с мутациями', line: 'Та же капля, но дочки и соседки приносят новые мутации' },
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
    const t = document.createElement('div'); t.className = 'mtip'; t.textContent = M.lock; o.appendChild(t); o.classList.add('peek'); // тронутое видно резко, даже когда выбран другой
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
const SVYAZI = await fetch('kniga/kto_s_kem.json').then(r => r.ok ? r.json() : {}).catch(() => ({})); // кто кого ест — связи карточек Альманаха
const KNIGA = await fetch('kniga/teksty_sushchestv.json').then(r => r.ok ? r.json() : {}).catch(() => ({})), TEKSTY = KNIGA.sushchestva || {}, PODPISI = KNIGA.podpisi || {}; // тексты книги
// Снимок модели: на миг подменяем мир студией с одним существом в середине кадра, рисуем тем же paint и вырезаем середину.
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
function snap(k, it) {
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
// Значок гена (макет дизайнера: круг, тело приглушено, часть, которую даёт ген, подсвечена). Снимаем клетку без гена и с геном
// той же студией, что Альманах, и оставляем ярким только то, что изменилось: сам ген на теле. Кеш — снимаем один раз.
const icons = new Map();
function geneShot(g, NW, NH, crop = 0) {
  shotDensity();
  const grab = genes => {
    const fxs = fx.save(), keep = [world, view, kids, down, moved, puffs, paint.t], c = document.createElement('canvas'); c.width = NW; c.height = NH;
    try {
      world = studio('me', { a: -0.5 }); world.genes = genes; kids = null; down = null; moved = true; fx.reset(); puffs = [];
      const side = Math.min(W, H) * 0.9; view = { x: 0, y: 0, z: side * 0.62 / cfg.icon_span, tint: [...TINT[0]] };
      for (let i = 0; i < 4; i++) { paint.t = 30; render(30); } // время стоит: оба снимка в одной позе, разница — только ген
      const sx = canvas.width / W, cw = side * sx * 0.62 * Math.max(1, NW / NH), ch = cw * NH / NW;
      c.getContext('2d').drawImage(canvas, (canvas.width - cw) / 2, (canvas.height - ch) / 2, cw, ch, 0, 0, NW, NH);
    } finally { [world, view, kids, down, moved, puffs, paint.t] = keep; fx.load(fxs); }
    return c.getContext('2d').getImageData(0, 0, NW, NH);
  };
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
  if (!icons.has(g)) { let url = ''; try { url = geneShot(g, 320, 320, 128); } catch (e) { url = ""; } icons.set(g, url); }
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
let toastT = 0;
// Пауза с геномом: мир замирает, твоя клетка крупно в середине кольца ДНК.
let paused = false;
const genome = genomeScreen({ G: genomeData, cfg, world: () => world, icon: g => icon(g),
  onOpen: () => { paused = true; document.body.classList.add('paused'); pad.end(0); down = null; finger = null; openTab(); },
  onClose: () => { paused = false; document.body.classList.remove('paused'); leaveTabs(); },
  onSend: () => openMarks(), onDraw: () => showMarks() });

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
const PNAME = { hub: 'Пауза', genome: 'Геном', map: 'Карта', alm: 'Альманах' };
function tab(t) {
  curTab = t; const G = $('genome'), C = $('cabinet');
  for (const k in PNAME) G.classList.toggle('tab-' + k, t === k);
  $('gtitle').textContent = PNAME[t]; $('map').hidden = t !== 'map'; $('mcard').hidden = true;
  if (t === 'hub') hubFill();
  $('gback').textContent = '‹ Пауза';
  if (t === 'alm') { knowGenes(); kab.open('Пауза'); kab.back = () => tab('hub'); C.classList.add('inpause'); const top = $('ghead').getBoundingClientRect().bottom + 6, bot = innerHeight - $('gbar').getBoundingClientRect().top + 8;
    C.style.top = top + 'px'; C.style.bottom = bot + 'px'; } else if (C.classList.contains('inpause')) { kab.close(); kab.back = null; C.classList.remove('inpause'); C.style.top = C.style.bottom = ''; }
  if (t === 'map') { keepSeen(); mapOpenedAt = performance.now(); }
}
function hubFill() { // первый уровень паузы: что в каждом разделе — одной строкой, служебное — мелко
  const own = genomeData.arcs.flatMap(a => a.slots), deaths = KARTA.marks.filter(m => m.kind === 'death').length;
  $('pstate').textContent = ($(`mscene`).querySelector(`.mo[data-m=${world.mode}] b`)?.textContent || 'Заплыв') + ' · поколение ' + world.stats.gen + ' · клеток ' + world.me.length;
  $('pg').textContent = `включено ${own.filter(x => x.id && world.genes[x.id]).length} из ${own.length}`;
  $('pa').textContent = kab.label().replace(/^Альманах · /, '');
  keepSeen(); $('pm').textContent = karta.count(cfg.pond, new Set(KARTA.seen)).replace(/^Ты в/, 'В') + (deaths ? ` · гибелей ${deaths}` : '');
  $('psound').textContent = ROD.quiet ? 'Звук выключен' : 'Звук включён';
  const n = $('pnew'); n.sure = false; n.classList.remove('sure'); n.textContent = 'Новый заплыв';
}
// Значки строк паузы — живые снимки разделов (Роман 25.11: «значок генома можно найти красивый»): твоё кольцо ДНК со включёнными генами
// вокруг твоей клетки, последний встреченный в Альманахе, разрез пруда с отметками. Меняются вместе с игрой.
function hubIcons() {
  const [gi, ai, mi] = $('phub').querySelectorAll('.pico'), S = 104, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  const own = genomeData.arcs.flatMap(a => a.slots.map(sl => [sl, a.color])), step = Math.PI * 2 / own.length, me = new Image();
  me.onload = () => { x.fillStyle = '#061018'; x.fillRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(S / 2, S / 2, 31, 0, 7); x.clip(); x.drawImage(me, S / 2 - 46, S / 2 - 46, 92, 92); x.restore();
    x.lineWidth = 11; own.forEach(([sl, c], i) => { const on = sl.id && world.genes[sl.id]; x.strokeStyle = c; x.globalAlpha = on ? 1 : 0.22; x.beginPath(); x.arc(S / 2, S / 2, 42, -Math.PI / 2 + i * step + 0.05, -Math.PI / 2 + (i + 1) * step - 0.05); x.stroke(); });
    x.globalAlpha = 1; gi.src = cv.toDataURL(); };
  me.src = snap('me', KAB.items.me);
  const last = [...met].reverse().find(k => KAB.items[k] && k !== 'me') || 'me'; ai.src = snap(last, KAB.items[last]);
  const mc = document.createElement('canvas'); mc.width = mc.height = 320; karta.draw(mc.getContext('2d'), 320, 320, { P: cfg.pond, seen: new Set(KARTA.seen), marks: KARTA.marks, icons: {}, me: null, t: 9, hot: -1 }); mi.src = mc.toDataURL();
}
function openTab() { tab('hub'); try { hubIcons(); } catch (e) {} }
function leaveTabs() { const C = $('cabinet'); if (C.classList.contains('inpause')) { kab.close(); kab.back = null; C.classList.remove('inpause'); C.style.top = C.style.bottom = ''; } curTab = null; }
for (const b of $('phub').querySelectorAll('.prow')) b.onclick = () => tab(b.dataset.t);
$('gback').onclick = () => { if (curTab === 'alm' && kab.where()) kab.goBack(); else tab('hub'); }; // в Альманахе «назад» идёт по шагам: карточка → прошлая карточка → полка → пауза
$('psound').onclick = () => { ROD.quiet = !ROD.quiet; saveRod(); hubFill(); };
$('pnew').onclick = () => { const n = $('pnew'); if (!n.sure) { n.sure = true; n.classList.add('sure'); n.textContent = 'Точно заново?'; return; } genome.close(); start(null, world.mode); }; // второе касание: текущий заплыв пропадёт
{ let sx = null; // смахивание от левого края вправо — назад на «Паузу», как в приложениях iPhone
  $('genome').addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX < 28 ? [t.clientX, t.clientY] : null; }, { passive: true });
  $('genome').addEventListener('touchend', e => { if (!sx) return; const t = e.changedTouches[0]; if (t.clientX - sx[0] > 70 && Math.abs(t.clientY - sx[1]) < 60 && curTab !== 'hub') tab('hub'); sx = null; }, { passive: true }); }
// Метка-цель в заплыве: тонкая стрелка у края экрана в её сторону и расстояние; доплыл — гаснет сама.
window.zaplyvKarta = { data: () => KARTA, hits: () => mapHit }; // для обхода касаниями (tools/web/zaplyv_tap.mjs)
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
      for (const [u, nm] of [[m.img, 'mesto'], [m.full, 'kadr']]) if (u || nm === 'mesto') try { files.push(new File([await signed(u, head, m.text)], `ne_tak_${i + 1}_${nm}.jpg`, { type: 'image/jpeg' })); } catch (_) {} }
    if (navigator.share && files.length && navigator.canShare?.({ files })) await navigator.share({ text, files }); // картинки мест — вместе со словами
    else if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); say('Скопировано — вставь в чат', 2200); }
    marks = []; keepMarks();
    showMarks();
  } catch (e) { if (e?.name !== 'AbortError') say('Не отправилось — отметки целы, попробуй ещё', 2200); } /* отменил отправку — отметки остаются */
}
$('flag').onclick = e => { if (fdrag.used) { fdrag.used = false; return; } flag('игра', e.currentTarget); };
// Флажок пальцем (Б16, Роман 24.11: «куда я его могу поставить чтобы игра вырезала…»): тянешь флажок на то место, где не так,
// мир замирает, игра вырезает кусок кадра вокруг флажка и спрашивает словами, что не так. Отметка — строка с моментом и картинка.
let frozen = false; const fdrag = { on: false, used: false, x0: 0, y0: 0 };
$('flag').addEventListener('pointerdown', e => { if (ended || paused) return; fdrag.on = true; fdrag.drag = false; fdrag.x0 = e.clientX; fdrag.y0 = e.clientY; try { $('flag').setPointerCapture(e.pointerId); } catch (_) {} });
$('flag').addEventListener('pointermove', e => {
  if (!fdrag.on) return;
  if (!fdrag.drag && Math.hypot(e.clientX - fdrag.x0, e.clientY - fdrag.y0) > 14) { fdrag.drag = true; frozen = true; $('fpin').hidden = false; }
  if (fdrag.drag) { const f = $('fpin'); f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px'; }
});
$('flag').addEventListener('pointerup', e => { if (!fdrag.on) return; fdrag.on = false; if (fdrag.drag) { fdrag.used = true; flagAt(e.clientX, e.clientY); } });
$('flag').addEventListener('pointercancel', () => { fdrag.on = false; if (fdrag.drag) { $('fpin').hidden = true; frozen = false; } });
function flagAt(cx, cy) { // вырезаем кусок кадра вокруг флажка: 220 точек, флажок в нём
  $('fpin').hidden = true;
  render(paint.t || performance.now() / 1000); // свежий кадр в буфере — сразу снимаем
  const k = canvas.width / innerWidth, S = Math.min(innerWidth, innerHeight) * cfg.flag_cut, c = document.createElement('canvas'); c.width = c.height = 320;
  const x0 = Math.max(0, Math.min(innerWidth - S, cx - S / 2)), y0 = Math.max(0, Math.min(innerHeight - S, cy - S / 2));
  const g = c.getContext('2d'); g.drawImage(canvas, x0 * k, y0 * k, S * k, S * k, 0, 0, 320, 320);
  const fx = (cx - x0) / S * 320, fy = (cy - y0) / S * 320; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 7; g.beginPath(); g.arc(fx, fy, 22, 0, 6.283); g.stroke(); g.strokeStyle = '#ffb48a'; g.lineWidth = 3; g.stroke(); // где стоял флажок: рамка 3 на тёмном гало
  const [ux, uy] = unit({ clientX: cx, clientY: cy }), wp = toWorld(ux, uy);
  FLAG.img = c.toDataURL('image/jpeg', 0.8); FLAG.wp = wp;
  const a = document.createElement('canvas'); a.width = 720; a.height = Math.round(720 * innerHeight / innerWidth); a.getContext('2d').drawImage(canvas, 0, 0, a.width, a.height); FLAG.full = a.toDataURL('image/jpeg', 0.8); // и весь кадр — где это было; 720 в ширину, а не 360: мелкий кадр на телефоне мыльный (Роман 25.11: «Все стало расплывчатое»)
  $('fsheet').classList.toggle('top', cy > innerHeight / 2); // лист от дальнего края: место под флажком остаётся видно
  $('fimg').src = FLAG.img; $('ftext').value = ''; $('fsheet').classList.add('on');
}
const FLAG = {};
$('fsave').onclick = () => {
  const words = $('ftext').value.trim(), now = new Date(), at = `${now.getDate()}.${String(now.getMonth() + 1).padStart(2, '0')} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  let text; try { text = mark(world, cards, $('ver').textContent.replace('Заплыв ', ''), 'флажок на месте', cfg.flag_pin_r, FLAG.wp); } catch (e) { text = $('ver').textContent + ' · флажок на месте'; }
  marks.push({ at, text: (words ? '«' + words + '» · ' : '') + text, img: FLAG.img, full: FLAG.full });
  try { localStorage.setItem('zaplyv.marks', JSON.stringify(marks)); } catch (_) { marks[marks.length - 1].img = marks[marks.length - 1].full = ''; try { localStorage.setItem('zaplyv.marks', JSON.stringify(marks)); } catch (_) {} } // место кончилось — оставим слова
  showMarks(); fclose(); const n = $('note'), q = marks.length; n.textContent = q > 1 ? `⚑ Записано · ${q} ${q % 10 >= 2 && q % 10 <= 4 && (q % 100 < 12 || q % 100 > 14) ? 'отметки ждут' : q % 10 === 1 && q % 100 !== 11 ? 'отметка ждёт' : 'отметок ждут'} отправки` : '⚑ Записано с картинкой · отправить — на паузе'; n.classList.add('on', 'ok'); clearTimeout(noteT); noteT = setTimeout(() => n.classList.remove('on'), 2200);
};
const fclose = () => { $('fsheet').classList.remove('on'); frozen = false; };
$('fcancel').onclick = fclose;
$('gflag').onclick = e => flag('геном', e.currentTarget);
$('eno').onclick = e => flag('экран гибели', e.currentTarget);
$('esend').onclick = openMarks;
showMarks();
function meet(k) { // первая встреча в заплыве: имя и что делать (книга, «значит»), у опасных — в каждом заплыве, а не только в первый раз (L043)
  const t = TEKSTY[k] || {}, name = t.imya || cards[k]?.name, fresh = !met.has(k) && !!cards[k]; if (!name) return;
  if (fresh) { met.add(k); saveMet(); cabLabel(); beep(990, 0.12, 0.03, 'sine', 1.3); }
  if (fresh || t.otnoshenie === 'opasen') say(name + ': ' + (t.znachit || cards[k]?.tip || '') + (fresh ? ' · новое в Альманахе' : ''), 3200);
}
function say(text, ms, gene) { $('toast').textContent = text; if (gene) { const im = new Image(); im.src = icon(gene); im.className = 'ticon'; im.alt = ''; im.style.borderColor = geneColor(gene); $('toast').prepend(im); } $('toast').classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.remove('on'), ms); }
const told = new Set(); // подсказка — один раз и только в момент, когда она нужна
function tell(k, text) { if (told.has(k)) return; told.add(k); say(text, 2600); }
start(null, new URLSearchParams(location.search).get('rezhim') === 'evo' ? 'evo' : undefined); // скрытый режим «Эволюция»
if ((ROD.visits || ROD.deaths) && !evo.on(world)) menuOpen(); // со второго запуска игра открывается меню режимов (Роман: «почему нет меню выбора режима»); самый первый — сразу заплыв, без непонятных слов (дизайнер)
ROD.visits = (ROD.visits || 0) + 1; saveRod();

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

// Выбор навыка на ходу (Роман 25.11: «Прерывает игру зачем то — пускай просто всплывает навыки. Игра продолжается аккуратно»):
// мир не стоит, экран не перекрыт. Варианты всплывают полосой у нижнего края под большим пальцем; не выбрал за offer_fold с —
// полоса сворачивается в значок у края, коснёшься — снова раскроется; ждёт offer_auto с — берётся первый вариант.
let offerKey = '', offerT = 0; // offerT — время на часах телефона (performance.now), а не мира: полоса сворачивается за 6 настоящих секунд
function offer(dt) {
  const key = world.choice.join(), O = $('offer'), D = $('odot');
  if (!world.choice.length) { if (offerKey) { O.classList.remove('on'); D.classList.remove('on'); offerKey = ''; } return; }
  if (key !== offerKey) { // новый выбор: собрать полосу
    offerKey = key; offerT = performance.now(); $('otitle').textContent = evo.on(world) ? evo.E.zagolovok : $('otitle').dataset.d; const box = $('obtns'); box.innerHTML = '';
    world.choice.forEach(g => { const b = document.createElement('button'); b.innerHTML = '<img class="gicon" alt=""><span></span><small></small>';
      b.children[1].textContent = geneName(g); b.children[2].textContent = mut.daet(world, g, geneBook(g)); b.firstChild.src = icon(g); b.firstChild.style.borderColor = geneColor(g);
      b.onclick = e => { e.stopPropagation(); if (b.classList.contains('sel')) return take(g); // первое касание выбирает, второе берёт: случайный тап большим пальцем навык не возьмёт
        for (const q of box.children) q.classList.remove('sel'); b.classList.add('sel'); offerT = performance.now(); $('otitle').textContent = 'Коснись ещё раз — взять «' + geneName(g) + '»'; }; box.appendChild(b); });
    D.querySelector('img').src = icon(world.choice[0]); O.classList.add('on'); D.classList.remove('on'); beep(440, 0.3, 0.04, 'sine', 2);
  }
  const age = (performance.now() - offerT) / 1000;
  if (O.classList.contains('on') && age > cfg.offer_fold) { O.classList.remove('on'); D.classList.add('on'); } // свернулась в значок
  D.style.setProperty('--left', Math.max(0, 1 - age / cfg.offer_auto).toFixed(3)); // кольцо значка тает до автовыбора
  if (age > cfg.offer_auto) take(world.choice[0]); // так и не выбрал — первый вариант
}
function take(g) { world.pick(g); offer(0); say('Взято: ' + geneName(g), 2200, g); fx.ring(world.center().x, world.center().y, 0, 300); beep(660, 0.4, 0.06, 'sine', 1.5); }
$('odot').onclick = e => { e.stopPropagation(); offerT = performance.now(); $('offer').classList.add('on'); $('odot').classList.remove('on'); };
$('otitle').dataset.d = $('otitle').textContent;

// Твой путь за заход: время, поколения и сколько это заняло бы в природе, мутации, кто сколько отнял.
function pathText(w) {
  const s = w.stats, t = Math.round(s.time), mm = (s.gen * 20) | 0; // одно деление ≈ 20 минут при хорошей еде
  const nature = mm < 60 ? mm + ' мин' : Math.floor(mm / 60) + ' ч' + (mm % 60 ? ' ' + (mm % 60) + ' мин' : '');
  const genes = Object.keys(w.genes).map(geneName).join(', ') || 'пока нет';
  const lost = Object.entries(s.lost).map(([k, n]) => (TEKSTY[k]?.imya || (cards[k] ? cards[k].name : k)) + ' — ' + n).join(', ');
  return `Плыл ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}, проплыл ${Math.round(s.path / 26)} мкм<br>`
    + `Поколений: ${s.gen} — в природе это ≈ ${nature}<br>Клеток было до ${s.most}, съедено ${s.eaten}<br>`
    + `Мутации: ${genes}` + (lost ? `<br>Отняли клеток: ${lost}` : '');
}


function events() {
  for (const [k, x, y, size = 1, y2] of world.events) {
    fx.on(k, x, y, size, y2); // вид — fx.js, здесь звук и подписи
    if (k === 'spore') { beep(200, 0.6, 0.06, 'sine', 0.5); say('Уснула! Спящую не берут — переждёшь беду', 2600); }
    if (k === 'rost') { beep(440, 0.5, 0.05, 'sine', 1.5); say(rost.text(size), 3200); world.rostT = world.stats.time; } // режим «Рост»: подросла, что теперь можно есть
    if (k === 'igla') { beep(1300, 0.08, 0.05, 'square', 0.5); } // нить-игла уколола соперницу
    if (k === 'gulp') { beep(200, 0.35, 0.06, 'sine', 0.6); } // проглотила живую клетку
    if (k === 'spit') { beep(260, 0.15, 0.04, 'sine', 0.7); tell('spit', 'Пасть тебя не взяла: ты больше её рта'); }
    if (k === 'sprout') { beep(520, 0.3, 0.05, 'sine', 2); }
    if (k === 'gene') { beep(780, 0.3, 0.05, 'sine', 1.6); say('Ген от сородича: ' + geneName(size) + ' — ' + (geneBook(size).daet || ''), 2600, size); addMark({ kind: 'gene', x, y, who: 'gene:' + size }); } // конъюгация
    if (k === 'zap') { beep(1500, 0.05, 0.05, 'square', 0.4); } // выстрел гарпуна синегнойки
    if (k === 'grab') { beep(240, 0.2, 0.05, 'sawtooth', 1.6); say('Схватили! Резко развернись — вырвешься', 2600); /* каждый раз, не один за заплыв (L043) */ }
    if (k === 'bore') { beep(180, 0.3, 0.05, 'sawtooth', 0.7); say('Прилипла запятая! Резко развернись — стряхнёшь', 2600); } // запятая вбуравливается
    if (k === 'eat') { const n = performance.now(); if (n - lastEat > 60) { beep(300 + Math.random() * 200, 0.09, 0.04); lastEat = n; } }
    if (k === 'leave') { tell('leave', 'Дочка уплыла жить сама — мутации копятся дальше'); }
    if (k === 'meet') meet(x);
    if (k === 'stick') { beep(520, 0.06, 0.04, 'square'); if (!mut.calm(world)) tell('stick', 'Сел вирус! Резко развернись — стряхнёшь, пока не впрыснул'); } // прилип фаг: сказать сразу, а не на экране гибели (L042)
    if (k === 'shake') { beep(700, 0.07, 0.03); }
    if (k === 'learn') { beep(620, 0.4, 0.05, 'sine', 1.4); say('Пережила фага! Его кусок — новая полоска CRISPR: теперь T4 не страшен', 3000); }
    if (k === 'magnet') beep(392 * Math.pow(2, Math.min(size - 1, 12) / 12), 0.12, 0.05, 'sine', 1.3); // магнит: серия поглощений — восходящие ноты
    if (k === 'snap') { beep(1200, 0.06, 0.04, 'square', 0.3); } // сувойка сжалась пружиной
    if (k === 'slip') beep(900, 0.08, 0.03, 'sine', 1.5); // капсула сработала: амёба не удержала
    if (k === 'shrug') beep(1100, 0.05, 0.03); // новая дверь сработала: вирус отброшен
    if (k === 'bump') { beep(880, 0.05, 0.03); } // капсула: хищник отскочил
    if (k === 'pop') { beep(260, 0.25, 0.06, 'triangle', 0.6); } // чужая клетка лопнула
    if (k === 'pinch') { beep(1400, 0.05, 0.03, 'square', 0.6); tell('pinch', 'Кокк щиплет своим ядом — отплыви'); }
    if (k === 'sick') { beep(180, 0.3, 0.05, 'sawtooth', 0.7); }
    if (k === 'burst' || k === 'eaten') { shake = 0.35; beep(110, 0.45, 0.09, 'triangle', 0.5);
      const [sx, sy] = scr(x, y), who = k === 'burst' ? 'phage' : size; // погибла за краем экрана — говорим, кто её взял (урок L039)
      if (world.me.length && !(sx > 0 && sx < W && sy > 0 && sy < H)) { probe.lostFar = (probe.lostFar || 0) + 1; say('Сестра погибла за краем экрана: ' + ((cards[who] && cards[who].name) || 'хищник'), 2600); } }
  }
  world.events.length = 0;
}

function tick(dt) {
  offer(dt);
  world.step(dt, pad.value()); // джойстик: направление и сила из сдвига пальца
  { const [fx, fy] = world.flow(view.x, view.y); cur[0] += fx * dt; cur[1] += fy * dt; } // течение несёт взвесь
  events();
  if (!world.me.length) {
    if (!ended) {
      ended = true;
      const kk = world.stats.killer, k = cards[kk] || cards.me, t = TEKSTY[kk] || {}; // кто убил — словами книги и его моделью (урок L022)
      if (world.stats.where && kk) addMark({ kind: 'death', x: world.stats.where[0], y: world.stats.where[1], who: kk }); keepSeen(); // отметка на карте: где погиб и кто убил (Э19)
      $('who').textContent = t.ubil || k.who; $('cname').textContent = t.imya || k.name; $('ctext').textContent = t.kto || k.text;
      $('cfact').textContent = t.priroda || k.fact; $('ctip').textContent = t.sovet || k.tip || '';
      if (kk && KAB.items[kk] && kk !== 'me') $('cab').textContent = 'Кто это · ' + (t.imya || k.name) + ' в Альманахе'; else cabLabel(); // прогон 0.68: «Альманах» с гибели вёл в общий список, а не к убийце
      $('ckill').src = KAB.items[kk] ? snap(kk, KAB.items[kk]) : ''; $('ckill').hidden = !KAB.items[kk];
      $('stats').innerHTML = pathText(world);
      ROD.deaths = (ROD.deaths || 0) + 1; ROD.genes = Object.keys(world.genes).filter(g => world.genes[g]); ROD.most = world.stats.most; ROD.seed = world.seed; // род для ночи и меню
      const kl = world.stats.killer || 'me'; ROD.killers = ROD.killers || {}; ROD.killers[kl] = (ROD.killers[kl] || 0) + 1; saveRod();
      setTimeout(() => { $('end').classList.add('on'); $('end').scrollTop = 0; $('toast').classList.remove('on'); }, 700); // лист гибели всегда с начала: убийца сверху (L031) // подсказка заплыва не ложится на экран гибели
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
  view.z += (Math.max(want, C.min_px / radius(lead.m)) - view.z) * Math.min(1, dt * 1.5); // клетка на экране не мельче min_px в радиусе
  world.kamera?.(view, W, H); // стенд сравнения (stend.js) держит камеру сам: обе половины в кадре
  const t = TINT[world.biome(view.x, view.y)];
  for (let i = 0; i < 3; i++) view.tint[i] += (t[i] - view.tint[i]) * Math.min(1, dt * 0.8);
  { const b = world.me.reduce((q, a) => a.m > q.m ? a : q, world.me[0] || { m: 1 }), sp = world.split(); // размер числом: длина палочки в микрометрах (260 единиц — 10 мкм)
    const um = 2 * 8.5 * Math.pow(b.m, 0.3) * (1.6 + Math.min(b.m, sp) / sp) / 26; $('count').textContent = 'клеток ' + world.me.length + ' · ' + um.toFixed(1).replace('.', ',') + ' мкм'; }
  $('eaten').textContent = world.rush > 0.05 && !rost.on(world) ? 'рост ×' + (1 + world.rush).toFixed(1) : 'съедено ' + world.stats.eaten; // серия кусков подряд — рост быстрее
  if (world.readyToSplit() && !world.choice.length && !world.me.some(a => a.grab || a.held > 0) && !$('toast').classList.contains('on')) tell('split', 'Выросла! Коснись — поделишься. Или подожди'); // подсказка ждёт, пока на экране весть: не затирает «Сестра погибла за краем…» (L039)
}

// Вид «как под микроскопом» (тёмное поле): палочки длиной в 2–3 ширины растут в длину, внутри светлое
// облако нуклеоида и зёрна, у полюсов светлые шапочки; жгутики пучком на ходу и врозь на месте;
// кокки — одиночки, пары, цепочки, грозди; амёба с ложноножками, током зёрен, ядром и вакуолью;
// фаг T4 — вытянутая головка, хвост, пластинка и шесть ножек; вдали частицы в расфокусе кольцами.
const SPIKES = [[1, 0.45, 0.75], [1, 0.6, 0.2], [0.45, 0.7, 1], [0.8, 0.5, 1]];
const BALL = [null, [0.55, 0.48, 0.8], [0.55, 0.95, 0.3]], BRIM = [null, [0.85, 0.8, 1], [0.85, 1, 0.6]]; // не по зубам (сиреневые), съедобное
const ball = (x, y, r, side, seed) => bodies.sphere(x, y, r, BALL[side], BRIM[side], seed);
function paint(time) {
  const pdt = Math.min(0.05, Math.max(0, time - (paint.t ?? time))); paint.t = time; // шаг для плавных состояний рисунка
  const z = view.z, big = world.biggest();
  bodies.begin();
  const on = (x, y, pad = 80) => x > -pad && x < W + pad && y > -pad && y < H + pad;
  for (const g of world.slime) { // тяж слизи: прозрачный гель с налипшими крупинками; в нём плыть вязко
    const [x, y] = scr(g.x, g.y); if (!on(x, y, g.len * z)) continue;
    const ca = Math.cos(g.a), sa = Math.sin(g.a), n = Math.ceil(g.len / 9);
    for (let i = 0; i <= n; i++) {
      const u = (i / n - 0.5) * g.len, v = Math.sin(u / g.len * 6.283 + g.id) * g.w * 0.8 + Math.sin(time * 0.4 + i * 0.3) * 2;
      const px = x + (ca * u - sa * v) * z, py = y + (sa * u + ca * v) * z, edge = 1 - Math.abs(i / n - 0.5) * 2;
      const S = g.nest ? cfg.bdello_nest.look : cfg.slime_look, fade = Math.min(1, edge * 3); // гель прозрачный: внутри едва заметен, видна только граница — тонкая светлая кромка, а не пелена (Роман 25.11: «мутнота… фильтр»)
      glow.put(px, py, g.w * z * S.core, ...(S.color || [0.55, 0.8, 0.95]), S.core_a * fade); // гнездо запятых — ржавая биоплёнка, видна издали (L054)

      if (i % 3 === 0) ink.put(px + Math.sin(i * 7.1) * g.w * 0.5 * z, py + Math.cos(i * 5.3) * g.w * 0.5 * z, 0.8 * z + 0.3, 0.8, 0.9, 1, 0.35);
    }
    const S = g.nest ? cfg.bdello_nest.look : cfg.slime_look, m = Math.ceil(g.len * z / (g.nest ? Math.min(S.rim_step, S.rim * z * 0.8 + 0.2) : S.rim_step)); // у гнезда кромка внахлёст — сплошная // кромка геля сплошной тонкой линией с двух сторон
    for (let j = 0; j <= m; j++) { const u = (j / m - 0.5) * g.len, v = Math.sin(u / g.len * 6.283 + g.id) * g.w * 0.8 + Math.sin(time * 0.4 + j / m * n * 0.3) * 2, f = Math.min(1, (1 - Math.abs(j / m - 0.5) * 2) * 3);
      for (const sd of [-1, 1]) { const vv = v + sd * g.w * 0.5 * S.core; ink.put(x + (ca * u - sa * vv) * z, y + (sa * u + ca * vv) * z, S.rim * z + 0.3, ...(S.rim_c || [0.75, 0.92, 1]), S.rim_a * f); } }
  }
  { const Zc = cfg.zone, wn = world.warning(); // край зоны затягивания: тонкая сплошная линия (точки — язык еды, их не занимаем), еле видна всегда, ярче в полутора радиусах, разгорается только у ближайшей (L030)
    for (const zn of world.zones()) { const [wx, wy, R] = zn, [x, y] = scr(wx, wy), Rz = R * z; if (!on(x, y, Rz)) continue;
      const d = world.me.reduce((m, a) => Math.min(m, Math.hypot(a.x - wx, a.y - wy)), 1e9), lv = wn && wn.zone[0] === wx && wn.zone[1] === wy ? wn.level : 0;
      const al = (d < R * 1.5 ? Zc.near : Zc.far) + (Zc.warn - Zc.near) * lv, [cr, cg, cb] = Zc.color, sz = (0.6 + 0.4 * lv) * z + 0.5, n = Math.max(90, Math.ceil(6.283 * Rz / (sz * 0.9))); // точки внахлёст: сплошная линия, не пунктир (L047, Роман 25.11 про амёбу)
      const ala = al * Math.min(1, sz * 0.9 / Zc.step); for (let k = 0; k < n; k++) { const t = k / n * 6.283; ink.put(x + Math.cos(t) * Rz, y + Math.sin(t) * Rz, sz, cr, cg, cb, ala); } // точек втрое больше — каждая бледнее, линия той же силы
      for (let k = 0; k < Zc.ticks; k++) { const t = k / Zc.ticks * 6.283 + time * 0.2; // чёрточки внутрь: куда тянет, видно, даже когда рта не видно
        const nt = Math.max(6, Math.ceil(Rz * Zc.tick / (sz * 0.8))); for (let i = 0; i <= nt; i++) { const f = i / nt, r = Rz * (1 - Zc.tick * f); ink.put(x + Math.cos(t) * r, y + Math.sin(t) * r, sz * (1 - f * 0.5), cr, cg, cb, al * (1 - f * 0.6)); } } // чёрточка сплошная, сужается внутрь
      if (lv > 0) probe.warn[zn[3]] = (probe.warn[zn[3]] || 0) + 1;
      for (const a of world.me) { if (Math.hypot(a.x - wx, a.y - wy) > R) continue; const [ax, ay] = scr(a.x, a.y); // тебя тянет: штрихи бегут от клетки к рту
        for (let k = 0; k < Zc.streak; k++) { const f = (time * 1.2 + k / Zc.streak) % 1;
          for (let i = 0; i < 6; i++) { const u = (f + i * 0.015) * 0.7; ink.put(ax + (x - ax) * u, ay + (y - ay) * u, 1.1 * z + 0.5, cr, cg, cb, Zc.warn * (1 - f) * (0.4 + i * 0.12)); } } } } }
  const edgeArrow = (x, y, [cr, cg, cb], al, big = 1) => { // стрелка у края экрана, острием к тому, что за кадром
    const [cx, cy] = scr(view.x, view.y), a = Math.atan2(y - cy, x - cx), ux = Math.cos(a), uy = Math.sin(a), m = 34;
    const t = Math.min((ux > 0 ? W - m - cx : m - cx) / (ux || 1e-9), (uy > 0 ? H - m - cy : m - cy) / (uy || 1e-9)), px = cx + ux * t, py = cy + uy * t;
    for (let i = 0; i < 12; i++) { const s = i * 1.6 * big; ink.put(px + ux * s * 1.4, py + uy * s * 1.4, 4 * big, cr, cg, cb, al); ink.put(px + ux * 18 * big - (ux + uy) * s * 0.75, py + uy * 18 * big - (uy - ux) * s * 0.75, 4 * big, cr, cg, cb, al); ink.put(px + ux * 18 * big - (ux - uy) * s * 0.75, py + uy * 18 * big - (uy + ux) * s * 0.75, 4 * big, cr, cg, cb, al); } };
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
    vid.slipper({ x, y, a: p.a, L, w, z, time, id: p.id, mx, my, bodies, glow, ink }); // туфля с бороздкой, реснички-волоски, ядро, пузырьки (vid.js)
    for (let k = 0; k < 24; k++) { // поток в воронку: крупинки по спирали к рту
      const f = (time * 0.6 + k / 24) % 1, R = cfg.funnel_r * z * (1 - f), t = k * 2.4 + f * 3;
      glow.put(mx + Math.cos(t) * R, my + Math.sin(t) * R, 1.2 * z + 0.4, 0.8, 0.95, 1, 0.35 * f);
    }
    ink.put(mx, my, cfg.mouth_r * z * 0.8, 0.1, 0.2, 0.18, 0.6);
  }
  for (const v of world.bells) { // сувойка: колокольчик на стебле-пружине, венчик ресничек крутит вихрь
    const [x, y] = scr(v.x, v.y); if (!on(x, y, 200)) continue;
    const r = cfg.bell_r * z, dx = Math.cos(v.dir), dy = Math.sin(v.dir), [bx, by, open] = vid.bell({ x, y, dir: v.dir, Ls: cfg.bell_stalk * z, r, shut: v.shut || 0, time, id: v.id, z, ink }); // стебель: сжатие в спираль и развёртка — vid.js
    bodies.sphere(bx, by, r * (0.8 + 0.2 * open), [0.75, 0.9, 0.88], [0.9, 1, 1], v.id, 0.7); // свёрнутый бокал сжат в шарик
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
  for (const q of world.pseudos) { const [x, y] = scr(q.x, q.y); if (on(x, y)) dv.risuy(q, { x, y, z, time, bodies, glow }); } // палочки из анкет (vidy.json): тело, цепочка, цвет-метка, жгутики
  for (const e of world.events) if (e[0] === 'split') vid.splitAt(e[3], e[4]); // деление касанием случилось между шагами: рисуем его с первого же кадра, а не после шага
  fx.drawUnder({ scr, z, time, glow, ink }); mut.drawWorld({ w: world, scr, z, glow, ink, kids }); // пузырьки-обманки
  for (const b of world.bdellos) { // бделловибрион: запятая вдвое мельче тебя, один толстый жгутик; на рывке — след
    const [x, y] = scr(b.x, b.y); if (!on(x, y) && !b.aim) continue; // целится из-за кадра — линия прицела всё равно видна
    const w = 4.2 * z, sp = Math.hypot(b.vx, b.vy), ang = b.a, ux = Math.cos(ang), uy = Math.sin(ang);
    bodies.rod(x, y, ang, w * 1.5, w, 0, cfg.danger.bdello, [0.75, 0.12, 0.08], b.id, w * 0.35); // слегка изогнутая запятая
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
    vid.amoeba({ m, x, y, r, head, sp, side, time, z, glow, ink, bubbles, col: side === 2 ? BALL[2] : null });
  }
  const [cr, cg, cb] = [CELL[0].r, CELL[0].g, CELL[0].b], fc = cfg.flag.color;
  const b = genome.blink, lkAll = look(b && Math.sin(time * 9) > 0 ? { ...world.genes, [b]: !world.genes[b] } : world.genes, cfg.look, world.spacers.size); // на паузе мигает часть клетки, которую меняет выбранный ген
  if (kids) kids.forEach((a, i) => { a.x = view.x + (i ? 1 : -1) * W * 0.24 / z; a.y = view.y - 20 / z; a.a = -Math.PI / 2 + Math.sin(time * 0.8 + i * 2) * 0.12; a.m = 1.7 + 0.1 * Math.sin(time * 1.3 + i); }); // дочки покачиваются на месте
  const phageNear = world.phages.some(g => g.host === 'me' && Math.hypot(g.x - view.x, g.y - view.y) < 220);
  const foodNear = world.food.some(f => Math.hypot(f.x - view.x, f.y - view.y) < 120);
  for (const a of world.me) if (a.spore > 0) { // сон-персистер: та же палочка, но погасшая — серая, жгутики обвисли, редкое «дыхание»; перед пробуждением теплеет
    const [x, y] = scr(a.x, a.y); vid.sleeper({ a, x, y, z, time, cfg, bodies, glow, ink });
  }
  for (const a of kids || world.me) { // палочка: мягкое тело
    if (a.spore > 0) continue; // перёд ведёт, корма и пучок жгутиков идут по его следу
    const lk = a.g ? look({ ...world.genes, [a.g]: true }, cfg.look, world.spacers.size) : lkAll, w = (rost.on(world) ? 8.5 * Math.pow(a.m, rost.vid(world)) : DL.w) * z * (a.g ? 1.9 : 1), sp = Math.hypot(a.vx, a.vy); // толщина постоянная (физика п. 14), в «Росте» видно, что растёшь
    const fm = Math.min(a.m, world.split()) / world.split(), gr = vid.grow(fm, DL); // доля пути к делению: 0,5 у новорождённой, 1 у созревшей
    const run = sp > 25 && !a.tumble, wob = run ? 0.035 : 0.015; // встречное вращение тела к пучку: 3 раза в секунду
    const half = a.held > 0 ? w * (1.05 + 0.6 * a.held / cfg.bdello_kill) : rost.on(world) ? w * (1.6 + 1.0 * fm) : w * gr.half, tailW = w * 7.5 / z; // хищник внутри — клетка округляется в шарик
    const body = follow(a, half / z, tailW);
    const wm = w * Math.pow(2, rost.vid(world)); // мать: вдвое тяжелее, полудлина как у созревшей (см. half)
    const bo = vid.birth(a, time, world.me, body.ang, half / z, w / z, body.cx, body.cy, rost.on(world) ? wm * 2.6 / z : half * 2 / z, rost.on(world) ? wm / z : w / z); // мать ровно вдвое длиннее дочки той же толщины // деление: мать стягивается, дочки расходятся торец к торцу (vid.json split)
    if (bo) { probe.birth = time; if (bo.hide) continue; } // обход пальцем (test_L050) видит, что рождение рисуется; вторая дочка ещё часть матери
    const [x0, y0] = scr(bo ? bo.x : body.cx, bo ? bo.y : body.cy), sag = Math.max(-w * DL.sag, Math.min(w * DL.sag, body.sag * z)) * (bo ? bo.sag : 1), /* стенка жёсткая: длинная палочка не гнётся бананом */ hl = bo ? half * bo.fl : half, wl = bo ? w * bo.fw : w;
    const ang = (bo ? bo.ang : body.ang) + Math.sin(time * 18.8 + a.id) * wob, ax = Math.cos(ang), ay = Math.sin(ang);
    const x = x0 - ay * sag * 0.675, y = y0 + ax * sag * 0.675; // центр модели так, чтобы концы легли на хорду
    const along = (s, o = 0) => [x + ax * s - ay * o, y + ay * s + ax * o];
    const arc = u => -sag * 0.675 + sag * (1 - Math.min(1, (u * z / half) ** 2)); // прогиб в точке u (u — в единицах мира от центра)
    const pinch = bo ? bo.pinch : rost.on(world) ? 0 : gr.u; // кольцо сжимается по массе и только в одну сторону, у созревшей тонкая перемычка (п. 14)
    const dna = bo ? (bo.pinch > 0 ? 1 : 0) : rost.on(world) ? 0 : gr.dna; // две ДНК расходятся раньше кольца
    bodies.rod(x, y, ang, hl, wl, pinch, [CELL[0].r, CELL[0].g, CELL[0].b], [CORE[0].r, CORE[0].g, CORE[0].b], a.id, -sag * (1 - pinch * 0.8));
    if (!rost.on(world) && !a.g && !(a.held > 0)) { const N = DL.nuc, s = hl * N.apart * dna, al = N.a * (0.5 + 0.5 * dna); // светлая ДНК (нуклеоид): одна посередине, к делению вытягивается и расходится к половинкам раньше кольца
      for (const sd of [-1, 1]) glow.put(x + ax * s * sd, y + ay * s * sd, wl * N.r, ...N.c, al); }
    rost.draw({ w: world, a, x, y, ang, half, wd: w, z, glow, time, scr }); // контур следующего роста, струйки от комка
    evo.draw({ w: world, a, x, y, z, glow, scr }); // «Эволюция»: нити глотания
    if (a.grab) glow.put(x, y, half * 1.8, 1, 0.25, 0.15, 0.22 + 0.15 * Math.sin(time * 14)); // схвачена: бьётся в пасти
    if (world.rush > 0.05) glow.put(x, y, half * (1.4 + world.rush * 0.6), 1, 0.75, 0.35, 0.08 + 0.1 * world.rush); // разгон роста: рибосомы работают на всю
    vid.skin({ a, lk, x, y, ang, ax, ay, half: hl, w: wl, z, along, arc, body, scr, time, pdt, run, phageNear, foodNear, spacers: world.spacers.size, plasmid: world.plasmid, cfg, alive: world.me, glow, ink });
    if (a.sick >= 0) glow.put(x, y, half, 1, 0.2, 0.3, 0.25 + 0.2 * Math.sin(time * 20));
  }
  for (const b of world.away) { // уплывшая дочка: уходит своим курсом и тает в толще
    const [x, y] = scr(b.x, b.y), w = 8.5 * Math.pow(b.m, 0.3) * z, f = b.t / cfg.away_time; if (!on(x, y)) continue;
    if (f < 0.7) bodies.rod(x, y, b.a, w * 2.2, w, 0, [CELL[0].r, CELL[0].g, CELL[0].b], [CORE[0].r, CORE[0].g, CORE[0].b], b.id, 0);
    glow.put(x, y, w * 3, 0.6, 0.85, 1, 0.25 * (1 - f));
  }
  for (const a of world.me) { // след: клетка расталкивает взвесь, частицы расходятся и гаснут — вязкость видна
    const sp = Math.hypot(a.vx, a.vy); if (sp < 40 || puffs.length > 230) continue;
    const ux = Math.cos(a.a), uy = Math.sin(a.a), rr = radius(a.m), side = Math.random() < 0.5 ? -1 : 1;
    puffs.push({ x: a.x - ux * rr * 1.3 - uy * side * rr * 0.6, y: a.y - uy * rr * 1.3 + ux * side * rr * 0.6, vx: -uy * side * 18 - ux * 6, vy: ux * side * 18 - uy * 6, t: 0 });
  }
  puffs = puffs.filter(p => (p.t += 1 / 60) < 1.4);
  for (const p of puffs) { p.x += p.vx / 60; p.y += p.vy / 60; p.vx *= 0.95; p.vy *= 0.95; const [x, y] = scr(p.x, p.y); wake.put(x, y, (5 + 9 * p.t) * z, 0.8, 0.92, 1, 0.07 * (1 - p.t / 1.4)); } // мягкие широкие завихрения, а не цепочка бусин за кормой (отзыв 25.11: «пунктирные следы за клеткой»)
  for (const f of world.food) { // еда трёх видов (Е2, Е4): жёлтые крошки, белые искры глюкозы, розовый белковый сок
    const [x, y] = scr(f.x, f.y); if (!on(x, y, 20)) continue;
    const F = cfg.food_kinds[f.kind || 'bits'], k = Math.sqrt(f.s || 1) * F.size, tw = F.twinkle ? 0.75 + 0.25 * Math.sin(time * 7 + f.x * 0.3 + f.y) : 1;
    const dm = rost.dim(world, f.kind || 'bits'); glow.put(x, y, 9 * z * k * F.halo_r, ...F.halo, 0.14 * tw * dm); glow.put(x, y, 3.2 * z * k + 0.6, ...F.core, 0.9 * tw * dm); // ценность видна размером и ореолом: крошка меньше всех, сок крупнее (дизайнер); искры мерцают
  }
  for (const g of world.phages) { // фаг T4: головка позади, хвостом вперёд — садится хвостом
    const [x, y] = scr(g.x, g.y); if (!on(x, y)) continue;
    const s = 6 * z + 1, d = g.d, ux = Math.cos(d), uy = Math.sin(d); // сам не плывёт: смотрит куда попало, прилипший — ножками в клетку
    const P = (a, b) => [x + ux * a - uy * b, y + uy * a + ux * b];
    const pink = (p, r, al = 0.95) => ink.put(p[0], p[1], r, 0.82, 0.8, 0.92, al); // серебристый, как на снимках
    bodies.phage(x, y, d, s);
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
    for (let i = 0, n = Math.ceil(6.283 * STICK / 1.4); i < n; i++) { const t = i * 6.283 / n; glow.put(x + Math.cos(t) * STICK, y + Math.sin(t) * STICK, 1.8, 1, 1, 1, 0.08); }
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
    const g = Math.max(0, Math.min(1, (top.m - sp / 2) / (sp / 2))); $('growfill').style.width = (g * 100).toFixed(1) + '%'; probe.grow = g;
    const ill = world.me.filter(a => a.sick >= 0), k = ill.length ? Math.min(...ill.map(a => a.sick)) / cfg.sick : 0; // заражена — красная засечка на конце, тает к разрыву
    const n = $('sicknotch'); n.style.width = (ill.length ? 4 + 18 * k : 0) + '%'; n.style.left = Math.max(0, g * 100 - (ill.length ? 4 + 18 * k : 0)).toFixed(1) + '%'; probe.sickNotch = ill.length ? k : -1; }
  U.tint.value.set(...view.tint);
  U.drift.value.set(view.x * view.z / W, -view.y * view.z / W); // в ширинах экрана: слои сзади сдвигаются медленнее
  for (const d of [far, glow, ink, near, dust, bubbles, wake]) d.done();
}

function render(t, after) {
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
if (new URLSearchParams(location.search).has('pesochnica')) import('./pesochnica.js'); // песочница движка: пустая вода, умения касанием (pesochnica.js)
if (new URLSearchParams(location.search).has('stend')) import('./stend.js'); // стенд сравнения: слева ручной рисунок, справа то же существо из записи движка (stend.js)
window.zaplyvScr = (x, y) => { const [sx, sy] = scr(x, y); return [sx * innerWidth / W, sy * innerHeight / H]; }; // для проверок: где на экране точка мира (в точках CSS)
const probe = window.zaplyvProbe = { dpr0: dprNow, warn: {}, frames: 0, worst: 0, avg: 0, js: 0, jsWorst: 0, cells: 0, dots: 0, errors: 0 };
addEventListener('error', () => probe.errors++);
let last = performance.now(), acc = [], js = [];
const dprAcc = [];
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  if (($('menu').classList.contains('on') || $('night').classList.contains('on')) && !frame.hid) { frame.hid = true; $('pause').style.display = $('flag').style.display = 'none'; } // кнопки заплыва не лежат поверх меню и ночи
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
  { const hide = ended || paused || !!kids; if (hide !== frame.hid) { frame.hid = hide; $('pause').style.display = $('flag').style.display = hide ? 'none' : ''; } }
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
  try { render(now / 1000, () => { if (!ended) { js.push(performance.now() - t0); if (js.length > 300) js.shift(); } }); } finally { if (solo) Object.assign(world, solo); }
  if (probe.frames % 60 === 0) knowGenes();
  probe.frames++; probe.dpr = dprNow; probe.cells = world.me.length; probe.z = view.z; // масштаб камеры: тап-обход проверяет, что она возвращается (L029)
  probe.js = js.reduce((s, v) => s + v, 0) / Math.max(js.length, 1); probe.jsWorst = Math.max(0, ...js.slice(5)); probe.path = Math.max(probe.path || 0, world.stats.path);
  probe.dots = world.food.length + world.prey.length + world.phages.length;
  probe.worst = Math.max(...acc.slice(5)); probe.avg = acc.reduce((s, v) => s + v, 0) / Math.max(acc.length, 1); probe.ended = ended;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
