// Объёмная спираль ДНК на Three.js — одна модель для загрузки (zagruzka.js) и полоски генома в игре (dnk_polosa.js).
// Роман 27.11: «провал дизайнера! Ни разу не эффектно как на референсах!»; «Обе спирали и в игре заменить. Качественно!»;
// 28.11 07:40: «тебе нужно добиться студийного качества хотя бы в визуале и взаимодействии». Образцы: стеклянная спираль с бусинами
// и тёплыми перекладинами на тёмном фоне, размытые спирали позади; бирюзовая объёмная с жёлтыми перекладинами и глубиной резкости.
// Модель: нити — стеклянные бусины с бликом и светящейся сердцевиной внутри, перекладины — пары цветных цилиндров, вращение медленное.
// Сцена: позади размытые спирали и тёплые огни (рисуются в малый буфер и размываются), поверх — свечение ярких мест.
import * as THREE from '../three.module.min.js';

export const PARY = [[0xff5a2e, 0xff8f3a], [0xff3d4f, 0xffa64a], [0xff7a30, 0xffc04d]];
const SDVIG = Math.PI * 0.78, NA_VITOK = 12;

// Блик и кромка: стекло светится по краю, как на образцах
function kromka(mat, sila, cvet) {
  const prezhde = mat.onBeforeCompile; // не затираем свечение своим цветом (svetCvet)
  mat.onBeforeCompile = (sh, r) => { prezhde.call(mat, sh, r);
    sh.uniforms.uKr = { value: sila }; sh.uniforms.uKrC = { value: new THREE.Color(cvet) };
    sh.fragmentShader = 'uniform float uKr; uniform vec3 uKrC;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      '#include <opaque_fragment>\n float kr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2); gl_FragColor.rgb += uKrC * kr * uKr;');
  };
  return mat;
}
function svetCvet(mat, k) { // перекладина светится своим цветом
  mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * ' + k.toFixed(2) + ';'); };
  return mat;
}

// Спираль вдоль оси Y: par пар оснований. ustanovit(k) — сколько пар собрано (дробно, для анимации сборки).
export function spiral({ par = 40, R = 0.78, shag = 0.12, bus = 0.22, cvetNiti = 0xcfe2f4, kromkaC = 0x7fd8ff, yarko = 1, izgib = 0, glub = 0, naVitok = 20, nb = 2, ustR = 0.11, puzyri = 0.18 } = {}) {
  const grp = new THREE.Group(), n = par, v = new THREE.Vector3(), L = (n - 1) * shag;
  let faza = 0;
  // ось изогнута буквой S (izgib), концы уходят от зрителя (glub) — дальние витки попадают в размытие по глубине
  const tochka = (i, d, out = new THREE.Vector3()) => {
    const a = i * Math.PI * 2 / naVitok + d + faza, y = (i - (n - 1) / 2) * shag, u = y / (L / 2);
    return out.set(R * Math.cos(a) + izgib * Math.sin(u * Math.PI), y, R * Math.sin(a) - glub * u * u);
  };
  // бусины: по две-три на пару на каждой нити, разного размера; прозрачное стекло — тёмная середина, яркая кромка
  const NB = nb, busy = new THREE.InstancedMesh(new THREE.SphereGeometry(bus, 22, 16),
    kromka(new THREE.MeshPhysicalMaterial({ color: cvetNiti, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.55, depthWrite: true, envMapIntensity: 3.6, specularIntensity: 1, ior: 1.5 }), 1.0 * yarko, kromkaC), n * NB * 2);
  busy.renderOrder = 2;
  // сердцевина: внутри каждой бусины светится маленькое ядро — нить горит изнутри
  const yadra = new THREE.InstancedMesh(new THREE.SphereGeometry(bus * 0.42, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6a5cff).multiplyScalar(0.6 * yarko), transparent: true, opacity: 0.25 }), n * NB * 2);
  grp.add(yadra); grp.add(busy);
  // стеклянная лента нити: короткие трубки от бусины к бусине — нить читается непрерывной
  const svz = new THREE.InstancedMesh(new THREE.CylinderGeometry(bus * 0.5, bus * 0.5, 1, 12, 1, true),
    kromka(new THREE.MeshPhysicalMaterial({ color: cvetNiti, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6, envMapIntensity: 3, side: THREE.DoubleSide }), 0.6 * yarko, kromkaC), n * 2);
  svz.renderOrder = 1; grp.add(svz);
  // перекладины: тонкие, плотной лесенкой, тёплые, светятся изнутри
  const ust = new THREE.InstancedMesh(new THREE.CylinderGeometry(bus * ustR, bus * ustR, 1, 8, 1), svetCvet(new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.05 }), 0.45 * yarko), n * 2);
  const cv = new THREE.Color();
  for (let i = 0; i < n; i++) { const p = PARY[(i * 7 + (i >> 2)) % 3], nav = (i * 5) % 3 === 0; ust.setColorAt(i * 2, cv.set(nav ? p[1] : p[0])); ust.setColorAt(i * 2 + 1, cv.set(nav ? p[0] : p[1])); }
  grp.add(ust);
  const sl = j => (((j * 2654435761) >>> 0) % 1000) / 1000, razb = Array.from({ length: n * NB * 2 }, (_, j) => j % NB ? 0.45 + 0.35 * sl(j) : (sl(j + 41) < puzyri ? 1.6 + 0.5 * sl(j + 5) : 0.6 + 0.75 * sl(j))); // крупные и мелкие вперемешку, изредка большой «пузырь»
  const povB = Array.from({ length: n * NB * 2 }, (_, j) => new THREE.Quaternion().setFromEuler(new THREE.Euler(sl(j + 7) * 6, sl(j + 13) * 6, sl(j + 29) * 6))); // сплюснуты в разные стороны // размеры бусин вразнобой
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let kPred = n;
  function ustanovit(k = kPred, f = faza) {
    kPred = k; faza = f;
    for (let i = 0; i < n; i++) {
      const s = Math.max(0, Math.min(1, k - i)), e = 1 - Math.pow(1 - s, 3);
      for (let st = 0; st < 2; st++) for (let b = 0; b < NB; b++) {
        const j = (i * 2 + st) * NB + b;
        tochka(i + b / NB + (sl(j + 3) - 0.5) * 0.2, st ? SDVIG : 0, v); const sb = Math.max(0, Math.min(1, (k - i) * 2 - b * 0.3)), r = 0.0001 + (1 - Math.pow(1 - sb, 3)) * razb[j];
        M.compose(v, povB[j], S.set(r * 1.18, r * 0.78, r)); busy.setMatrixAt(j, M); yadra.setMatrixAt(j, M);
      }
      for (let st = 0; st < 2; st++) { // лента от этой бусины к следующей
        const d = st ? SDVIG : 0; tochka(i, d, A); tochka(i + 1, d, B); const sv = Math.max(0, Math.min(1, k - i - 0.5)) * (i < n - 1 ? 1 : 0);
        const dir = C.subVectors(B, A); const dl = dir.length(); dir.normalize(); Q.setFromUnitVectors(up, dir);
        M.compose(P.copy(A).addScaledVector(dir, dl * sv / 2), Q, S.set(sv > 0 ? 1 : 0.0001, Math.max(0.0001, dl * sv), sv > 0 ? 1 : 0.0001)); svz.setMatrixAt(i * 2 + st, M);
      }
      tochka(i, 0, A); tochka(i, SDVIG, B); C.addVectors(A, B).multiplyScalar(0.5);
      for (let st = 0; st < 2; st++) { // половина растёт от нити к середине
        const ot = st ? B : A, dl = ot.distanceTo(C) - bus * 0.1, dir = v.subVectors(C, ot).normalize();
        Q.setFromUnitVectors(up, dir); const Ln = Math.max(0.0001, dl * e);
        M.compose(P.copy(ot).addScaledVector(dir, Ln / 2), Q, S.set(e > 0 ? 1 : 0.0001, Ln, e > 0 ? 1 : 0.0001)); ust.setMatrixAt(i * 2 + st, M);
      }
    }
    busy.instanceMatrix.needsUpdate = true; yadra.instanceMatrix.needsUpdate = true; svz.instanceMatrix.needsUpdate = true; ust.instanceMatrix.needsUpdate = true;
  }
  ustanovit(n);
  grp.userData = { ustanovit, n, tochka, busy, ust, yadra, povorot: f => ustanovit(kPred, f) };
  return grp;
}

// Стеклянные капли вокруг: неровные, жёлто-оранжевые, со своим светом
export function kapli(N, razbros, { yarko = 1 } = {}) {
  const geo = new THREE.IcosahedronGeometry(0.22, 4), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { v3.fromBufferAttribute(pos, i); v3.multiplyScalar(1 + 0.3 * Math.sin(v3.x * 9 + v3.y * 7) + 0.2 * Math.cos(v3.z * 11) + 0.15 * Math.sin(v3.z * 23 + v3.x * 5)); pos.setXYZ(i, v3.x, v3.y, v3.z); }
  geo.computeVertexNormals();
  const m = new THREE.InstancedMesh(geo, kromka(svetCvet(new THREE.MeshPhysicalMaterial({ roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.8, envMapIntensity: 2.4 }), 0.35 * yarko), 0.8, 0xfff0a0), N);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  const KC = [0xffa23a, 0xc8f04a, 0x6ad8ff], cc = new THREE.Color(); for (let i = 0; i < N; i++) m.setColorAt(i, cc.set(KC[i % 3])); // оранжевые, жёлто-зелёные, голубые
  m.userData.d = Array.from({ length: N }, () => ({ p: new THREE.Vector3((Math.random() - 0.5) * razbros[0], (Math.random() - 0.5) * razbros[1], (Math.random() - 0.5) * razbros[2]), s: 0.25 + Math.random() * 0.5, f: Math.random() * 7, e: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(2.4) }));
  m.userData.dvig = t => { m.userData.d.forEach((d, i) => { E.set(d.e.x * t * 0.2 + d.f, d.e.y * t * 0.2, d.e.z); M.compose(v3.copy(d.p).add(new THREE.Vector3(Math.sin(t * 0.3 + d.f) * 0.3, Math.cos(t * 0.25 + d.f) * 0.4, 0)), Q.setFromEuler(E), new THREE.Vector3(d.s, d.s * 0.85, d.s)); m.setMatrixAt(i, M); }); m.instanceMatrix.needsUpdate = true; };
  m.userData.dvig(0);
  return m;
}
const v3 = new THREE.Vector3();

// Окружение для бликов стекла: тёмная вода с тёплым и холодным светом
function okruzhenie(renderer) {
  const sc = new THREE.Scene(), geo = new THREE.SphereGeometry(10, 32, 16);
  sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0x0a1420 })));
  const pyatno = (c, x, y, z, s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 8), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); sc.add(m); };
  pyatno(0xffffff, 3, 6, 5, 1.6); pyatno(0x7a5cff, -7, 1, -2, 2.2); pyatno(0xff8a3c, 6, -4, -5, 2.4); pyatno(0x40d0ff, -2, -6, 6, 1.8);
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(sc, 0.04).texture; pm.dispose(); return t;
}

// Мягкие огни (боке): круглые тёплые пятна, позади размываются
function ogni(N, razbros, cveta) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), raz = new Float32Array(N), c = new THREE.Color();
  for (let i = 0; i < N; i++) { pos.set([(Math.random() - 0.5) * razbros[0], (Math.random() - 0.5) * razbros[1], (Math.random() - 0.5) * razbros[2]], i * 3); c.set(cveta[i % cveta.length]); col.set([c.r, c.g, c.b], i * 3); raz[i] = 0.4 + Math.random() * 1.6; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('raz', new THREE.BufferAttribute(raz, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uPx: { value: 260 } },
    vertexShader: 'attribute float raz; attribute vec3 color; varying vec3 vC; uniform float uT; uniform float uPx; void main(){ vec3 p = position; p.y += sin(uT*0.3 + position.x*1.7)*0.25; p.x += cos(uT*0.23 + position.z)*0.2; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uPx*raz/(-mv.z); vC = color; }',
    fragmentShader: 'varying vec3 vC; void main(){ vec2 d = gl_PointCoord-0.5; float r = length(d)*2.0; float a = smoothstep(1.0,0.55,r)*0.85 + smoothstep(0.6,0.0,r)*0.3; gl_FragColor = vec4(vC*a, a); }' });
  return new THREE.Points(geo, mat);
}

// Полноэкранные проходы: размытие, яркое, сборка кадра
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
function prohod(fs, uniforms) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false })); const s = new THREE.Scene(); s.add(m); return { s, u: m.material.uniforms }; }
const BLUR = 'uniform sampler2D uT; uniform vec2 uD; varying vec2 vUv; void main(){ vec4 c = texture2D(uT,vUv)*0.227; c += (texture2D(uT,vUv+uD*1.38)+texture2D(uT,vUv-uD*1.38))*0.316; c += (texture2D(uT,vUv+uD*3.23)+texture2D(uT,vUv-uD*3.23))*0.07; gl_FragColor = c; }';
const YARK = 'uniform sampler2D uT; varying vec2 vUv; void main(){ vec4 c = texture2D(uT,vUv); float l = max(c.r,max(c.g,c.b)); gl_FragColor = vec4(c.rgb*smoothstep(0.8,1.3,l), 1.0); }';
const SBOR = `uniform sampler2D uFon; uniform sampler2D uGl; uniform sampler2D uGlR; uniform sampler2D uGlub; uniform vec3 uFok; uniform sampler2D uSv; uniform float uSvK; uniform float uA; uniform vec3 uV0; uniform vec3 uV1; varying vec2 vUv;
void main(){ vec2 q = vUv-vec2(0.5,0.45); float r = length(q*vec2(0.8,1.0));
  vec3 voda = mix(uV0, uV1, smoothstep(0.9,0.0,r));
  vec3 c = voda + texture2D(uFon,vUv).rgb;
  float zd = texture2D(uGlub,vUv).x*2.0-1.0; float z = 2.0*uFok.x*uFok.y/(uFok.y+uFok.x - zd*(uFok.y-uFok.x));
  float coc = clamp((abs(z - uFok.z)-1.4)/2.6, 0.0, 1.0); // резко у фокуса, дальше и ближе — размытие
  vec4 g = mix(texture2D(uGl,vUv), texture2D(uGlR,vUv), coc); c = c*(1.0-g.a) + g.rgb;
  c += texture2D(uSv,vUv).rgb*uSvK;
  c *= smoothstep(1.25,0.35,r);
  c = c/(1.0+c*0.25);
  gl_FragColor = vec4(c*uA, 1.0); }`;

// Сцена с фоном и свечением на своём холсте. Возвращает { renderer, kamera, glavnaya, fonovaya, kadr(t), razmer(w,h) }
export function scena(canvas, { dpr = Math.min(2, devicePixelRatio || 1), voda = [0x100e3a, 0x3d2f80] } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  const env = okruzhenie(renderer);
  const kamera = new THREE.PerspectiveCamera(34, 1, 0.1, 100); kamera.position.set(0, 0, 18);
  const glavnaya = new THREE.Scene(), fonovaya = new THREE.Scene(); glavnaya.environment = env; fonovaya.environment = env;
  for (const s of [glavnaya, fonovaya]) { s.add(new THREE.HemisphereLight(0x9fd8ff, 0x1a0820, 0.8)); const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(3, 5, 6); s.add(d);
    const p1 = new THREE.PointLight(0xff3fd0, 14, 3.5); p1.position.set(1.6, -1.0, 1.6); s.add(p1); const p2 = new THREE.PointLight(0x4fd0ff, 22, 20); p2.position.set(-3, 3, 1); s.add(p2);
    for (const y of [-2.5, 0, 2.5]) { const t = new THREE.PointLight(0xff7a30, 3, 3); t.position.set(0, y, 0); s.add(t); } } // тёплый свет перекладин отражается в бусинах
  const opt = { type: THREE.HalfFloatType };
  let rtG, rtF1, rtF2, rtS1, rtS2, rtM1, rtM2; const fokus = { d: 15 };
  const pB = prohod(BLUR, { uT: { value: null }, uD: { value: new THREE.Vector2() } }), pY = prohod(YARK, { uT: { value: null } });
  const pS = prohod(SBOR, { uFon: { value: null }, uGl: { value: null }, uGlR: { value: null }, uGlub: { value: null }, uFok: { value: new THREE.Vector3() }, uSv: { value: null }, uSvK: { value: 0.9 }, uA: { value: 1 }, uV0: { value: new THREE.Color(voda[0]) }, uV1: { value: new THREE.Color(voda[1]) } });
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function razmer(w, h) {
    renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix();
    const W = Math.round(w * dpr), H = Math.round(h * dpr), q = (k) => [Math.max(4, Math.round(W / k)), Math.max(4, Math.round(H / k))];
    [rtG, rtF1, rtF2, rtS1, rtS2, rtM1, rtM2].forEach(r => r?.dispose());
    rtG = new THREE.WebGLRenderTarget(W, H, { ...opt, samples: 0 }); rtG.depthTexture = new THREE.DepthTexture(W, H);
    rtM1 = new THREE.WebGLRenderTarget(...q(3), opt); rtM2 = new THREE.WebGLRenderTarget(...q(3), opt);
    rtF1 = new THREE.WebGLRenderTarget(...q(3), opt); rtF2 = new THREE.WebGLRenderTarget(...q(3), opt);
    rtS1 = new THREE.WebGLRenderTarget(...q(4), opt); rtS2 = new THREE.WebGLRenderTarget(...q(4), opt);
  }
  function razmyt(a, b, raz) { for (let i = 0; i < raz; i++) { pB.u.uT.value = a.texture; pB.u.uD.value.set(1 / a.width, 0); renderer.setRenderTarget(b); renderer.render(pB.s, ortho); pB.u.uT.value = b.texture; pB.u.uD.value.set(0, 1 / a.height); renderer.setRenderTarget(a); renderer.render(pB.s, ortho); } }
  function razmyt2(a, b) { pB.u.uT.value = a.texture; pB.u.uD.value.set(0, 1 / a.height); renderer.setRenderTarget(b); renderer.render(pB.s, ortho); pB.u.uT.value = b.texture; pB.u.uD.value.set(1 / a.width, 0); renderer.setRenderTarget(a); renderer.render(pB.s, ortho); pB.u.uT.value = a.texture; pB.u.uD.value.set(0, 1 / a.height); renderer.setRenderTarget(b); renderer.render(pB.s, ortho); }
  const vodaC = new THREE.Color(voda[1]);
  function kadr({ svet = 0.55, a = 1, legko = false } = {}) {
    fokus.d = kamera.position.length();
    if (legko) { renderer.setRenderTarget(null); renderer.setClearColor(vodaC, 1); renderer.clear(); renderer.render(glavnaya, kamera); return; } // слабое железо: один проход без размытия и свечения
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(rtF1); renderer.clear(); renderer.render(fonovaya, kamera); razmyt(rtF1, rtF2, 1); // дальние спирали — в малый буфер и в размытие
    renderer.setRenderTarget(rtG); renderer.clear(); renderer.render(glavnaya, kamera);
    pY.u.uT.value = rtG.texture; renderer.setRenderTarget(rtS1); renderer.render(pY.s, ortho); razmyt(rtS1, rtS2, 2); // свечение ярких мест
    pB.u.uT.value = rtG.texture; pB.u.uD.value.set(0.5 / rtM1.width, 0); renderer.setRenderTarget(rtM2); renderer.render(pB.s, ortho); razmyt2(rtM2, rtM1); // размытая копия для глубины резкости
    pS.u.uFon.value = rtF1.texture; pS.u.uGl.value = rtG.texture; pS.u.uGlR.value = rtM1.texture; pS.u.uGlub.value = rtG.depthTexture; pS.u.uFok.value.set(kamera.near, kamera.far, fokus.d); pS.u.uSv.value = rtS1.texture; pS.u.uSvK.value = svet; pS.u.uA.value = a;
    renderer.setRenderTarget(null); renderer.render(pS.s, ortho);
  }
  // Слабое железо: загрузка сама снижает плотность точек, если кадр дольше 1/40 с (zagruzka.js)
  function snizit(d) { dpr = d; renderer.setPixelRatio(d); const c = renderer.domElement; razmer(c.clientWidth, c.clientHeight); }
  return { renderer, kamera, glavnaya, fonovaya, kadr, razmer, snizit, ogni, env, fokus };
}
export { ogni };

// Свет и окружение для отдельной сцены (полоска генома печёт кадры без своей «воды»)
export function osveshchenie(sc, renderer) {
  sc.environment = okruzhenie(renderer);
  sc.add(new THREE.HemisphereLight(0x9fd8ff, 0x1a0820, 0.9)); const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(3, 5, 6); sc.add(d);
  const p1 = new THREE.PointLight(0xff3fd0, 10, 4); p1.position.set(1.5, -1.2, 1.6); sc.add(p1);
}
export { THREE };
