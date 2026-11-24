// «Заплыв» на экране (Three.js). Держи палец — клетки плывут к нему; короткое касание — вытянувшиеся делятся.
// Живые клетки: каждая капля — мягкое пятно в слое поля (половина разрешения), пятна складываются,
// шейдер режет сумму по порогу и освещает по наклону поля: объём, блик, светлая кромка, свечение.
// Сверху — точки: еда, жгутики, крупинки внутри клеток, фаги, взвесь вдали и размытые соринки вблизи.
import * as THREE from './three.module.min.js';
import { World, radius } from './sim.js';

const cfg = await (await fetch('data.json')).json();
const W = 720; // ширина экрана в единицах игры
const canvas = document.getElementById('c');
const gl = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
gl.setPixelRatio(Math.min(devicePixelRatio, 2));
let H = W, field;
const cam = new THREE.OrthographicCamera(0, W, 0, W, -1, 1);
const scene = new THREE.Scene();
const fieldScene = new THREE.Scene();
// Цвета как на раскрашенных снимках: у каждой стороны оболочка одного цвета, содержимое другого.
const CELL = [new THREE.Color(0.35, 0.85, 1.0), new THREE.Color(1.0, 0.5, 0.2), new THREE.Color(0.6, 1.0, 0.35)]; // оболочка
const CORE = [new THREE.Color(0.85, 0.22, 0.62), new THREE.Color(0.8, 0.1, 0.16), new THREE.Color(1.0, 0.82, 0.2)]; // содержимое
const CH = [[1, 0, 0], [0, 0, 1], [0, 1, 0]]; // сторона -> канал поля: 0 моё, 1 опасное, 2 съедобное
const TINT = [[0.02, 0.06, 0.12], [0.07, 0.03, 0.1], [0.02, 0.08, 0.05]]; // вода, сладкая, ил

const quad = (frag, uniforms, order) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: frag,
  }));
  m.renderOrder = order;
  m.frustumCulled = false;
  scene.add(m);
  return m;
};

const U = { res: { value: new THREE.Vector2() }, time: { value: 0 }, tint: { value: new THREE.Vector3(...TINT[0]) }, drift: { value: new THREE.Vector2() } };
// Мутная вода под микроскопом: середина светлее, края в тень, медленная рябь и пятна света.
const bg = quad(`uniform vec2 res; uniform float time; uniform vec3 tint; uniform vec2 drift;
void main(){
  vec2 uv = gl_FragCoord.xy / res; vec2 p = uv * vec2(1.0, res.y / res.x) * 6.0 + drift;
  float d = length((uv - 0.5) * vec2(1.0, res.y / res.x));
  vec3 col = mix(tint, vec3(0.004, 0.006, 0.012), smoothstep(0.1, 0.85, d));
  float g = sin(p.x * 2.1 + time * 0.3) * sin(p.y * 1.7 - time * 0.25) + sin((p.x + p.y) * 0.9 + time * 0.12);
  col += tint * 0.18 * g;
  gl_FragColor = vec4(col, 1.0);
}`, U, 0);

const FU = { field: { value: null }, res: U.res, texel: { value: new THREE.Vector2() }, th: { value: 0.42 },
  c0: { value: CELL[0] }, c1: { value: CELL[1] }, c2: { value: CELL[2] },
  i0: { value: CORE[0] }, i1: { value: CORE[1] }, i2: { value: CORE[2] } };
// Клетки: порог поля, объём по наклону поля, блик, кромка-плёнка, полупрозрачное тело и свечение вокруг.
const cells = quad(`uniform sampler2D field; uniform vec2 res; uniform vec2 texel; uniform float th; uniform vec3 c0, c1, c2, i0, i1, i2;
float F(vec2 uv){ vec3 f = texture2D(field, uv).rgb; return max(f.r, max(f.g, f.b)); }
void main(){
  vec2 uv = gl_FragCoord.xy / res;
  vec3 f = texture2D(field, uv).rgb;
  float m = max(f.r, max(f.g, f.b));
  if (m < 0.015) discard;
  vec3 c = f.r >= m ? c0 : (f.b >= m ? c1 : c2);
  vec3 ci = f.r >= m ? i0 : (f.b >= m ? i1 : i2);
  float body = smoothstep(th - 0.02, th + 0.02, m);
  float gx = F(uv + vec2(texel.x, 0.0)) - F(uv - vec2(texel.x, 0.0));
  float gy = F(uv + vec2(0.0, texel.y)) - F(uv - vec2(0.0, texel.y));
  vec3 n = normalize(vec3(-gx * 5.0, -gy * 5.0, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.55, 0.8));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 22.0);
  float fres = pow(1.0 - n.z, 1.5);
  float depth = smoothstep(th, 0.95, m);
  float rim = 1.0 - smoothstep(th + 0.005, th + 0.09, m);
  // прозрачная оболочка светится по краю, сквозь неё видно содержимое другого цвета; блик сверху слева
  float inner = smoothstep(th + 0.06, 0.85, m);
  vec3 base = mix(c * (0.22 + 0.45 * diff), ci * (0.4 + 0.6 * diff), inner);
  vec3 col = base + (c * 0.8 + 0.35) * max(rim, fres) * 0.9 + spec * 0.8;
  float a = body * (0.62 + 0.38 * max(rim, fres));
  float halo = smoothstep(0.02, th, m);
  gl_FragColor = vec4(mix(mix(c, vec3(0.55, 0.75, 1.0), 0.35), col, body), max(a, halo * halo * 0.3));
}`, FU, 2);

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
const EDGE = 0.57; // где пятно пересекает порог, доля радиуса пятна
const blobs = new Dots(3000, fieldScene, 0, 'field', 0);
const far = new Dots(80, scene, 1, 'ring', 0);
const glow = new Dots(3000, scene, 3, true, 0.6);
const ink = new Dots(3000, scene, 4, false, 0.8);
const near = new Dots(12, scene, 5, 'ring', 0);
const dust = new Dots(120, scene, 3, true, 0.9);
const bubbles = new Dots(60, scene, 4, 'ring', 0);
const blob = (x, y, r, side) => { const c = CH[side]; blobs.put(x, y, r / EDGE, c[0], c[1], c[2]); };

function resize() {
  const w = innerWidth, h = innerHeight;
  H = W * h / w;
  gl.setSize(w, h, false);
  const px = gl.getDrawingBufferSize(new THREE.Vector2());
  U.res.value.copy(px);
  cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = H; cam.updateProjectionMatrix();
  const fw = Math.min(640, Math.round(px.x / 2)), fh = Math.round(fw * px.y / px.x);
  field?.dispose();
  field = new THREE.WebGLRenderTarget(fw, fh, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  FU.field.value = field.texture;
  FU.texel.value.set(1.5 / fw, 1.5 / fh);
  for (const m of [bg, cells]) { m.scale.set(W, H, 1); m.position.set(W / 2, H / 2, 0); }
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

let world, view, finger = null, down = null, moved = false, rings = [], shake = 0, ended = false, lastEat = 0;
const $ = id => document.getElementById(id);
fetch('../version.txt').then(r => r.ok ? r.text() : 'dev').then(t => $('ver').textContent = 'проба · ' + t.trim().slice(0, 7)).catch(() => {});

function start() {
  world = new World(cfg, (Math.random() * 2 ** 31) | 0);
  view = { x: 0, y: 0, z: 2.2, tint: [...TINT[0]] };
  rings = []; ended = false;
  $('end').classList.remove('on');
}
$('again').onclick = start;
start();

const toWorld = (sx, sy) => ({ x: (sx - W / 2) / view.z + view.x, y: (sy - H / 2) / view.z + view.y });
let sway = [0, 0]; // лёгкое покачивание кадра после удара: плавная волна, не дрожь
const scr = (x, y) => [(x - view.x) * view.z + W / 2 + sway[0], (y - view.y) * view.z + H / 2 + sway[1]];
const unit = e => [e.clientX * W / innerWidth, e.clientY * W / innerWidth];

canvas.addEventListener('pointerdown', e => {
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} }
  audio?.resume?.();
  const [x, y] = unit(e);
  down = { x, y, t: performance.now() }; finger = { x, y };
});
canvas.addEventListener('pointermove', e => {
  if (!down) return;
  const [x, y] = unit(e); finger = { x, y };
  if (Math.hypot(x - down.x, y - down.y) > 20) moved = true;
});
const up = e => {
  if (!down) return;
  const [x, y] = unit(e);
  if (performance.now() - down.t < 250 && Math.hypot(x - down.x, y - down.y) < 30 && world.divide()) beep(520, 0.18, 0.06, 'triangle', 1.8);
  down = null; finger = null;
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

function ask() {
  if ($('genes').classList.contains('on')) return;
  const box = $('cards'); box.innerHTML = '';
  for (const g of world.choice) {
    const b = document.createElement('button');
    b.innerHTML = cfg.genes[g][0] + '<small>' + cfg.genes[g][1] + '</small>';
    b.onclick = () => { world.pick(g); $('genes').classList.remove('on'); ring(world.center().x, world.center().y, 0, 300); beep(660, 0.4, 0.06, 'sine', 1.5); };
    box.appendChild(b);
  }
  $('genes').classList.add('on');
  beep(440, 0.5, 0.05, 'sine', 2);
}

function ring(x, y, side, r) { rings.push({ x, y, side, r, t: 0 }); }

function events() {
  for (const [k, x, y] of world.events) {
    if (k === 'eat') { ring(x, y, 2, 40); const n = performance.now(); if (n - lastEat > 60) { beep(300 + Math.random() * 200, 0.09, 0.04); lastEat = n; } }
    if (k === 'split') ring(x, y, 0, 70);
    if (k === 'sick') { ring(x, y, 1, 50); beep(180, 0.3, 0.05, 'sawtooth', 0.7); }
    if (k === 'burst' || k === 'eaten') { ring(x, y, 1, 150); shake = 1; beep(110, 0.45, 0.09, 'triangle', 0.5); }
  }
  world.events.length = 0;
}

function tick(dt) {
  if (world.choice.length) { ask(); return; }
  world.step(dt, finger ? toWorld(finger.x, finger.y) : null);
  events();
  if (!world.me.length) {
    if (!ended) {
      ended = true; const s = world.stats, t = Math.round(s.time);
      $('stats').innerHTML = `клеток было до ${s.most} · съедено ${s.eaten}<br>проплыл ${Math.round(s.path / 26)} мкм за ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
      setTimeout(() => $('end').classList.add('on'), 700);
    }
    return;
  }
  const c = world.center(), k = Math.min(1, 3 * dt);
  view.x += (c.x - view.x) * k; view.y += (c.y - view.y) * k;
  let spread = 0;
  for (const a of world.me) spread = Math.max(spread, Math.hypot(a.x - view.x, a.y - view.y));
  const want = Math.max(0.9, Math.min(2.3, 2.45 - 0.17 * Math.sqrt(world.biggest()), W * 0.36 / Math.max(spread, 1)));
  view.z += (want - view.z) * Math.min(1, dt);
  const t = TINT[world.biome(view.x, view.y)];
  for (let i = 0; i < 3; i++) view.tint[i] += (t[i] - view.tint[i]) * Math.min(1, dt * 0.8);
  $('count').textContent = 'клеток ' + world.me.length;
  $('eaten').textContent = 'съедено ' + world.stats.eaten;
}

// Вид «как под микроскопом» (тёмное поле): палочки длиной в 2–3 ширины растут в длину, внутри светлое
// облако нуклеоида и зёрна, у полюсов светлые шапочки; жгутики пучком на ходу и врозь на месте;
// кокки — одиночки, пары, цепочки, грозди; амёба с ложноножками, током зёрен, ядром и вакуолью;
// фаг T4 — вытянутая головка, хвост, пластинка и шесть ножек; вдали частицы в расфокусе кольцами.
const SPIKES = [[1, 0.45, 0.75], [1, 0.6, 0.2], [0.45, 0.7, 1], [0.8, 0.5, 1]];
function paint(time) {
  const z = view.z, big = world.biggest();
  const on = (x, y, pad = 80) => x > -pad && x < W + pad && y > -pad && y < H + pad;
  for (const p of world.plants) { // водоросль-нить: цепочка клеток, внутри зелёные хлоропласты
    const [x, y] = scr(p.x, p.y); if (!on(x, y, 220)) continue;
    const r = radius(p.m) * z, a0 = p.id * 1.7;
    for (let k = -2; k <= 2; k++) {
      const a = a0 + Math.sin(time * 0.5 + k * 0.6 + p.id) * 0.12, cx = x + Math.cos(a) * k * r * 0.72, cy = y + Math.sin(a) * k * r * 0.72;
      blob(cx, cy, r * 0.42, 2);
      ink.put(cx, cy, r * 0.17, 0.35, 0.85, 0.3, 0.6);
    }
  }
  for (const q of world.prey) { // кокки; крупнее тебя — красные, их не тронь
    const [x, y] = scr(q.x, q.y); if (!on(x, y)) continue;
    const side = q.m > big * 1.25 ? 1 : 2, r = radius(q.m) * z, kind = q.id % 4, a = q.a + time * 0.2;
    const ux = Math.cos(a), uy = Math.sin(a);
    if (kind === 0) { // шар с шипами, у каждого свой цвет шипов
      blob(x, y, r * 0.9, side);
      const hue = SPIKES[q.id % SPIKES.length];
      for (let k = 0; k < 14; k++) { const t = k * 0.4488 + a * 0.3, c = Math.cos(t), s = Math.sin(t);
        ink.put(x + c * r * 1.02, y + s * r * 1.02, 1.1 * z + 0.4, hue[0], hue[1], hue[2], 0.8);
        ink.put(x + c * r * 1.28, y + s * r * 1.28, 2.2 * z + 0.5, hue[0], hue[1], hue[2], 0.9); }
    }
    else if (kind === 1) { blob(x + ux * r * 0.45, y + uy * r * 0.45, r * 0.62, side); blob(x - ux * r * 0.45, y - uy * r * 0.45, r * 0.62, side); }
    else if (kind === 2) for (let k = -1.5; k <= 1.5; k++) { // цепочка
      const w = Math.sin(time * 1.5 + k + q.id) * r * 0.15;
      blob(x + ux * k * r * 0.55 - uy * w, y + uy * k * r * 0.55 + ux * w, r * 0.42, side);
    } else for (let k = 0; k < 5; k++) { const t = k * 1.2566 + q.id, d = k ? r * 0.42 : 0; blob(x + Math.cos(t) * d, y + Math.sin(t) * d, r * 0.45, side); } // гроздь
  }
  for (const m of world.amoebas) {
    const [x, y] = scr(m.x, m.y); if (!on(x, y, 320)) continue;
    const side = m.m < big * 0.8 ? 2 : 1, r = radius(m.m) * z, sp = Math.hypot(m.vx, m.vy);
    const head = sp > 3 ? Math.atan2(m.vy, m.vx) : m.id, hx = Math.cos(head), hy = Math.sin(head);
    blob(x, y, r * 0.8, side);
    for (let k = 0; k < 7; k++) { // ложноножки: тупые, ведущая — по ходу
      const a = k * 0.8976 + Math.sin(time * 0.4 + k * 1.7 + m.id) * 0.5;
      const reach = 0.5 + 0.35 * Math.max(0, Math.sin(time * 0.9 + k * 2.4 + m.id)) + (sp > 3 ? 0.35 * Math.max(0, Math.cos(a - head)) : 0);
      blob(x + Math.cos(a) * r * reach, y + Math.sin(a) * r * reach, r * 0.38, side);
    }
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
  for (const a of world.me) { // палочка: ширина почти постоянна, растёт в длину; лёгкое покачивание
    const [x, y] = scr(a.x, a.y), w = 8.5 * Math.pow(a.m, 0.3) * z, sp = Math.hypot(a.vx, a.vy);
    const ang = a.a + Math.sin(time * 2.2 + a.id) * 0.06, ax = Math.cos(ang), ay = Math.sin(ang);
    const half = w * (1.6 + 1.0 * Math.min(a.m, cfg.split) / cfg.split);
    const along = (s, o = 0) => [x + ax * s - ay * o, y + ay * s + ax * o];
    if (a.m >= cfg.split) { // перетяжка посередине: вот-вот две
      const gap = w * (0.3 + 0.12 * Math.sin(time * 6));
      for (const s of [-1, 1]) for (const f of [0, 1]) { const [px, py] = along(s * (gap / 2 + w * 0.85 + f * Math.max(0, half - gap / 2 - w * 1.7))); blob(px, py, w, 0); }
      for (let k = 0; k < 18; k++) { const t = k * 0.349, R = half * (1.35 + 0.08 * Math.sin(time * 5)); glow.put(x + Math.cos(t) * R, y + Math.sin(t) * R, 2.2, 1, 1, 1, 0.4); }
    } else for (let k = 0; k < 4; k++) { const [px, py] = along((k / 3 * 2 - 1) * (half - w)); blob(px, py, w, 0); }
    for (let k = 0; k < 16; k++) { // пили: короткие ворсинки по всей оболочке
      const t = k / 16 * 6.283, c = Math.cos(t), s = Math.sin(t), l = 1 + 0.25 * Math.sin(time * 3 + k * 1.7 + a.id);
      for (const e of [1.08, 1.32 * l]) { const [px, py] = along(c * (half - w * 0.2) * (c > 0 ? 1 : 1) + c * w * (e - 1), s * w * e); ink.put(px, py, 0.9 * z + 0.4, 0.55, 0.9, 1, 0.55); }
    }
    for (let k = 0; k < 7; k++) { // содержимое: розовые зёрна рибосом
      const t = k * 2.4 + a.id, [px, py] = along(Math.sin(t + time * 0.2) * (half - w * 0.8), Math.cos(t * 1.7 + time * 0.25) * w * 0.45);
      glow.put(px, py, 1.6 * z + 0.6, 1, 0.35, 0.75, 0.35);
    }
    for (const s of [-1, 1]) { const [px, py] = along(s * (half - w * 0.45)); glow.put(px, py, w * 0.35, 0.9, 1, 1, 0.22); } // полюса
    for (let k = 0; k < 4; k++) { // зёрна плывут внутри
      const t = time * (0.5 + k * 0.17) + a.id * 1.3 + k * 2.1, [px, py] = along(Math.sin(t) * (half - w * 0.6), Math.cos(t * 1.3) * w * 0.4);
      ink.put(px, py, 0.9 * z + 0.7, 0.85, 1, 0.95, 0.5);
    }
    const run = finger && sp > 25;
    for (let f = 0; f < 4; f++) { // жгутики: на ходу пучком за кормой, на месте врозь и медленно
      let bx, by, dx, dy;
      if (run) { [bx, by] = along(-half + w * 0.3, (f - 1.5) * w * 0.3); dx = -ax; dy = -ay; }
      else { const t = f * 1.571 + 0.6 + a.id, c = Math.cos(t), s = Math.sin(t); [bx, by] = along(c * (half - w * 0.5), s * w * 0.9); const l = Math.hypot(c * 1.2, s * 1.8); dx = (ax * c * 1.2 - ay * s * 1.8) / l; dy = (ay * c * 1.2 + ax * s * 1.8) / l; }
      for (let k = 1; k <= 40; k++) {
        const s = k / 40, back = s * w * (run ? 7 : 5.5), amp = w * 0.42 * Math.min(1, s * 3);
        const wv = Math.sin(s * 10 - time * (run ? 16 : 4) + f * 0.5) * amp, conv = run ? (f - 1.5) * w * 0.3 * (s * 0.9) : 0;
        glow.put(bx + dx * back + dy * (wv - conv), by + dy * back - dx * (wv - conv), 0.8 * Math.max(z, 0.7) + 0.3, cr, cg, cb, 0.5 * (1 - s * 0.5));
      }
    }
    if (a.sick >= 0) glow.put(x, y, half, 1, 0.2, 0.3, 0.25 + 0.2 * Math.sin(time * 20));
  }
  for (const f of world.food) { // сахар: мелкие светящиеся зёрна
    const [x, y] = scr(f.x, f.y); if (!on(x, y, 20)) continue;
    glow.put(x, y, 9 * z, 1, 0.8, 0.35, 0.14); glow.put(x, y, 3.2 * z + 0.6, 1, 0.93, 0.65, 0.9);
  }
  for (const g of world.phages) { // фаг T4: головка позади, хвостом вперёд — садится хвостом
    const [x, y] = scr(g.x, g.y); if (!on(x, y)) continue;
    const s = 6 * z + 1, d = Math.atan2(g.vy, g.vx), ux = Math.cos(d), uy = Math.sin(d);
    const P = (a, b) => [x + ux * a - uy * b, y + uy * a + ux * b];
    const pink = (p, r, al = 0.95) => ink.put(p[0], p[1], r, 0.82, 0.8, 0.92, al); // серебристый, как на снимках
    for (const a of [-2.7, -2.1, -1.5]) pink(P(a * s, 0), s * 0.72);
    glow.put(...P(-2.3 * s, -0.25 * s), s * 0.3, 1, 1, 1, 0.5); glow.put(...P(-2.1 * s, 0), s * 1.6, 1, 0.3, 0.4, 0.12); // грань-блик и красное свечение: опасно
    for (let a = -0.9; a <= 0.6; a += 0.3) pink(P(a * s, 0), s * 0.26);
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
  if (!moved && world.me.length) { // подсказка без слов: «палец» уводит клетку вверх
    const k = (time / 1.6) % 1, [x, y] = scr(world.me[0].x, world.me[0].y);
    glow.put(x, y - 220 * k - 40, 34, 1, 1, 1, 0.35 * (1 - k));
  }
  const wrap = (v, n) => ((v % n) + n) % n;
  for (let i = 0; i < 50; i++) { // вдали: частицы в расфокусе — кольца, плывут медленнее
    const h = Math.abs(Math.sin(i * 91.7) * 43758.5) % 1, h2 = Math.abs(Math.sin(i * 12.9) * 9631.2) % 1;
    const warm = i % 3 === 0; // тёплые огоньки вдали, как на снимках
    far.put(wrap(h * 1400 - view.x * 0.35, 1400) - 340, wrap(h2 * 2400 - view.y * 0.35, 2400) - 500, (warm ? 6 : 14) + h * (warm ? 14 : 46), warm ? 1 : 0.6, warm ? 0.55 : 0.8, warm ? 0.2 : 1, warm ? 0.25 : 0.025 + h2 * 0.035);
  }
  for (let i = 0; i < 70; i++) { // рядом: пылинки дрожат (броуновское) — видно, какие мы маленькие
    const h = Math.abs(Math.sin(i * 33.1) * 1758.5) % 1, h2 = Math.abs(Math.sin(i * 71.3) * 5631.7) % 1;
    const jx = Math.sin(time * 13 + i * 7) * 1.2 + Math.sin(time * 0.3 + i) * 6, jy = Math.cos(time * 11 + i * 5) * 1.2 + Math.cos(time * 0.27 + i) * 6;
    dust.put(wrap(h * 1000 - view.x * z, 1000) - 140 + jx, wrap(h2 * 1900 - view.y * z, 1900) - 170 + jy, 1 + h * 1.6, 0.9, 0.95, 1, 0.22);
  }
  for (let i = 0; i < 5; i++) { // вблизи: крупные размытые соринки проплывают перед объективом
    const h = Math.abs(Math.sin(i * 47.3) * 3758.5) % 1;
    near.put(wrap(h * 2400 - view.x * 1.7, 2400) - 840, wrap(h * 7.1 % 1 * 3000 - view.y * 1.7, 3000) - 800, 140 + h * 120, 0.7, 0.85, 1, 0.03);
  }
  $('scale').style.width = (260 * z * innerWidth / W) + 'px';
  U.tint.value.set(...view.tint);
  U.drift.value.set(view.x * 0.0012, -view.y * 0.0012);
  for (const d of [blobs, far, glow, ink, near, dust, bubbles]) d.done();
}

// Замер для проверки: кадры, худший и средний кадр за последние 5 с, число клеток и точек.
window.zaplyvWorld = () => world; // для проверок и кадров
const probe = window.zaplyvProbe = { frames: 0, worst: 0, avg: 0, js: 0, jsWorst: 0, cells: 0, dots: 0, errors: 0 };
addEventListener('error', () => probe.errors++);
let last = performance.now(), acc = [], js = [];
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  acc.push(now - last); if (acc.length > 300) acc.shift();
  last = now;
  const t0 = performance.now();
  if (!ended) tick(dt);
  for (const r of rings) r.t += dt;
  rings = rings.filter(r => r.t < 0.6);
  shake = Math.max(0, shake - dt * 0.9);
  sway = [Math.sin(now / 1000 * 5) * 6 * shake, Math.sin(now / 1000 * 3.7 + 1) * 4 * shake];
  U.time.value = now / 1000;
  paint(now / 1000);
  if (!ended) { js.push(performance.now() - t0); if (js.length > 300) js.shift(); }
  gl.setRenderTarget(field); gl.setClearColor(0x000000, 0); gl.clear();
  gl.render(fieldScene, cam);
  gl.setRenderTarget(null);
  gl.render(scene, cam);
  probe.frames++; probe.cells = world.me.length;
  probe.js = js.reduce((s, v) => s + v, 0) / Math.max(js.length, 1); probe.jsWorst = Math.max(0, ...js.slice(5)); probe.path = Math.max(probe.path || 0, world.stats.path);
  probe.dots = world.food.length + world.prey.length + world.phages.length;
  probe.worst = Math.max(...acc.slice(5)); probe.avg = acc.reduce((s, v) => s + v, 0) / acc.length;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
