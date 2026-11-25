// Ленты: гладкая полоса по ломаной с толщиной в каждой точке — для нитей, тяжей и струй (урок L047: не цепочка точек).
// Поперёк ленты свет как у стеклянной трубки: прозрачный край, светлая сердцевина, блик со стороны света (сверху слева).
// Кисть: put(pts, ws, col, core, a) — точки и полуширины в экранных единицах, цвета [r, g, b]. Одна отрисовка на все ленты кадра.
import * as THREE from './three.module.min.js';
export class Lenta {
  constructor(max, scene, order = 4) {
    const g = new THREE.BufferGeometry(); this.max = max; this.n = 0; this.ni = 0; this.g = g;
    this.p = new Float32Array(max * 3); this.c = new Float32Array(max * 4); this.k = new Float32Array(max * 3); this.ix = new Uint32Array(max * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('col', new THREE.BufferAttribute(this.c, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('core', new THREE.BufferAttribute(this.k, 3).setUsage(THREE.DynamicDrawUsage)); g.setIndex(new THREE.BufferAttribute(this.ix, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'attribute vec4 col; attribute vec3 core; varying vec4 vc; varying vec3 vk; varying float s; void main(){ vc = col; vk = core; s = position.z; gl_Position = projectionMatrix * vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `varying vec4 vc; varying vec3 vk; varying float s; void main(){ float d = abs(s);
        float body = 1.0 - smoothstep(0.55, 1.0, d), mid = pow(1.0 - d, 2.0), hl = exp(-pow((s + 0.45) / 0.16, 2.0));
        gl_FragColor = vec4(mix(vc.rgb, vk, mid * 0.85) + hl * 0.45, vc.a * (0.35 + 0.65 * body) * (1.0 - smoothstep(0.85, 1.0, d))); }` }));
    m.frustumCulled = false; m.renderOrder = order; scene.add(m);
  }
  put(pts, ws, col, core, a = 1) {
    const N = pts.length; if (N < 2 || this.n + N * 2 > this.max) return;
    for (let i = 0; i < N; i++) { const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[Math.min(N - 1, i + 1)], l = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / l, ny = (x1 - x0) / l;
      for (const sd of [-1, 1]) { const v = this.n++; this.p.set([pts[i][0] + nx * ws[i] * sd, pts[i][1] + ny * ws[i] * sd, sd], v * 3); this.c.set([...col, a], v * 4); this.k.set(core, v * 3); } // z несёт сторону: -1 левый край, 1 правый
      if (i) { const v = this.n - 4; this.ix.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], this.ni); this.ni += 6; } }
  }
  done() { const g = this.g; g.setDrawRange(0, this.ni); for (const k of ['position', 'col', 'core']) g.attributes[k].needsUpdate = true; g.index.needsUpdate = true; this.n = this.ni = 0; }
}
