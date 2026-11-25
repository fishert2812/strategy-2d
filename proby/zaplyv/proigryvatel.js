// Проигрыватель способности на любом существе: ключ из sposobnosti.json → заготовки кирпичей (sposobnost.js) на зонах тела этого существа.
// Свои кисти в своей сцене поверх тел; страница только зовёт: const pr = new Proigryvatel(W, H); в кадре pr.kadr(dt, [{ zapis, poza }], bodies) или pr.vMire(…); pr.render(gl).
// poza — в точках экрана: { x, y, a, tolshchina }. Нет у существа нужной зоны — способность садится на оболочку (она есть у любого тела).
import * as THREE from './three.module.min.js';
import { Kirpichi } from './kirpichi.js';
import { Lenta } from './lenta.js';
import { vidno, naSushchestvo } from './sposobnost.js';
class Dots { // мягкие точки — тот же слой, что в игре и на стенде навыков
  constructor(scene, max, add, hard = add ? 0.6 : 0.8) { const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    this.a = new Float32Array(max * 3); this.c = new Float32Array(max * 4); this.max = max; this.n = 0; this.g = g;
    g.setAttribute('pr', new THREE.InstancedBufferAttribute(this.a, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('col', new THREE.InstancedBufferAttribute(this.c, 4).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { hard: { value: hard } }, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute vec3 pr; attribute vec4 col; varying vec2 v; varying vec4 vc; void main(){ v = position.xy; vc = col; gl_Position = projectionMatrix * vec4(pr.xy + position.xy * pr.z, 0.0, 1.0); }',
      fragmentShader: 'uniform float hard; varying vec2 v; varying vec4 vc; void main(){ float d = length(v); if (d > 1.0) discard; float a = mix(1.0 - d, 1.0 - smoothstep(0.75, 1.0, d), hard); gl_FragColor = vec4(vc.rgb, vc.a * a * a); }' }));
    m.frustumCulled = false; m.renderOrder = add ? 3 : 4; scene.add(m); }
  put(x, y, r, cr, cg, cb, ca = 1) { if (this.n >= this.max) return; const i = this.n++; this.a.set([x, y, r], i * 3); this.c.set([cr, cg, cb, ca], i * 4); }
  done() { this.g.instanceCount = this.n; this.g.attributes.pr.needsUpdate = this.g.attributes.col.needsUpdate = true; this.n = 0; }
}
export class Proigryvatel {
  constructor(W, H, key, pauza = 0.8) { this.V = vidno(key); this.pauza = pauza; this.t = pauza; this.kp = new Kirpichi(); this.scene = new THREE.Scene(); this.cam = new THREE.OrthographicCamera(0, W, 0, H, -1, 1);
    this.glow = new Dots(this.scene, 6000, true); this.ink = new Dots(this.scene, 3000, false); this.soft = new Dots(this.scene, 600, true, 0); this.tube = new Lenta(6000, this.scene, 4);
    if (globalThis.document) { const d = document.createElement('div'), V = this.V; d.style.cssText = 'position:fixed;left:10px;right:10px;top:10px;font:15px -apple-system,system-ui,sans-serif;color:#dff;text-shadow:0 1px 3px #000;opacity:.9';
      d.textContent = V ? key + ' · ' + V.status + ' · ' + V.storony.map(q => (q.k || 'тело') + (q.est ? '' : ' (нет)')).join(', ') : 'нет способности ' + key; document.body.appendChild(d); } }
  // Способность идёт по кругу на каждом существе из celi ([{ zapis, poza }]): проиграла — пауза — снова. poza меняется на месте: существо плывёт, способность едет с ним.
  kadr(dt, celi, bodies) { const V = this.V; if (!V || !V.shagi.length) return; this.st ??= [];
    celi.forEach(({ zapis, poza }, i) => { const st = this.st[i] ??= { t: this.pauza + i * 0.37 };
      if (st.zapis !== zapis) { st.zapis = zapis; st.poza = null; }
      if (st.poza) Object.assign(st.poza, poza); else if ((st.t += dt) > this.pauza) { st.t = 0; st.poza = { ...poza }; this.kp.play(naSushchestvo(V, zapis, st.poza), { zapis, poza: st.poza, seed: 7 + i }); } });
    this.kp.step(dt); for (const st of this.st) if (st.poza && !this.kp.list.some(e => e.poza === st.poza)) st.poza = null;
    this.kp.draw({ scr: (x, y) => [x, y], z: 1, glow: this.glow, ink: this.ink, tube: this.tube, soft: this.soft, bodies });
    this.glow.done(); this.ink.done(); this.soft.done(); this.tube.done(); }
  // Живой мир (stend/mir.html): существо у середины экрана (или первое вида za), пока оно живо и видно.
  vMire(dt, M, oblik, x0, y0, z, W, H, bodies, za) { let s = M.sv.find(q => q.id === this.cel);
    const scr = q => [(q.x - x0) * z, (q.y - y0) * z], vidno = q => { const [x, y] = scr(q); return x > 0 && x < W && y > 0 && y < H; };
    if (!s || !vidno(s)) { let bd = 1e18; s = null; for (const q of M.sv) { if (za && q.vid !== za) continue; const [x, y] = scr(q), d = (x - W / 2) ** 2 + (y - H / 2) ** 2; if (d < bd) { bd = d; s = q; } } this.cel = s?.id; }
    if (!s) return; const ob = oblik(M, s), [x, y] = scr(s); this.kadr(dt, [{ zapis: ob.zapis, poza: { x, y, a: s.a, tolshchina: ob.tolshchina * z } }], bodies); }
  render(gl) { gl.render(this.scene, this.cam); }
}
