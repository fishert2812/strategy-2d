// Объёмные тела «Заплыва» (Three.js): настоящая геометрия со светом, а не плоские пятна.
// Палочка — капсула: полупрозрачная светящаяся по краю оболочка, внутри — содержимое другого цвета;
// перед делением капсула перетягивается в вершинном шейдере. Кокки — шары, у одиночек шипы с шариками.
// Амёба — сфера, которую шум и ложноножки выпячивают каждую секунду по-новому. Фаг — гранёная головка и хвост.
// Бугристость — шум в координатах самого тела (едет вместе с клеткой). Всё на инстансах: одна отрисовка на вид.
// Координаты — экранные единицы игры (ширина 720, y вниз); здесь y переворачивается.
import * as THREE from './three.module.min.js';

const NOISE = `
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`;

// Общий свет: рассеянный, блик, кромка (Френель) другим цветом, прозрачность по краю гуще.
const LIGHT_FRAG = `
uniform float bump; uniform float alpha0; uniform float rimK; uniform float ridge; uniform float edgeA;
varying vec3 vN; varying vec3 vP; varying vec4 vA; varying vec3 vB;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 q = vP * 5.0;
  n = normalize(n + bump * (vec3(vn(q), vn(q + 3.1), vn(q + 7.7)) - 0.5) * 1.6);
  vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
  float d = max(dot(n, L), 0.0);
  float fres = pow(1.0 - abs(n.z), 2.2);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
  float cav = 0.75 + 0.25 * vn(q * 2.0);
  float rg = ridge * max(1.0 - smoothstep(0.0, 0.08, abs(vn(vP * 3.0) - 0.5)), 0.8 * (1.0 - smoothstep(0.0, 0.07, abs(vn(vP * 6.5 + 4.0) - 0.5)))) * (1.0 - 0.6 * fres); // две сетки разной частоты: тяжи густые, как на образце // светлые складки мембраны сеткой поперёк тела (амёба на образцах)
  vec3 col = vA.rgb * (0.18 + 0.72 * d) * cav + vB * fres * rimK + spec * 0.55 + vB * rg;
  gl_FragColor = vec4(col, vA.a * min(1.0, mix(alpha0, edgeA, fres) + rg * 0.6));
}`;

function kind(geo, max, vertexBody, opts = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, bump: { value: opts.bump ?? 0.35 }, alpha0: { value: opts.alpha0 ?? 1 }, rimK: { value: opts.rimK ?? 1.1 }, ridge: { value: opts.ridge ?? 0 }, edgeA: { value: opts.edgeA ?? 1 } },
    transparent: (opts.alpha0 ?? 1) < 1, depthWrite: (opts.alpha0 ?? 1) >= 1, flatShading: !!opts.flat,
    vertexShader: `uniform float time; attribute vec4 cA; attribute vec3 cB; attribute vec4 prm;
      varying vec3 vN; varying vec3 vP; varying vec4 vA; varying vec3 vB;
      ${NOISE}
      void main(){
        vec3 p = position; vec3 nn = normal;
        ${vertexBody}
        vP = position + prm.y; vA = cA; vB = cB; ${opts.after || ''}
        vN = normalize(normalMatrix * mat3(instanceMatrix) * nn);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: LIGHT_FRAG,
  });
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (const [k, n] of [['cA', 4], ['cB', 3], ['prm', 4]])
    geo.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage));
  m.frustumCulled = false;
  m.count = 0;
  m.renderOrder = opts.order ?? 0;
  return m;
}

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);

// Капсула для палочки. Готовая CapsuleGeometry кладёт на прямую часть только два кольца, у концов: перетяжка в середине
// (pinch) сжимала пустое место, и клетка перед делением и в делении выглядела ровной (урок L050).
function capsule(caps = 6, mid = 20, round = 16) {
  const pts = [], P = (x, y) => pts.push(new THREE.Vector2(Math.max(x, 1e-4), y));
  for (let i = 0; i <= caps; i++) { const a = -Math.PI / 2 + i / caps * Math.PI / 2; P(Math.cos(a), -1 + Math.sin(a)); }
  for (let i = 1; i < mid; i++) { const t = -1 + 2 * i / mid; P(1, Math.sign(t) * Math.abs(t) ** 1.8); } // кольца гуще к середине: там перегородка
  for (let i = 0; i <= caps; i++) { const a = i / caps * Math.PI / 2; P(Math.cos(a), 1 + Math.sin(a)); }
  return new THREE.LatheGeometry(pts, round);
}

export class Bodies {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(0, 720, 0, -1280, -2000, 2000);
    this.cam.position.z = 1000;
    const cap = capsule(); // ось Y, полувысота 2; прямая часть нарезана поперёк, иначе перетяжке негде сжаться
    const pinch = 'p += nn * 0.04 * sin(time * 3.0 + p.y * 5.0 + prm.y);' // лёгкое дыхание оболочки
      + 'p.x += prm.z * (p.y * p.y - 1.3); nn.x -= prm.z * 2.0 * p.y; nn = normalize(nn);' // изгиб дугой в повороте
      + 'p.y += sign(p.y) * prm.w * min(abs(p.y), 1.0);' // удлинение только прямой частью: торцы остаются круглыми, а не вытягиваются лимоном
      + 'float pf = 1.0 - prm.x * exp(-p.y * p.y / 0.06); p.xz *= pf;'; // перетяжка — узкая перегородка в радиус шириной, какой бы длины ни была палочка
    this.core = kind(cap.clone(), 200, pinch, { bump: 0.55, order: 1, rimK: 0.5 });
    this.skin = kind(cap.clone(), 200, pinch, { bump: 0.25, alpha0: 0.22, order: 3, rimK: 1.6 });
    const ball = new THREE.IcosahedronGeometry(1, 3);
    this.ball = kind(ball.clone(), 600, 'p += nn * 0.05 * sin(time * 2.0 + prm.y + p.x * 4.0);', { bump: 0.5, order: 1 });
    this.knob = kind(new THREE.IcosahedronGeometry(1, 1), 1500, '', { bump: 0.2, order: 1 });
    this.amoeba = kind(new THREE.IcosahedronGeometry(1, 6), 12, // дробно: край гладкий, без граней (Роман: «не профессионально»)
      `vec3 dir = normalize(position);
       float r = 1.0 + 0.22 * (vn(dir * 2.2 + vec3(time * 0.35 + prm.y)) - 0.5) * 2.0;
       float lobe = max(0.0, dot(dir.xy, vec2(cos(prm.z), sin(prm.z))));
       r += 0.45 * pow(lobe, 4.0) * prm.x + 0.3 * pow(max(0.0, vn(dir * 1.3 + vec3(prm.y, time * 0.2, 0.0)) - 0.45) * 2.0, 2.0);
       p = dir * r; nn = dir;`, { bump: 0.55, alpha0: 0.3, order: 2, rimK: 0.6, ridge: 1.6, edgeA: 0.55 }); // амёба: зовёт vid.js (amoeba3d)
    // Шип акантамёбы (акантоподия): стеклянный конус, остриём наружу; гнётся дугой к острию (prm.z), чуть дышит.
    // Ложноножка-палец акантамёбы (образец Романа): сужается к круглому кончику, гнётся дугой (prm.z) и волной (prm.w), медленно шевелится.
    const fp = []; for (let i = 0; i <= 16; i++) { const u = i / 16; fp.push(new THREE.Vector2(0.7 + 0.6 * (1 - u) ** 3 + 0.3 * (1 - u), -1 + 2 * u)); } // у корня расширяется — палец вырастает из массы тела
    for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; fp.push(new THREE.Vector2(Math.max(0.7 * Math.cos(a), 1e-4), 1 + 0.7 * Math.sin(a) * 0.7)); } // тупой круглый кончик: трубка, не игла
    this.spines = kind(new THREE.LatheGeometry(fp, 24), 500,
      'float u = (p.y + 1.0) * 0.5; float wv = prm.w * sin(u * 4.5 + time * 0.8 + prm.y) * u; p.x += prm.z * u * u + wv; nn.x -= prm.z * u; nn = normalize(nn); p += nn * 0.04 * sin(time * 2.0 + prm.y + p.y * 3.0);',
      { bump: 0.05, alpha0: 0.7, order: 1, rimK: 0.8, ridge: 0.5, after: 'vA.a *= smoothstep(-1.0, -0.55, position.y);' }); // раньше тела; основание тает в теле — сквозь стекло не видно срезов
    const head = new THREE.IcosahedronGeometry(1, 0).toNonIndexed(); head.computeVertexNormals();
    this.head = kind(head, 120, '', { bump: 0.0, order: 3, flat: true, rimK: 0.8, alpha0: 0.35 }); // голова фага — стекло: сквозь неё видна нить ДНК (fx.js), грани блестят ободком
    this.tail = kind(new THREE.CylinderGeometry(0.28, 0.28, 2, 8), 120, '', { bump: 0.1, order: 1 });
    this.all = [this.core, this.skin, this.ball, this.knob, this.amoeba, this.spines, this.head, this.tail];
    globalThis.zaplyvBodies ??= this; // vid.js рисует амёбу этими телами, даже если main.js не передал их явно
    for (const m of this.all) this.scene.add(m);
  }
  resize(W, H) { this.cam.right = W; this.cam.bottom = -H; this.cam.updateProjectionMatrix(); }
  begin() { for (const m of this.all) m.count = 0; }
  // Одно тело: экранная точка (x, y вниз), угол оси (в экранных координатах), масштабы, цвета, параметры.
  put(m, x, y, ang, sx, sy, sz, ca, cb, prm) {
    if (m.count >= m.instanceMatrix.count) return;
    const i = m.count++;
    Q.setFromAxisAngle(Z, -ang - Math.PI / 2);
    M.compose(V.set(x, -y, 0), Q, S.set(sx, sy, sz));
    m.setMatrixAt(i, M);
    const A = m.geometry.attributes;
    A.cA.array.set(ca, i * 4); A.cB.array.set(cb, i * 3); A.prm.array.set(prm, i * 4);
  }
  // Палочка: оболочка и содержимое. half — полудлина, w — полуширина, pinch 0..1 — перетяжка.
  // bend — на сколько концы отходят вбок от середины (экранные единицы, + к оси (-sin, cos)).
  rod(x, y, ang, half, w, pinch, skin, core, seed, bend = 0) {
    const sy = half / 2, glow = c => [c[0] * 0.5 + 0.5, c[1] * 0.5 + 0.5, c[2] * 0.5 + 0.5];
    const E = (h, r) => Math.max(h / r - 2, -0.9), hc = half * 0.86, wc = w * 0.7; // сколько добавить прямой части сверх двух радиусов
    this.put(this.core, x, y, ang, wc, wc, wc, [core[0], core[1], core[2], 1], glow(core), [pinch * 0.95, seed, bend / (4 * wc), E(hc, wc)]);
    this.put(this.skin, x, y, ang, w, w, w, [skin[0], skin[1], skin[2], 1], glow(skin), [pinch, seed, bend / (4 * w), E(half, w)]);
  }
  // Только прозрачная оболочка без содержимого: сквозь неё видны органы (коловратка).
  shell(x, y, ang, half, w, skin, seed, bend = 0) {
    const glow = c => [c[0] * 0.5 + 0.5, c[1] * 0.5 + 0.5, c[2] * 0.5 + 0.5];
    this.put(this.skin, x, y, ang, w, half / 2, w, [skin[0], skin[1], skin[2], 1], glow(skin), [0, seed, bend / (4 * w), 0]);
  }
  sphere(x, y, r, col, rim, seed, zs = 1) { this.put(this.ball, x, y, -Math.PI / 2, r, r, r * zs, [col[0], col[1], col[2], 1], rim, [0, seed, 0, 0]); }
  spike(x, y, r, col) { this.put(this.knob, x, y, -Math.PI / 2, r, r, r, [col[0], col[1], col[2], 1], [1, 1, 1], [0, 0, 0, 0]); }
  blobby(x, y, r, heading, moving, col, rim, seed, sx = 1, sy = 1, ang = -Math.PI / 2) { this.put(this.amoeba, x, y, ang, r * sx, r * sy, r * 0.5, [col[0], col[1], col[2], 1], rim, [moving, seed, -heading, 0]); }
  // Шип: от точки основания (x, y) наружу под углом ang, длина len, полуширина у основания w; bend — отход острия вбок (экранные единицы).
  spine(x, y, ang, len, w, col, rim, seed, bend = 0, wave = 0) { const c = Math.cos(ang), sn = Math.sin(ang);
    this.put(this.spines, x + c * len / 2, y + sn * len / 2, ang, w, len / 2, w, [col[0], col[1], col[2], 1], rim, [0, seed, bend / w, wave]); }
  phage(x, y, ang, s) {
    this.put(this.head, x - Math.cos(ang) * s * 2.1, y - Math.sin(ang) * s * 2.1, ang, s * 0.85, s * 1.15, s * 0.85, [0.8, 0.92, 1, 1], [1, 0.5, 0.6], [0, 0, 0, 0]);
    this.put(this.tail, x - Math.cos(ang) * s * 0.4, y - Math.sin(ang) * s * 0.4, ang, s, s * 0.8, s, [0.6, 0.62, 0.72, 1], [0.9, 0.9, 1], [0, 0, 0, 0]);
  }
  end(time) {
    for (const m of this.all) {
      m.material.uniforms.time.value = time;
      m.instanceMatrix.needsUpdate = true;
      for (const k of ['cA', 'cB', 'prm']) m.geometry.attributes[k].needsUpdate = true;
    }
  }
}
