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
const CELL = [new THREE.Color(0.3, 1.0, 0.8), new THREE.Color(1.0, 0.28, 0.42), new THREE.Color(1.0, 0.84, 0.36)];
const CH = [[1, 0, 0], [0, 0, 1], [0, 1, 0]]; // сторона -> канал поля: 0 моё, 1 опасное, 2 съедобное
const TINT = [[0.03, 0.065, 0.11], [0.08, 0.035, 0.09], [0.06, 0.065, 0.025]];

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
  c0: { value: CELL[0] }, c1: { value: CELL[1] }, c2: { value: CELL[2] } };
// Клетки: порог поля, объём по наклону поля, блик, кромка-плёнка, полупрозрачное тело и свечение вокруг.
const cells = quad(`uniform sampler2D field; uniform vec2 res; uniform vec2 texel; uniform float th; uniform vec3 c0, c1, c2;
float F(vec2 uv){ vec3 f = texture2D(field, uv).rgb; return max(f.r, max(f.g, f.b)); }
void main(){
  vec2 uv = gl_FragCoord.xy / res;
  vec3 f = texture2D(field, uv).rgb;
  float m = max(f.r, max(f.g, f.b));
  if (m < 0.015) discard;
  vec3 c = f.r >= m ? c0 : (f.b >= m ? c1 : c2);
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
  vec3 col = c * (0.18 + 0.5 * diff) + c * 0.3 * depth + (c * 0.7 + 0.35) * max(rim, fres) * 0.8 + spec * 0.9;
  float a = body * (0.72 + 0.28 * max(rim, fres));
  float halo = smoothstep(0.02, th, m);
  gl_FragColor = vec4(mix(c, col, body), max(a, halo * halo * 0.32));
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
const far = new Dots(80, scene, 1, true, 0);
const glow = new Dots(3000, scene, 3, true, 0.6);
const ink = new Dots(3000, scene, 4, false, 0.8);
const near = new Dots(12, scene, 5, true, 0);
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
  view = { x: 0, y: 0, z: 1, tint: [...TINT[0]] };
  rings = []; ended = false;
  $('end').classList.remove('on');
}
$('again').onclick = start;
start();

const toWorld = (sx, sy) => ({ x: (sx - W / 2) / view.z + view.x, y: (sy - H / 2) / view.z + view.y });
const scr = (x, y) => [(x - view.x) * view.z + W / 2 + (Math.random() - 0.5) * shake, (y - view.y) * view.z + H / 2 + (Math.random() - 0.5) * shake];
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
    if (k === 'burst' || k === 'eaten') { ring(x, y, 1, 150); shake = 14; beep(110, 0.45, 0.09, 'triangle', 0.5); }
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
  const want = Math.max(0.5, Math.min(1.1, 1.15 - 0.05 * Math.sqrt(world.biggest()), W * 0.42 / Math.max(spread, 1)));
  view.z += (want - view.z) * Math.min(1, dt);
  const t = TINT[world.biome(view.x, view.y)];
  for (let i = 0; i < 3; i++) view.tint[i] += (t[i] - view.tint[i]) * Math.min(1, dt * 0.8);
  $('count').textContent = 'клеток ' + world.me.length;
  $('eaten').textContent = 'съедено ' + world.stats.eaten;
}

function paint(time) {
  const z = view.z, big = world.biggest();
  for (const p of world.plants) { // водоросль: гроздь из четырёх долек, покачивается
    const [x, y] = scr(p.x, p.y), r = radius(p.m) * z;
    for (let k = 0; k < 4; k++) { const a = k * 1.571 + Math.sin(time * 0.7 + p.id) * 0.3; blob(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.6, 2); }
  }
  for (const q of world.prey) { // кокки; крупнее тебя — красные, их не тронь
    const [x, y] = scr(q.x, q.y); if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
    const side = q.m > big * 1.25 ? 1 : 2, r = radius(q.m) * z;
    if (q.pair) { const a = q.a + time * 0.3, dx = Math.cos(a) * r * 0.45, dy = Math.sin(a) * r * 0.45; blob(x + dx, y + dy, r * 0.7, side); blob(x - dx, y - dy, r * 0.7, side); }
    else blob(x, y, r * (1 + 0.05 * Math.sin(time * 3 + q.id)), side);
  }
  for (const m of world.amoebas) { // амёба: тело и ложноножки тянутся то туда, то сюда
    const [x, y] = scr(m.x, m.y), side = m.m < big * 0.8 ? 2 : 1, r = radius(m.m) * z;
    blob(x, y, r * 0.85, side);
    for (let k = 0; k < 6; k++) {
      const a = k * 1.047 + Math.sin(time * 0.5 + k + m.id) * 0.6, reach = 0.55 + 0.35 * Math.max(0, Math.sin(time * 1.3 + k * 2.4 + m.id));
      blob(x + Math.cos(a) * r * reach, y + Math.sin(a) * r * reach, r * 0.42, side);
    }
    ink.put(x + r * 0.15, y - r * 0.1, r * 0.22, 0.25, 0.05, 0.1, 0.5); // ядро
  }
  const [cr, cg, cb] = [CELL[0].r, CELL[0].g, CELL[0].b];
  for (const a of world.me) { // палочка: капсула из трёх долек; вытянулась — перетяжка посередине
    let [x, y] = scr(a.x, a.y), r = radius(a.m) * z;
    const ax = Math.cos(a.a), ay = Math.sin(a.a);
    if (a.sick >= 0 && (time * 8) % 1 < 0.5) r *= 1.08;
    if (a.m >= cfg.split) {
      const pinch = 0.35 + 0.1 * Math.sin(time * 6);
      blob(x + ax * r * 0.62, y + ay * r * 0.62, r * 0.62, 0); blob(x - ax * r * 0.62, y - ay * r * 0.62, r * 0.62, 0); blob(x, y, r * pinch, 0);
      for (let k = 0; k < 16; k++) { const t = k * 0.3927, R = r * (1.55 + 0.15 * Math.sin(time * 5)); glow.put(x + Math.cos(t) * R, y + Math.sin(t) * R, 3, 1, 1, 1, 0.5); }
    } else for (const k of [-1, 0, 1]) blob(x + ax * r * 0.5 * k, y + ay * r * 0.5 * k, r * 0.6, 0);
    for (let k = 0; k < 3; k++) { // крупинки внутри плывут
      const t = time * (0.6 + k * 0.2) + a.id * 1.3 + k * 2.1, s = Math.sin(t) * r * 0.55, o = Math.cos(t * 1.3) * r * 0.18;
      ink.put(x + ax * s - ay * o, y + ay * s + ax * o, 2.2 * z + 1, 0.85, 1, 0.95, 0.55);
    }
    const sp = Math.hypot(a.vx, a.vy);
    for (let k = 0; k < 12; k++) { // жгутик: волна бежит назад, быстрее на ходу
      const s = k / 11, back = r * 1.1 + s * r * 2.6, w = Math.sin(s * 7 - time * (8 + sp * 0.06)) * r * 0.35 * s;
      glow.put(x - ax * back - ay * w, y - ay * back + ax * w, (3.2 - s * 1.8) * Math.max(z, 0.7), cr, cg, cb, 0.55);
    }
    if (a.sick >= 0) ink.put(x, y, r * 0.5, 1, 0.2, 0.3, 0.35 + 0.3 * Math.sin(time * 20));
  }
  for (const f of world.food) { // сахар: тёплая искра
    const [x, y] = scr(f.x, f.y); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const tw = 0.8 + 0.2 * Math.sin(time * 4 + f.x);
    glow.put(x, y, 14 * z, 1, 0.8, 0.35, 0.18 * tw); glow.put(x, y, 4.5 * z, 1, 0.92, 0.6, 0.95);
  }
  for (const g of world.phages) { // фаг по учебнику: головка, хвост, ножки
    const [x, y] = scr(g.x, g.y), s = 7 * z, w = Math.sin(time * 14 + g.x) * 2;
    ink.put(x, y, s, 1, 0.3, 0.45, 0.95);
    for (let k = 1; k <= 3; k++) ink.put(x, y + s * (0.7 + k * 0.55), 2.2 * z, 1, 0.3, 0.45, 0.9);
    ink.put(x - s * 1.1, y + s * 3.1 + w, 2 * z, 1, 0.3, 0.45, 0.8); ink.put(x + s * 1.1, y + s * 3.1 - w, 2 * z, 1, 0.3, 0.45, 0.8);
  }
  for (const r of rings) { // вспышка-кольцо
    const k = r.t / 0.6, [x, y] = scr(r.x, r.y), R = r.r * z * (0.3 + k), c = CELL[r.side];
    for (let i = 0; i < 28; i++) { const t = i * 0.2244; glow.put(x + Math.cos(t) * R, y + Math.sin(t) * R, 5 * (1 - k) + 1.5, c.r, c.g, c.b, 0.7 * (1 - k)); }
  }
  if (!moved && world.me.length) { // подсказка без слов: «палец» уводит клетку вверх
    const k = (time / 1.6) % 1, [x, y] = scr(world.me[0].x, world.me[0].y);
    glow.put(x, y - 220 * k - 40, 34, 1, 1, 1, 0.35 * (1 - k));
  }
  const px = view.x * 0.35, py = view.y * 0.35; // взвесь вдали плывёт медленнее, соринки вблизи — быстрее
  for (let i = 0; i < 60; i++) {
    const h = Math.abs(Math.sin(i * 91.7) * 43758.5) % 1, h2 = Math.abs(Math.sin(i * 12.9) * 9631.2) % 1;
    const x = ((h * 1400 - px) % 1400 + 1400) % 1400 - 340, y = ((h2 * 2400 - py) % 2400 + 2400) % 2400 - 500;
    far.put(x, y, 20 + h * 50, 0.6, 0.8, 1, 0.05);
  }
  for (let i = 0; i < 5; i++) {
    const h = Math.abs(Math.sin(i * 47.3) * 3758.5) % 1, x = ((h * 2400 - view.x * 1.7) % 2400 + 2400) % 2400 - 840;
    const y = ((h * 7.1 % 1 * 3000 - view.y * 1.7) % 3000 + 3000) % 3000 - 800;
    near.put(x, y, 140 + h * 120, 0.7, 0.85, 1, 0.045);
  }
  U.tint.value.set(...view.tint);
  U.drift.value.set(view.x * 0.0012, -view.y * 0.0012);
  for (const d of [blobs, far, glow, ink, near]) d.done();
}

// Замер для проверки: кадры, худший и средний кадр за последние 5 с, число клеток и точек.
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
  shake = Math.max(0, shake - dt * 30);
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
