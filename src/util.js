export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sat = (x) => clamp(x, 0, 1);
export const smooth = (t) => { t = sat(t); return t * t * (3 - 2 * t); };
export const smoothstep = (a, b, x) => smooth((x - a) / (b - a));
export const easeOut = (t) => 1 - Math.pow(1 - sat(t), 3);
export const easeInOut = (t) => { t = sat(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOutBack = (t, s = 1.4) => { t = sat(t) - 1; return 1 + (s + 1) * t * t * t + s * t * t; };
export const TAU = Math.PI * 2;

// 프레임 속도와 상관없이 같은 느낌으로 따라가는 부드러운 추적
export const damp = (cur, target, rate, dt) => lerp(cur, target, 1 - Math.exp(-rate * dt));

// 씨앗으로 만드는 난수: 두 폰이 같은 씨앗이면 같은 결과가 나온다
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// 쫀득한 스프링 (값이 목표로 돌아가며 한두 번 출렁)
export class Spring {
  constructor(freq = 4, zeta = 0.5, x = 0) { this.f = freq; this.z = zeta; this.x = x; this.v = 0; this.target = x; }
  step(dt) {
    const w = TAU * this.f;
    // 반-암시적 적분: 큰 dt에서도 터지지 않는다
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -w * w * (this.x - this.target) - 2 * this.z * w * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }
  kick(v) { this.v += v; }
}

export function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = (i) => Math.round(lerp(A[i], B[i], t));
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}
export function rgba(hex, a) { const c = hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
