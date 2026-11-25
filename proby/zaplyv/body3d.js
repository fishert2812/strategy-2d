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
uniform float bump; uniform float alpha0; uniform float rimK; uniform float ridge; uniform float edgeA; uniform float rovno;
varying vec3 vN; varying vec3 vP; varying vec4 vA; varying vec3 vB;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 q = vP * 5.0;
  float f0 = 1.0 - abs(n.z); // насколько близко к силуэту — до шума
  n = normalize(n + bump * (1.0 - smoothstep(0.55, 0.9, f0)) * (vec3(vn(q), vn(q + 3.1), vn(q + 7.7)) - 0.5) * 1.6); // у кромки шум гаснет: край ровный, без зубчиков и зерна
  vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
  float d = max(dot(n, L), 0.0);
  float fres = pow(1.0 - abs(n.z), 2.2);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
  float cav = 0.75 + 0.25 * vn(q * 2.0);
  float rg = ridge * max(1.0 - smoothstep(0.0, 0.075, abs(vn(vP * 4.0) - 0.5)), 0.35 * (1.0 - smoothstep(0.0, 0.045, abs(vn(vP * 8.0 + 4.0) - 0.5)))) * (1.0 - 0.6 * fres); // две сетки разной частоты: тяжи густые, как на образце // светлые складки мембраны сеткой поперёк тела (амёба на образцах)
  vec3 col = vA.rgb * mix(0.18 + 0.72 * d, 0.5, rovno) * cav + vB * fres * rimK + spec * 0.55 + vB * rg;
  gl_FragColor = vec4(col, vA.a * min(1.0, mix(alpha0, edgeA, fres) + rg * 0.6) * (1.0 - 0.85 * smoothstep(0.9, 1.0, f0))); // самый край мягко тает, а не обрывается ступенькой
}`;

function kind(geo, max, vertexBody, opts = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, bump: { value: opts.bump ?? 0.35 }, alpha0: { value: opts.alpha0 ?? 1 }, rimK: { value: opts.rimK ?? 1.1 }, ridge: { value: opts.ridge ?? 0 }, edgeA: { value: opts.edgeA ?? 1 }, rovno: { value: opts.rovno ?? 0 } },
    transparent: (opts.alpha0 ?? 1) < 1, depthWrite: (opts.alpha0 ?? 1) >= 1, flatShading: !!opts.flat,
    vertexShader: `uniform float time; attribute vec4 cA; attribute vec3 cB; attribute vec4 prm;
      varying vec3 vN; varying vec3 vP; varying vec4 vA; varying vec3 vB;
      ${NOISE}
      void main(){
        vec3 p = position; vec3 nn = normal;
        ${vertexBody}
        vP = ${opts.vp || 'position'} + prm.y; vA = cA; vB = cB; ${opts.after || ''}
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
      + 'p.y += sign(p.y) * prm.w * min(abs(p.y), 1.0); vec3 pe = p;' // pe: узор кожи по настоящей длине — у длинной матери он не растянут, при делении не скачет // удлинение только прямой частью: торцы остаются круглыми, а не вытягиваются лимоном
      + 'float dq = max(0.0, prm.x - abs(p.y)); float pf = sqrt(max(0.0, 1.0 - dq * dq)); p.xz *= pf;'; // перетяжка по физике (п. 14): по бокам купола будущих полюсов радиусом R, между ними сужающаяся V; шейка r = R·√(1−u²), prm.x = u
    this.core = kind(cap.clone(), 200, pinch, { bump: 0.55, order: 1, rimK: 0.5, vp: 'pe' });
    this.skin = kind(cap.clone(), 200, pinch, { bump: 0.25, alpha0: 0.22, order: 3, rimK: 1.6, vp: 'pe' });
    const ball = new THREE.IcosahedronGeometry(1, 3);
    this.ball = kind(ball.clone(), 2600, 'p += nn * 0.05 * sin(time * 2.0 + prm.y + p.x * 4.0);', { bump: 0.5, order: 1 });
    // зерно: мелкий шарик (рибосомы, гранулы) — тот же материал, что у ball, но 80 треугольников вместо 1280: на экране он 1–4 точки, а таких на существо десятки
    this.zerno = kind(new THREE.IcosahedronGeometry(1, 1), 9000, '', { bump: 0.5, order: 1 });
    this.knob = kind(new THREE.IcosahedronGeometry(1, 1), 1500, '', { bump: 0.2, order: 1 });
    this.amoeba = kind(new THREE.IcosahedronGeometry(1, 6), 12, // дробно: край гладкий, без граней (Роман: «не профессионально»)
      `vec3 dir = normalize(position);
       float r = 1.0 + 0.22 * (vn(dir * 2.2 + vec3(time * 0.35 + prm.y)) - 0.5) * 2.0;
       float lobe = max(0.0, dot(dir.xy, vec2(cos(prm.z), sin(prm.z))));
       r += 0.45 * pow(lobe, 4.0) * prm.x + 0.3 * pow(max(0.0, vn(dir * 1.3 + vec3(prm.y, time * 0.2, 0.0)) - 0.45) * 2.0, 2.0);
       p = dir * r; nn = dir;`, { bump: 0.35, alpha0: 0.3, order: 2, rimK: 0.9, ridge: 1.3, edgeA: 0.7 }); // амёба: зовёт vid.js (amoeba3d)
    // Шип акантамёбы (акантоподия): стеклянный конус, остриём наружу; гнётся дугой к острию (prm.z), чуть дышит.
    // Ложноножка-палец акантамёбы (образец Романа): сужается к круглому кончику, гнётся дугой (prm.z) и волной (prm.w), медленно шевелится.
    const fp = []; for (let i = 0; i <= 16; i++) { const u = i / 16; fp.push(new THREE.Vector2(0.28 + 0.95 * (1 - u) ** 1.4, -1 + 2 * u)); } // конус: толстый у корня, вливается в тело, к концу сужается (акантоподия)
    for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; fp.push(new THREE.Vector2(Math.max(0.28 * Math.cos(a), 1e-4), 1 + 0.28 * Math.sin(a) * 0.6)); } // узкий скруглённый кончик, без шишечки
    this.spines = kind(new THREE.LatheGeometry(fp, 24), 500,
      'float u = (p.y + 1.0) * 0.5; float wv = prm.w * sin(u * 4.5 + time * 0.8 + prm.y) * u; p.x += prm.z * u * u + wv; nn.x -= prm.z * u; nn = normalize(nn); p += nn * 0.04 * sin(time * 2.0 + prm.y + p.y * 3.0);',
      { bump: 0.05, alpha0: 0.3, edgeA: 0.95, order: 1, rimK: 1.2, ridge: 0, after: 'vA.a *= smoothstep(-1.0, -0.55, position.y);' }); // раньше тела; основание тает в теле — сквозь стекло не видно срезов
    // Нить: короткая стеклянная трубка между двумя точками экрана. Из таких звеньев внахлёст — жгутики и ворсинки сплошными, без бус (кисти точек на тонких нитях дают пунктир).
    this.rope = kind(new THREE.CylinderGeometry(1, 1, 2, 6, 1, true), 12000, '', { bump: 0, alpha0: 0.95, edgeA: 0.35, order: 1, rimK: 0.5 });
    // Туфелька: прозрачное тело-туфля — тупой нос, корма уже, на боку косая ротовая бороздка; плотнее в середине, край тает в кромку.
    const slipV = 'float u = clamp(p.y * 0.5, -1.0, 1.0); p.xz *= (1.0 - 0.45 * smoothstep(0.5, -1.0, u)) * (1.0 + 0.18 * smoothstep(0.0, 0.6, u)); float g = exp(-pow((u - 0.25) * 1.4, 2.0)) * smoothstep(-0.4, 1.0, p.x); p.x -= 1.0 * g; nn.x -= 1.5 * g; nn = normalize(nn);'
      + 'p += nn * 0.03 * sin(time * 2.0 + prm.y + p.y * 3.0); p.y += sign(p.y) * prm.w * min(abs(p.y), 1.0);';
    this.slip = kind(cap.clone(), 8, slipV, { bump: 0.04, alpha0: 0.55, edgeA: 0.8, order: 2, rimK: 1.4, ridge: 0, after: 'vA.rgb *= 1.0 - 0.7 * g; vA.a = min(1.0, vA.a * (1.0 + 0.6 * g));' }); // бороздка темнее и плотнее — видна воронка
    this.fringe = kind(cap.clone(), 8, slipV, { bump: 0.25, alpha0: 0.0, edgeA: 0.7, order: 4, rimK: 1.7, ridge: 0 }); // ворс ресничек: чуть больше тела, светится только край — мягкая сплошная бахрома
    const head = new THREE.IcosahedronGeometry(1, 0).toNonIndexed(); head.computeVertexNormals();
    this.head = kind(head, 120, '', { bump: 0.0, order: 3, flat: true, rimK: 0.8, alpha0: 0.35 }); // голова фага — стекло: сквозь неё видна нить ДНК (fx.js), грани блестят ободком
    this.tail = kind(new THREE.CylinderGeometry(0.28, 0.28, 2, 8), 120, '', { bump: 0.1, order: 1 });
    this.all = [this.rope, this.core, this.skin, this.ball, this.zerno, this.knob, this.amoeba, this.spines, this.slip, this.fringe, this.head, this.tail];
    globalThis.zaplyvBodies ??= this; // vid.js рисует амёбу этими телами, даже если main.js не передал их явно
    for (const m of this.all) this.scene.add(m);
    this.loftC = { m: [], n: 0 }; this.loftS = { m: [], n: 0 }; // тела свободной формы (loft): заводятся по мере надобности
    // Мех слоем (B.meh): густой короткий ворс по поверхности тела — несколько полупрозрачных оболочек над телом, в каждой шейдер оставляет
    // только срезы волосков (ячейка шума = волосок, у каждого своя длина). Все меха кадра — одна сетка в общем буфере. Свой материал, общий свет не трогает.
    { const N = 160000, geo = new THREE.BufferGeometry();
      for (const [k, n] of [['position', 3], ['normal', 3], ['uv', 2], ['sloy', 1], ['cA', 4], ['cB', 3]]) geo.setAttribute(k, new THREE.BufferAttribute(new Float32Array(N * n), n).setUsage(THREE.DynamicDrawUsage));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(N * 6), 1).setUsage(THREE.DynamicDrawUsage));
      const mat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 } }, transparent: true, depthWrite: false,
        vertexShader: `attribute float sloy; attribute vec4 cA; attribute vec3 cB; varying vec2 vU; varying float vS; varying vec4 vA; varying vec3 vB; varying vec3 vN;
          void main(){ vU = uv; vS = sloy; vA = cA; vB = cB; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float time; varying vec2 vU; varying float vS; varying vec4 vA; varying vec3 vB; varying vec3 vN;
          float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main(){
            float fres = 1.0 - abs(normalize(vN).z), kray = smoothstep(0.15, 0.75, fres); // у силуэта мех виден волосками, на лице тела — мягким ворсистым налётом
            vec2 g = vU; g.x += h2(vec2(floor(g.y), 5.0)) * 7.0 + sin(vU.y * 0.35 + time * 1.3) * 0.3 * vS; g.y += h2(vec2(floor(g.x), 9.0)) * 0.8; // ряды вразбежку: не гребёнка // волоски качаются: чем выше слой, тем дальше
            vec2 c = floor(g), f = fract(g) - 0.5; float len = 0.2 + 0.8 * h2(c) * h2(c + 1.7); if (vS > len) discard; // у каждого волоска своя длина, коротких больше: не щётка одной длины
            f.x -= (h2(c + 11.3) - 0.5) * 0.9 * vS; // каждый волосок наклонён по-своему
            vec2 o = (vec2(h2(c + 3.1), h2(c + 7.7)) - 0.5) * 0.45; float t = vS / len, d = length(f - o), th = 0.3 * (1.0 - 0.55 * t);
            float vol = 1.0 - smoothstep(th * 0.4, th, d); if (vol <= 0.0) discard; // край волоска мягкий, не кружок
            vec3 col = mix(vA.rgb * 0.75, vB, t) * (0.8 + 0.5 * fres); // корень тёмный (глубина меха), кончик светлый
            gl_FragColor = vec4(col, vA.a * vol * (1.0 - 0.5 * t) * mix(0.05, 1.0, kray)); }` });
      const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 4; this.scene.add(m); this.mehM = { m, N, v: 0, i: 0 }; }
    // Нити (жгутики, ворс): все нити кадра — одна сетка в общем буфере, каждая нить — одна гладкая трубка вдоль ломаной (без стыков-рисок у звеньев seg).
    { const N = 48000, G = 6, geo = new THREE.BufferGeometry(), idx = new Uint32Array(N * G * 6);
      for (const [k, n] of [['position', 3], ['normal', 3]]) geo.setAttribute(k, new THREE.BufferAttribute(new Float32Array(N * G * n), n).setUsage(THREE.DynamicDrawUsage));
      geo.setIndex(new THREE.BufferAttribute(idx, 1).setUsage(THREE.DynamicDrawUsage));
      const m = kind(geo, 1, '', { bump: 0, alpha0: 0.95, edgeA: 0.6, order: 1, rimK: 1.3 }); // кромка ярче, чем у seg: блик по краю нити (образцы CDC)
      for (const [k, n] of [['cA', 4], ['cB', 3], ['prm', 4]]) geo.setAttribute(k, new THREE.BufferAttribute(new Float32Array(N * G * n), n).setUsage(THREE.DynamicDrawUsage)); // цвет у каждой вершины: у каждой нити свой
      m.setMatrixAt(0, new THREE.Matrix4()); this.nit = { m, N, G, v: 0, i: 0 }; this.scene.add(m); this.all.push(m); }
  }
  resize(W, H) { this.cam.right = W; this.cam.bottom = -H; this.cam.updateProjectionMatrix(); }
  begin() { for (const m of this.all) m.count = 0; this.loftC.n = this.loftS.n = 0; this.nit.v = this.nit.i = 0; this.mehM.v = this.mehM.i = 0; }
  // Одно тело: экранная точка (x, y вниз), угол оси (в экранных координатах), масштабы, цвета, параметры.
  put(m, x, y, ang, sx, sy, sz, ca, cb, prm) {
    if (m.count >= m.instanceMatrix.count) return;
    const i = m.count++;
    Q.setFromAxisAngle(Z, -ang - Math.PI / 2);
    M.compose(V.set(x, -y, this.vyshe || 0), Q, S.set(sx, sy, sz));
    m.setMatrixAt(i, M);
    const A = m.geometry.attributes;
    A.cA.array.set(ca, i * 4); A.cB.array.set(cb, i * 3); A.prm.array.set(prm, i * 4);
  }
  // Палочка: оболочка и содержимое. half — полудлина, w — полуширина, pinch 0..1 — перетяжка.
  // bend — на сколько концы отходят вбок от середины (экранные единицы, + к оси (-sin, cos)).
  rod(x, y, ang, half, w, pinch, skin, core, seed, bend = 0, dna = 0) { // dna 0..1: нуклеоид (содержимое) вытягивается и делится надвое до кольца
    const sy = half / 2, glow = c => [c[0] * 0.5 + 0.5, c[1] * 0.5 + 0.5, c[2] * 0.5 + 0.5];
    const E = (h, r) => Math.max(h / r - 2, -0.9), hc = half * 0.86, wc = w * 0.7; // сколько добавить прямой части сверх двух радиусов
    this.put(this.core, x, y, ang, wc, wc, wc, [core[0], core[1], core[2], 1], glow(core), [Math.max(pinch, dna), seed, bend / (4 * wc), E(hc, wc)]);
    this.put(this.skin, x, y, ang, w, w, w, [skin[0], skin[1], skin[2], 1], glow(skin), [pinch, seed, bend / (4 * w), E(half, w)]);
  }
  // Только прозрачная оболочка без содержимого: сквозь неё видны органы (коловратка).
  shell(x, y, ang, half, w, skin, seed, bend = 0) {
    const glow = c => [c[0] * 0.5 + 0.5, c[1] * 0.5 + 0.5, c[2] * 0.5 + 0.5];
    this.put(this.skin, x, y, ang, w, half / 2, w, [skin[0], skin[1], skin[2], 1], glow(skin), [0, seed, bend / (4 * w), 0]);
  }
  sphere(x, y, r, col, rim, seed, zs = 1) { this.put(r < 4 ? this.zerno : this.ball, x, y, -Math.PI / 2, r, r, r * zs, [col[0], col[1], col[2], 1], rim, [0, seed, 0, 0]); }
  spike(x, y, r, col) { this.put(this.knob, x, y, -Math.PI / 2, r, r, r, [col[0], col[1], col[2], 1], [1, 1, 1], [0, 0, 0, 0]); }
  blobby(x, y, r, heading, moving, col, rim, seed, sx = 1, sy = 1, ang = -Math.PI / 2) { this.put(this.amoeba, x, y, ang, r * sx, r * sy, r * 0.5, [col[0], col[1], col[2], 1], rim, [moving, seed, -heading, 0]); }
  // Шип: от точки основания (x, y) наружу под углом ang, длина len, полуширина у основания w; bend — отход острия вбок (экранные единицы).
  slipper(x, y, ang, half, w, col, rim, seed, fr = 0, fcol = rim) { this.put(this.slip, x, y, ang, w, w, w * 0.7, [col[0], col[1], col[2], 1], rim, [0, seed, 0, Math.max(half / w - 2, -0.9)]);
    if (fr) { const wf = w * (1 + fr); this.put(this.fringe, x, y, ang, wf, wf, wf * 0.7, [fcol[0], fcol[1], fcol[2], 1], fcol, [0, seed, 0, Math.max((half + w * fr) / wf - 2, -0.9)]); } }
  seg(x0, y0, x1, y1, r, col, a = 1) { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy); if (l < 1e-3 || this.rope.count >= 12000) return; this.put(this.rope, (x0 + x1) / 2, (y0 + y1) / 2, Math.atan2(dy, dx), r, l / 2, r, [col[0], col[1], col[2], a], col, [0, 0, 0, 0]); } // звено нити встык: внахлёст полупрозрачные концы дают яркие узлы-бусы
  spine(x, y, ang, len, w, col, rim, seed, bend = 0, wave = 0) { const c = Math.cos(ang), sn = Math.sin(ang);
    this.put(this.spines, x + c * len / 2, y + sn * len / 2, ang, w, len / 2, w, [col[0], col[1], col[2], 1], rim, [0, seed, bend / w, wave]); }
  phage(x, y, ang, s) {
    this.put(this.head, x - Math.cos(ang) * s * 2.1, y - Math.sin(ang) * s * 2.1, ang, s * 0.85, s * 1.15, s * 0.85, [0.8, 0.92, 1, 1], [1, 0.5, 0.6], [0, 0, 0, 0]);
    this.put(this.tail, x - Math.cos(ang) * s * 0.4, y - Math.sin(ang) * s * 0.4, ang, s, s * 0.8, s, [0.6, 0.62, 0.72, 1], [0.9, 0.9, 1], [0, 0, 0, 0]);
  }
  // Тело свободной формы (telo_os.js): кольца вдоль осевой линии, уже в экранных точках — { x, y, tx, ty, r, dr, a }.
  // plotno — плотная сердцевина, иначе стеклянная оболочка (тот же свет и узор, что у палочки). Сетка своя на каждое тело, пишется каждый кадр.
  loft(kolca, plotno, col, rim, seed, alfa = 1, order = null, slit = null) { // slit(x, y) — поверхность тела под точкой { h, nx, ny, nz }: ветка плавно сливается с ней, шва нет
    const P = plotno ? this.loftC : this.loftS, R = kolca.length, G = 18; let m = P.m[P.n++];
    if (!m || m.kolec !== R) { const geo = new THREE.BufferGeometry(), idx = [];
      for (const [k, n] of [['position', 3], ['normal', 3], ['uv', 2]]) geo.setAttribute(k, new THREE.BufferAttribute(new Float32Array(R * (G + 1) * n), n).setUsage(THREE.DynamicDrawUsage));
      for (let j = 0; j < R - 1; j++) for (let k = 0; k < G; k++) { const a = j * (G + 1) + k, b = a + G + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); } geo.setIndex(idx);
      const old = m; m = kind(geo, 1, '', plotno ? { bump: 0.55, order: 1, rimK: 0.5, vp: 'vec3(uv.x, uv.y, normal.z)' } : { bump: 0.25, alpha0: 0.22, order: 3, rimK: 1.6, rovno: 0.75, vp: 'vec3(uv.x, uv.y, normal.z)' });
      m.setMatrixAt(0, new THREE.Matrix4()); m.kolec = R; if (old) { this.scene.remove(old); this.all[this.all.indexOf(old)] = m; P.m[P.n - 1] = m; } else { this.all.push(m); P.m.push(m); } this.scene.add(m); }
    const A = m.geometry.attributes, p = A.position.array, nr = A.normal.array, uv = A.uv.array, z0 = this.vyshe || 0; let i = 0;
    for (const q of kolca) for (let k = 0; k <= G; k++) { const t = k / G * 6.2832, c = Math.cos(t), sn = Math.sin(t), nx = -q.ty * c, ny = q.tx * c; // радиус кольца: в плоскости экрана по нормали оси, из экрана по z
      p[i * 3] = q.x + nx * q.r; p[i * 3 + 1] = -(q.y + ny * q.r); p[i * 3 + 2] = sn * q.r + z0;
      const l = Math.hypot(1, q.dr); nr[i * 3] = (nx - q.tx * q.dr) / l; nr[i * 3 + 1] = -(ny - q.ty * q.dr) / l; nr[i * 3 + 2] = sn / l; uv[i * 2] = c; uv[i * 2 + 1] = q.a;
      const T = slit && slit(q.x + nx * q.r, q.y + ny * q.r);
      // плавный максимум двух поверхностей: внутри тела ветка идёт по самому телу, у выхода поднимается галтелью
      // тело под веткой (slit.telo): край тела поднимается на поверхность ветки и берёт её нормаль, контур тела поперёк основания пропадает
      if (T && slit.telo) { if (sn > -0.05) { const z = Math.max(0, sn * q.r), k = slit.k, u = (T.f ?? 1) * (1 - Math.max(0, Math.min(1, 0.5 + (z - T.h) / (2 * k)))), t = 1 - u; p[i * 3 + 2] = T.h * u + z * t + k * t * u - slit.telo * u + z0;
        nr[i * 3] = nr[i * 3] * t + T.nx * u; nr[i * 3 + 1] = nr[i * 3 + 1] * t - T.ny * u; nr[i * 3 + 2] = Math.max(0, nr[i * 3 + 2]) * t + T.nz * u; } }
      else if (T && sn * q.r <= T.h - slit.k) p[i * 3 + 2] = T.h - 0.25 * slit.k - 2 * (T.h - slit.k - sn * q.r) + z0; // глубоко в теле ветка просто уходит под его поверхность
      else if (T) { const z = sn * q.r, k = slit.k, f = T.f ?? 1, u = f * (1 - Math.max(0, Math.min(1, 0.5 + (z - T.h) / (2 * k)))), t = 1 - u; p[i * 3 + 2] = T.h * u + z * t + 0.35 * k * t * u - 0.25 * k * u * u + z0; // к глубине уходит под тело под углом: край заплатки ровный, без дрожи двух совпавших поверхностей
        // свет переходит от тела к ветке втрое шире, чем сама форма: перепада света на линии встречи нет
        const un = f * (1 - Math.max(0, Math.min(1, 0.33 + (z - T.h) / (6 * k)))), tn = 1 - un; nr[i * 3] = nr[i * 3] * tn + T.nx * un; nr[i * 3 + 1] = nr[i * 3 + 1] * tn - T.ny * un; nr[i * 3 + 2] = Math.max(0, nr[i * 3 + 2]) * tn + T.nz * un; }
      i++; }
    A.position.needsUpdate = A.normal.needsUpdate = A.uv.needsUpdate = true; m.count = 1; m.renderOrder = order ?? (plotno ? 1 : 3); m.material.transparent = m.renderOrder > 3 || !plotno;
    m.geometry.attributes.cA.array.set([col[0], col[1], col[2], alfa]); m.geometry.attributes.cB.array.set(rim); m.geometry.attributes.prm.array.set([0, seed, 0, 0]);
  }
  // Мех слоем: kolca — кольца тела в точках экрана, как у loft; dlina — высота меха, gustota — волосков на точку экрана, sloi — сколько оболочек.
  // Сетка только по видимой (верхней) половине тела и по краю: снизу меха не видно.
  meh(kolca, { dlina, gustota = 0.25, sloi = 6, krug = 12, cvet, konchik = cvet, a = 1, z0 = 0 }) {
    const T = this.mehM, R = kolca.length, G = krug, t0 = -0.15 * Math.PI, t1 = 1.15 * Math.PI; if (R < 2 || T.v + sloi * R * (G + 1) > T.N) return;
    const A = T.m.geometry.attributes, P = A.position.array, Nr = A.normal.array, U = A.uv.array, Sl = A.sloy.array, cA = A.cA.array, cB = A.cB.array, ix = T.m.geometry.index.array;
    const dl = [0]; for (let j = 1; j < R; j++) dl.push(dl[j - 1] + Math.hypot(kolca[j].x - kolca[j - 1].x, kolca[j].y - kolca[j - 1].y)); const rm = Math.max(...kolca.map(q => q.r));
    for (let s = 1; s <= sloi; s++) { const h = s / sloi, v0 = T.v;
      for (let j = 0; j < R; j++) { const q = kolca[j], rr = q.r + h * dlina * Math.min(1, q.r / (rm * 0.35));
        for (let k = 0; k <= G; k++) { const t = t0 + (t1 - t0) * k / G, c = Math.cos(t), sn = Math.sin(t), nx = -q.ty * c, ny = q.tx * c, v = T.v++;
          P[v * 3] = q.x + nx * rr; P[v * 3 + 1] = -(q.y + ny * rr); P[v * 3 + 2] = sn * rr + z0; Nr[v * 3] = nx; Nr[v * 3 + 1] = -ny; Nr[v * 3 + 2] = sn;
          U[v * 2] = (t - t0) * rm * gustota; U[v * 2 + 1] = dl[j] * gustota; Sl[v] = h;
          cA[v * 4] = cvet[0]; cA[v * 4 + 1] = cvet[1]; cA[v * 4 + 2] = cvet[2]; cA[v * 4 + 3] = a; cB[v * 3] = konchik[0]; cB[v * 3 + 1] = konchik[1]; cB[v * 3 + 2] = konchik[2]; } }
      for (let j = 0; j < R - 1; j++) for (let k = 0; k < G; k++) { const a0 = v0 + j * (G + 1) + k, b0 = a0 + G + 1; ix.set([a0, b0, a0 + 1, a0 + 1, b0, b0 + 1], T.i); T.i += 6; } }
  }
  // Нить: pts — точки экрана [x0, y0, x1, y1, …] вдоль нити; толщина и прозрачность плавно от корня (r, a) к кончику (r1, a1).
  niti(pts, r, col, a = 1, r1 = r, a1 = a, rim = col, z = this.vyshe || 0, col1 = col) { // col1 — цвет кончика (светлые кончики ворса) // z — высота нити над плоскостью (к зрителю)
    if (pts.length < 4) return; if (pts.length < 24) { const q = [], m = pts.length >> 1, X = j => pts[Math.max(0, Math.min(m - 1, j)) * 2], Y = j => pts[Math.max(0, Math.min(m - 1, j)) * 2 + 1]; // мало точек — сглаживаю (Катмулл — Ром): ворсинка гнётся дугой, а не ломаной
      for (let j = 0; j < m - 1; j++) for (let u = 0; u < 3; u++) { const t = u / 3, t2 = t * t, t3 = t2 * t, c = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
        q.push(c(X(j - 1), X(j), X(j + 1), X(j + 2)), c(Y(j - 1), Y(j), Y(j + 1), Y(j + 2))); }
      q.push(X(m - 1), Y(m - 1)); pts = q; }
    { const m = pts.length >> 1, d0 = Math.hypot(pts[2] - pts[0], pts[3] - pts[1]) || 1, d1 = Math.hypot(pts[m * 2 - 2] - pts[m * 2 - 4], pts[m * 2 - 1] - pts[m * 2 - 3]) || 1; // концы скруглены: кольцо-точка чуть дальше конца, торца нет
      pts = [pts[0] - (pts[2] - pts[0]) / d0 * r * 0.7, pts[1] - (pts[3] - pts[1]) / d0 * r * 0.7, ...pts, pts[m * 2 - 2] + (pts[m * 2 - 2] - pts[m * 2 - 4]) / d1 * r1 * 0.7, pts[m * 2 - 1] + (pts[m * 2 - 1] - pts[m * 2 - 3]) / d1 * r1 * 0.7]; }
    const T = this.nit, n = pts.length >> 1, G = T.G; if (T.v + n * G > T.N * G) return;
    const A = T.m.geometry.attributes, P = A.position.array, Nr = A.normal.array, cA = A.cA.array, cB = A.cB.array, ix = T.m.geometry.index.array, v0 = T.v, z0 = z; const CS = T.cs || (T.cs = Float32Array.from({ length: G * 2 }, (_, i) => i & 1 ? Math.sin((i >> 1) / G * 6.2832) : Math.cos((i >> 1) / G * 6.2832))); // круг сечения считается один раз, а не на каждую вершину
    for (let j = 0; j < n; j++) { const a0 = Math.max(0, j - 1), b0 = Math.min(n - 1, j + 1), dx = pts[b0 * 2] - pts[a0 * 2], dy = pts[b0 * 2 + 1] - pts[a0 * 2 + 1], l = Math.hypot(dx, dy) || 1, tx = dx / l, ty = dy / l, f = Math.min(1, Math.max(0, (j - 1) / (n - 3))), rr = (r + (r1 - r) * f) * (j === 0 || j === n - 1 ? 0.25 : 1), al = a + (a1 - a) * f;
      for (let k = 0; k < G; k++) { const c = CS[k * 2], sn = CS[k * 2 + 1], nx = -ty * c, ny = tx * c, v = T.v++;
        P[v * 3] = pts[j * 2] + nx * rr; P[v * 3 + 1] = -(pts[j * 2 + 1] + ny * rr); P[v * 3 + 2] = sn * rr + z0; Nr[v * 3] = nx; Nr[v * 3 + 1] = -ny; Nr[v * 3 + 2] = sn;
        cA[v * 4] = col[0] + (col1[0] - col[0]) * f; cA[v * 4 + 1] = col[1] + (col1[1] - col[1]) * f; cA[v * 4 + 2] = col[2] + (col1[2] - col[2]) * f; cA[v * 4 + 3] = al; cB[v * 3] = rim[0]; cB[v * 3 + 1] = rim[1]; cB[v * 3 + 2] = rim[2]; } }
    for (let j = 0; j < n - 1; j++) for (let k = 0; k < G; k++) { const a0 = v0 + j * G + k, b0 = v0 + j * G + (k + 1) % G; ix.set([a0, a0 + G, b0, b0, a0 + G, b0 + G], T.i); T.i += 6; }
  }
  end(time) {
    { const T = this.mehM, g = T.m.geometry; g.setDrawRange(0, T.i); T.m.visible = T.i > 0; T.m.material.uniforms.time.value = time; // мех: загрузить только занятую часть
      for (const [k, n] of [['position', 3], ['normal', 3], ['uv', 2], ['sloy', 1], ['cA', 4], ['cB', 3]]) { const at = g.attributes[k]; at.clearUpdateRanges(); at.addUpdateRange(0, T.v * n); at.needsUpdate = true; }
      g.index.clearUpdateRanges(); g.index.addUpdateRange(0, T.i); g.index.needsUpdate = true; }
    { const T = this.nit, g = T.m.geometry; g.setDrawRange(0, T.i); T.m.count = T.i ? 1 : 0; // нити: загрузить только занятую часть буфера
      for (const [k, n] of [['position', 3], ['normal', 3], ['cA', 4], ['cB', 3]]) { const at = g.attributes[k]; at.clearUpdateRanges(); at.addUpdateRange(0, T.v * n); at.needsUpdate = true; }
      g.index.clearUpdateRanges(); g.index.addUpdateRange(0, T.i); g.index.needsUpdate = true; g.attributes.prm.clearUpdateRanges(); g.attributes.prm.addUpdateRange(0, 4); } // prm у нитей не пишется: не гонять его в видеокарту
    for (const m of this.all) {
      m.material.uniforms.time.value = time;
      m.instanceMatrix.needsUpdate = true;
      for (const k of ['cA', 'cB', 'prm']) m.geometry.attributes[k].needsUpdate = true;
    }
  }
}
