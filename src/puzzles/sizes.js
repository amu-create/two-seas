// 크기 바꾸기: 도구 단추를 누르면 내가 커지고, 그만큼 짝이 작아진다 (둘의 크기는 늘 반대).
// 큰 고양이: 높이 뛰고, 무거운 돌을 누르고, 무거운 상자를 민다. 작은 고양이: 낮은 굴을 지나고, 얇은 다리를 건넌다.
// → "나 작아져야 굴에 들어가!" "잠깐, 나 지금 얇은 다리 위야!" 하고 말해야 한다.
import { haptics } from '../game/haptics.js';

export const BIG = 1.35, SMALL = 0.62;

export class Sizes {
  constructor(cfg) { Object.assign(this, {}, cfg); this.cool = 0; this.shown = -2; }
  init() { return { big: -1, at: -9 }; }
  sizeOf(st, role) { return st.big < 0 ? 1 : st.big === role ? BIG : SMALL; }
  solids() {}
  headroom(g) { // 커질 자리가 있는가 (굴 속에서는 못 커진다)
    const me = g.me, hw = 0.39 * BIG, top = me.y + BIG;
    for (const s of g._solidBuf || []) { if (s.oneWay) continue; if (me.x + hw > s.x + 0.02 && me.x - hw < s.x + s.w - 0.02 && s.y < top - 0.02 && s.y + s.h > me.y + 0.3) return false; }
    return true;
  }
  update(g, dt) {
    const st = g.pz(this.id), me = g.me; this.cool = Math.max(0, this.cool - dt);
    me.size = this.sizeOf(st, g.role); g.other.size = this.sizeOf(st, 1 - g.role);
    if (st.big !== this.shown) { if (this.shown !== -2) { g.sound('swap', { x: me.x, vol: 0.5, rate: st.big === g.role ? 0.8 : 1.3 }); g.fx.ring(me.x, me.y + 0.6, '#ffffff', 1.2, 0.5); me.anim.sq.kick(st.big === g.role ? 3 : -3); haptics.buzz('open', true); } this.shown = st.big; }
    if (this.toggle) { // 크기 담당만 단추가 있다: 누를 때마다 "내가 큼 ↔ 짝이 큼"을 뒤바꾼다. 짝은 "나 크게 해 줘!" 하고 부탁해야 한다.
      const want = st.big === g.role ? 1 - g.role : g.role;
      if (g.tool === 'size' && g.inp && g.inp.toolPressed && this.cool <= 0 && me.state === 'play') {
        if (want === g.role && !this.headroom(g)) { g.sound('wrong', { x: me.x }); me.anim.sq.kick(-2); this.cool = 0.4; return; }
        this.cool = 0.9; g.act('size', { id: this.id, big: want });
      }
      // 짝이 나를 키웠는데 내 머리 위가 막혀 있으면(굴 속) 되돌린다
      if (st.big === g.role && this.shown === st.big && g.tc - st.at < 0.4 && !this.headroom(g) && !this.vetoed) { this.vetoed = true; g.act('size', { id: this.id, big: 1 - g.role, veto: 1 }); g.sound('wrong', { x: me.x }); }
      if (g.tc - st.at > 0.5) this.vetoed = false;
    } else if (g.tool === 'size' && g.inp && g.inp.toolPressed && this.cool <= 0 && me.state === 'play' && me.ground && st.big !== g.role) {
      if (!this.headroom(g)) { g.sound('wrong', { x: me.x }); me.anim.sq.kick(-2); this.cool = 0.4; return; }
      this.cool = 0.9; g.act('size', { id: this.id });
    }
  }
  host(g, st, from, type, d) {
    if (type !== 'size' || d.id !== this.id) return false;
    if (this.toggle) { const b = +d.big; if ((b !== 0 && b !== 1) || st.big === b || (!d.veto && g.tc - st.at < 0.7)) return false; st.big = b; st.at = g.tc; return true; }
    if (g.tc - st.at < 0.7 || st.big === from) return false;
    st.big = from; st.at = g.tc; return true;
  }
  onFx() {}
  peek(g) { return { big: g.pz(this.id).big }; }
  draw() {}
}
